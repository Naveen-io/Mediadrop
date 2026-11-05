using Topline.Core.Contracts;
using Topline.Core.Models;
using Topline.Core.Services;
using Topline.Modules.Downloads;
using Topline.Modules.Timer;
using Xunit;

namespace Topline.Tests;

public class CoreTests
{
    [Fact]
    public void AppSettings_Defaults_AreValid()
    {
        var settings = new AppSettings();

        Assert.Equal(36, settings.BarHeight);
        Assert.True(settings.ReserveDesktopSpace);
        Assert.False(settings.AutoHide);
        Assert.True(settings.EnableMediaModule);
        Assert.True(settings.EnableDownloadModule);
        Assert.True(settings.EnableTimerModule);
        Assert.True(settings.EnableUsbModule);
        Assert.Equal(AppThemeMode.Dark, settings.ThemeMode);
    }

    [Fact]
    public void SettingsService_SavesAndLoads()
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"topline_test_{Guid.NewGuid()}.json");
        try
        {
            var service = new SettingsService(tempFile);
            service.Settings.BarHeight = 40;
            service.Settings.ThemeMode = AppThemeMode.Light;
            service.Save();

            var loadedService = new SettingsService(tempFile);
            Assert.Equal(40, loadedService.Settings.BarHeight);
            Assert.Equal(AppThemeMode.Light, loadedService.Settings.ThemeMode);
        }
        finally
        {
            if (File.Exists(tempFile)) File.Delete(tempFile);
        }
    }

    [Fact]
    public void HistoryService_CapsMaximumItems()
    {
        var tempFile = Path.Combine(Path.GetTempPath(), $"topline_hist_{Guid.NewGuid()}.json");
        try
        {
            var settingsService = new SettingsService();
            settingsService.Settings.MaxHistoryItems = 5;
            var historyService = new HistoryService(settingsService, tempFile);

            for (int i = 0; i < 10; i++)
            {
                historyService.Add(new ActivityHistoryItem(
                    Guid.NewGuid().ToString(),
                    ActivityCategory.Timer,
                    $"Item {i}",
                    null,
                    null,
                    DateTimeOffset.Now));
            }

            var history = historyService.GetHistory();
            Assert.Equal(5, history.Count);
            Assert.Equal("Item 9", history[0].Title);
        }
        finally
        {
            if (File.Exists(tempFile)) File.Delete(tempFile);
        }
    }

    [Fact]
    public void ActivityAggregator_PrioritizesTimerOverMedia()
    {
        var settingsService = new SettingsService();
        var historyService = new HistoryService(settingsService);
        var aggregator = new ActivityAggregator(historyService);

        var timerModule = new MockActivityModule(ActivityCategory.Timer, "Timer");
        var mediaModule = new MockActivityModule(ActivityCategory.Media, "Media");

        aggregator.RegisterModule(mediaModule);
        aggregator.RegisterModule(timerModule);

        mediaModule.SetActivity(new ActivityItem
        {
            Id = "media-1",
            Category = ActivityCategory.Media,
            Title = "Song Title",
            Status = ActivityStatus.Active
        });

        Assert.NotNull(aggregator.ActiveActivity);
        Assert.Equal(ActivityCategory.Media, aggregator.ActiveActivity.Category);

        // When a timer becomes active, it takes priority over media
        timerModule.SetActivity(new ActivityItem
        {
            Id = "timer-1",
            Category = ActivityCategory.Timer,
            Title = "25:00",
            Status = ActivityStatus.Active
        });

        Assert.NotNull(aggregator.ActiveActivity);
        Assert.Equal(ActivityCategory.Timer, aggregator.ActiveActivity.Category);
    }

    [Fact]
    public void DownloadModule_FormatBytes_FormatsCorrectly()
    {
        Assert.Equal("500.0 B", DownloadActivityModule.FormatBytes(500));
        Assert.Equal("1.5 KB", DownloadActivityModule.FormatBytes(1536));
        Assert.Equal("20.0 MB", DownloadActivityModule.FormatBytes(20 * 1024 * 1024));
        Assert.Equal("4.2 GB", DownloadActivityModule.FormatBytes((long)(4.2 * 1024 * 1024 * 1024)));
    }

    private class MockActivityModule : IActivityModule
    {
        private ActivityItem? _item;

        public string Name { get; }
        public ActivityCategory Category { get; }
        public bool IsEnabled { get; set; } = true;
        public IReadOnlyList<ActivityItem> CurrentActivities => _item != null ? [_item] : [];

        public event EventHandler<ActivityChangedEventArgs>? ActivityChanged;

        public MockActivityModule(ActivityCategory category, string name)
        {
            Category = category;
            Name = name;
        }

        public void SetActivity(ActivityItem? item)
        {
            _item = item;
            ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(item));
        }

        public Task InitializeAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task ExecutePrimaryActionAsync(ActivityItem item) => Task.CompletedTask;
        public Task ExecuteSecondaryActionAsync(ActivityItem item) => Task.CompletedTask;
        public void Dispose() { }
    }
}
