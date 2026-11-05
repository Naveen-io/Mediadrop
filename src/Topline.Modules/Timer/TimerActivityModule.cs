using System.Diagnostics;
using System.Media;
using System.Windows.Threading;
using Topline.Core.Contracts;
using Topline.Core.Models;
using ActivityChangedEventArgs = Topline.Core.Contracts.ActivityChangedEventArgs;

namespace Topline.Modules.Timer;

public class TimerActivityModule : IActivityModule
{
    private readonly DispatcherTimer _ticker;
    private readonly Stopwatch _stopwatch = new();
    private TimeSpan _duration = TimeSpan.FromMinutes(25);
    private TimeSpan _timeRemaining;
    private ActivityStatus _status = ActivityStatus.Idle;
    private ActivityItem? _currentActivity;
    private readonly ISettingsService _settingsService;
    private readonly IActivityAggregator? _aggregator;

    public string Name => "Timer";
    public ActivityCategory Category => ActivityCategory.Timer;
    public bool IsEnabled
    {
        get => _settingsService.Settings.EnableTimerModule;
        set
        {
            _settingsService.Settings.EnableTimerModule = value;
            _settingsService.Save();
            if (!value)
            {
                Cancel();
            }
        }
    }

    public IReadOnlyList<ActivityItem> CurrentActivities =>
        _currentActivity != null && _status != ActivityStatus.Idle
            ? [_currentActivity]
            : [];

    public event EventHandler<ActivityChangedEventArgs>? ActivityChanged;

    public TimeSpan TimeRemaining => _timeRemaining;
    public TimeSpan Duration => _duration;
    public ActivityStatus Status => _status;

    public TimerActivityModule(ISettingsService settingsService, IActivityAggregator? aggregator = null)
    {
        _settingsService = settingsService;
        _aggregator = aggregator;

        _ticker = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(250)
        };
        _ticker.Tick += OnTick;
    }

    public Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    public void Start(TimeSpan duration)
    {
        if (!IsEnabled) return;

        _duration = duration;
        _timeRemaining = duration;
        _stopwatch.Restart();
        _status = ActivityStatus.Active;

        UpdateActivityItem();
        _ticker.Start();
    }

    public void Pause()
    {
        if (_status != ActivityStatus.Active) return;

        _stopwatch.Stop();
        _timeRemaining -= _stopwatch.Elapsed;
        if (_timeRemaining < TimeSpan.Zero) _timeRemaining = TimeSpan.Zero;
        _status = ActivityStatus.Paused;

        _ticker.Stop();
        UpdateActivityItem();
    }

    public void Resume()
    {
        if (_status != ActivityStatus.Paused) return;

        _stopwatch.Restart();
        _status = ActivityStatus.Active;
        UpdateActivityItem();
        _ticker.Start();
    }

    public void Cancel()
    {
        _ticker.Stop();
        _stopwatch.Stop();
        _status = ActivityStatus.Idle;
        var old = _currentActivity;
        _currentActivity = null;
        ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(old, isRemoved: true));
    }

    public void Dismiss()
    {
        Cancel();
    }

    private void OnTick(object? sender, EventArgs e)
    {
        if (_status != ActivityStatus.Active) return;

        var elapsed = _stopwatch.Elapsed;
        var remaining = _duration - elapsed;

        if (remaining <= TimeSpan.Zero)
        {
            _timeRemaining = TimeSpan.Zero;
            _status = ActivityStatus.Completed;
            _ticker.Stop();
            _stopwatch.Stop();

            // Notify completion sound
            try
            {
                SystemSounds.Asterisk.Play();
            }
            catch { }

            UpdateActivityItem();

            // Log to history
            _aggregator?.AddHistory(new ActivityHistoryItem(
                Guid.NewGuid().ToString(),
                ActivityCategory.Timer,
                $"Timer ({FormatDuration(_duration)})",
                "Completed",
                "\uE916",
                DateTimeOffset.Now));
        }
        else
        {
            _timeRemaining = remaining;
            UpdateActivityItem();
        }
    }

    private void UpdateActivityItem()
    {
        if (_status == ActivityStatus.Idle)
        {
            if (_currentActivity != null)
            {
                var removed = _currentActivity;
                _currentActivity = null;
                ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(removed, isRemoved: true));
            }
            return;
        }

        string timeText = FormatTime(_timeRemaining);
        double progress = _duration.TotalSeconds > 0
            ? Math.Clamp(1.0 - (_timeRemaining.TotalSeconds / _duration.TotalSeconds), 0.0, 1.0)
            : 0;

        string title;
        string subtitle;
        string? primaryLabel;
        string? primaryGlyph;
        string? secondaryLabel;
        string? secondaryGlyph;

        switch (_status)
        {
            case ActivityStatus.Active:
                title = $"Timer \u2022 {timeText}";
                subtitle = $"{FormatDuration(_duration)} countdown";
                primaryLabel = "Pause";
                primaryGlyph = "\uE769"; // Pause icon
                secondaryLabel = "Cancel";
                secondaryGlyph = "\uE711"; // Cancel icon
                break;

            case ActivityStatus.Paused:
                title = $"Timer Paused \u2022 {timeText}";
                subtitle = "Click to resume";
                primaryLabel = "Resume";
                primaryGlyph = "\uE768"; // Play icon
                secondaryLabel = "Cancel";
                secondaryGlyph = "\uE711";
                break;

            case ActivityStatus.Completed:
                title = "Timer Finished";
                subtitle = $"{FormatDuration(_duration)} elapsed";
                primaryLabel = "Restart";
                primaryGlyph = "\uE72C"; // Refresh icon
                secondaryLabel = "Dismiss";
                secondaryGlyph = "\uE711";
                progress = 1.0;
                break;

            default:
                return;
        }

        if (_currentActivity == null)
        {
            _currentActivity = new ActivityItem
            {
                Id = "topline-timer",
                Category = ActivityCategory.Timer,
                Title = title,
                Subtitle = subtitle,
                IconGlyph = "\uE916", // Stopwatch icon
                Status = _status,
                Progress = progress,
                PrimaryActionLabel = primaryLabel,
                PrimaryActionGlyph = primaryGlyph,
                SecondaryActionLabel = secondaryLabel,
                SecondaryActionGlyph = secondaryGlyph
            };
        }
        else
        {
            _currentActivity.Title = title;
            _currentActivity.Subtitle = subtitle;
            _currentActivity.Status = _status;
            _currentActivity.Progress = progress;
            _currentActivity.PrimaryActionLabel = primaryLabel;
            _currentActivity.PrimaryActionGlyph = primaryGlyph;
            _currentActivity.SecondaryActionLabel = secondaryLabel;
            _currentActivity.SecondaryActionGlyph = secondaryGlyph;
        }

        ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(_currentActivity));
    }

    private static string FormatTime(TimeSpan time)
    {
        return time.TotalHours >= 1 
            ? $"{(int)time.TotalHours}:{time.Minutes:D2}:{time.Seconds:D2}" 
            : $"{time.Minutes:D2}:{time.Seconds:D2}";
    }

    private static string FormatDuration(TimeSpan time)
    {
        if (time.TotalMinutes < 1) return $"{time.Seconds}s";
        if (time.TotalHours < 1) return $"{time.Minutes}m";
        return $"{(int)time.TotalHours}h {time.Minutes}m";
    }

    public Task ExecutePrimaryActionAsync(ActivityItem item)
    {
        if (_status == ActivityStatus.Active)
        {
            Pause();
        }
        else if (_status == ActivityStatus.Paused)
        {
            Resume();
        }
        else if (_status == ActivityStatus.Completed)
        {
            Start(_duration);
        }
        return Task.CompletedTask;
    }

    public Task ExecuteSecondaryActionAsync(ActivityItem item)
    {
        Cancel();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _ticker.Stop();
        _stopwatch.Stop();
    }
}
