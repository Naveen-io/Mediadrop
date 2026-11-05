using Windows.Media.Control;
using Topline.Core.Contracts;
using Topline.Core.Models;

namespace Topline.Modules.Media;

public class MediaActivityModule : IActivityModule
{
    private GlobalSystemMediaTransportControlsSessionManager? _sessionManager;
    private GlobalSystemMediaTransportControlsSession? _currentSession;
    private ActivityItem? _currentActivity;
    private readonly ISettingsService _settingsService;
    private readonly object _lock = new();

    public string Name => "Media";
    public ActivityCategory Category => ActivityCategory.Media;

    public bool IsEnabled
    {
        get => _settingsService.Settings.EnableMediaModule;
        set
        {
            _settingsService.Settings.EnableMediaModule = value;
            _settingsService.Save();
            if (!value)
            {
                ClearActivity();
            }
            else
            {
                _ = RefreshCurrentSessionAsync();
            }
        }
    }

    public IReadOnlyList<ActivityItem> CurrentActivities
    {
        get
        {
            lock (_lock)
            {
                return _currentActivity != null ? [_currentActivity] : [];
            }
        }
    }

    public event EventHandler<ActivityChangedEventArgs>? ActivityChanged;

    public MediaActivityModule(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _sessionManager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
            if (_sessionManager != null)
            {
                _sessionManager.CurrentSessionChanged += OnCurrentSessionChanged;
                await RefreshCurrentSessionAsync();
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to initialize GSMTC media manager: {ex.Message}");
        }
    }

    private async void OnCurrentSessionChanged(GlobalSystemMediaTransportControlsSessionManager sender, CurrentSessionChangedEventArgs args)
    {
        await RefreshCurrentSessionAsync();
    }

    private async Task RefreshCurrentSessionAsync()
    {
        if (!IsEnabled || _sessionManager == null)
        {
            ClearActivity();
            return;
        }

        try
        {
            var session = _sessionManager.GetCurrentSession();

            lock (_lock)
            {
                if (_currentSession != null)
                {
                    _currentSession.MediaPropertiesChanged -= OnMediaPropertiesChanged;
                    _currentSession.PlaybackInfoChanged -= OnPlaybackInfoChanged;
                }

                _currentSession = session;

                if (_currentSession != null)
                {
                    _currentSession.MediaPropertiesChanged += OnMediaPropertiesChanged;
                    _currentSession.PlaybackInfoChanged += OnPlaybackInfoChanged;
                }
            }

            if (_currentSession != null)
            {
                await UpdateFromSessionAsync(_currentSession);
            }
            else
            {
                ClearActivity();
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error refreshing media session: {ex.Message}");
            ClearActivity();
        }
    }

    private async void OnMediaPropertiesChanged(GlobalSystemMediaTransportControlsSession sender, MediaPropertiesChangedEventArgs args)
    {
        await UpdateFromSessionAsync(sender);
    }

    private async void OnPlaybackInfoChanged(GlobalSystemMediaTransportControlsSession sender, PlaybackInfoChangedEventArgs args)
    {
        await UpdateFromSessionAsync(sender);
    }

    private async Task UpdateFromSessionAsync(GlobalSystemMediaTransportControlsSession session)
    {
        try
        {
            var playbackInfo = session.GetPlaybackInfo();
            if (playbackInfo == null)
            {
                ClearActivity();
                return;
            }

            var playbackStatus = playbackInfo.PlaybackStatus;
            // Only display when playing or paused
            if (playbackStatus != GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing &&
                playbackStatus != GlobalSystemMediaTransportControlsSessionPlaybackStatus.Paused)
            {
                ClearActivity();
                return;
            }

            var mediaProperties = await session.TryGetMediaPropertiesAsync();
            if (mediaProperties == null || string.IsNullOrWhiteSpace(mediaProperties.Title))
            {
                ClearActivity();
                return;
            }

            bool isPlaying = playbackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing;
            string title = mediaProperties.Title;
            string subtitle = string.IsNullOrWhiteSpace(mediaProperties.Artist)
                ? (isPlaying ? "Playing" : "Paused")
                : mediaProperties.Artist;

            lock (_lock)
            {
                if (_currentActivity == null)
                {
                    _currentActivity = new ActivityItem
                    {
                        Id = "topline-media",
                        Category = ActivityCategory.Media,
                        Title = title,
                        Subtitle = subtitle,
                        IconGlyph = isPlaying ? "\uE768" : "\uE769", // Play / Pause
                        Status = isPlaying ? ActivityStatus.Active : ActivityStatus.Paused,
                        PrimaryActionLabel = isPlaying ? "Pause" : "Play",
                        PrimaryActionGlyph = isPlaying ? "\uE769" : "\uE768",
                        SecondaryActionLabel = "Next",
                        SecondaryActionGlyph = "\uE76B", // Next
                        Tag = session
                    };
                }
                else
                {
                    _currentActivity.Title = title;
                    _currentActivity.Subtitle = subtitle;
                    _currentActivity.IconGlyph = isPlaying ? "\uE768" : "\uE769";
                    _currentActivity.Status = isPlaying ? ActivityStatus.Active : ActivityStatus.Paused;
                    _currentActivity.PrimaryActionLabel = isPlaying ? "Pause" : "Play";
                    _currentActivity.PrimaryActionGlyph = isPlaying ? "\uE769" : "\uE768";
                    _currentActivity.SecondaryActionLabel = "Next";
                    _currentActivity.SecondaryActionGlyph = "\uE76B";
                    _currentActivity.Tag = session;
                }
            }

            ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(_currentActivity));
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error reading media properties: {ex.Message}");
            ClearActivity();
        }
    }

    private void ClearActivity()
    {
        ActivityItem? removed;
        lock (_lock)
        {
            removed = _currentActivity;
            _currentActivity = null;
        }

        if (removed != null)
        {
            ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(removed, isRemoved: true));
        }
    }

    public async Task ExecutePrimaryActionAsync(ActivityItem item)
    {
        try
        {
            if (_currentSession != null)
            {
                var playback = _currentSession.GetPlaybackInfo();
                if (playback != null && playback.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
                {
                    await _currentSession.TryPauseAsync();
                }
                else if (_currentSession != null)
                {
                    await _currentSession.TryPlayAsync();
                }
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to toggle media playback: {ex.Message}");
        }
    }

    public async Task ExecuteSecondaryActionAsync(ActivityItem item)
    {
        try
        {
            if (_currentSession != null)
            {
                await _currentSession.TrySkipNextAsync();
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to skip media: {ex.Message}");
        }
    }

    public void Dispose()
    {
        if (_sessionManager != null)
        {
            _sessionManager.CurrentSessionChanged -= OnCurrentSessionChanged;
        }

        if (_currentSession != null)
        {
            _currentSession.MediaPropertiesChanged -= OnMediaPropertiesChanged;
            _currentSession.PlaybackInfoChanged -= OnPlaybackInfoChanged;
        }

        _sessionManager = null;
        _currentSession = null;
    }
}
