using Topline.Core.Contracts;
using Topline.Core.Models;
using Topline.Core.Services;
using Topline.Modules.Timer;
using Xunit;

namespace Topline.Tests;

public class TimerTests
{
    [Fact]
    public void Timer_StartsAndTransitionsState()
    {
        var settingsService = new SettingsService();
        var historyService = new HistoryService(settingsService);
        var aggregator = new ActivityAggregator(historyService);
        var timerModule = new TimerActivityModule(settingsService, aggregator);

        Assert.Equal(ActivityStatus.Idle, timerModule.Status);
        Assert.Empty(timerModule.CurrentActivities);

        // Start 15m timer
        timerModule.Start(TimeSpan.FromMinutes(15));

        Assert.Equal(ActivityStatus.Active, timerModule.Status);
        Assert.Single(timerModule.CurrentActivities);

        var item = timerModule.CurrentActivities[0];
        Assert.Contains("Timer", item.Title);
        Assert.Equal("Pause", item.PrimaryActionLabel);
        Assert.Equal("Cancel", item.SecondaryActionLabel);

        // Pause
        timerModule.Pause();
        Assert.Equal(ActivityStatus.Paused, timerModule.Status);
        Assert.Equal("Resume", timerModule.CurrentActivities[0].PrimaryActionLabel);

        // Resume
        timerModule.Resume();
        Assert.Equal(ActivityStatus.Active, timerModule.Status);
        Assert.Equal("Pause", timerModule.CurrentActivities[0].PrimaryActionLabel);

        // Cancel
        timerModule.Cancel();
        Assert.Equal(ActivityStatus.Idle, timerModule.Status);
        Assert.Empty(timerModule.CurrentActivities);
    }
}
