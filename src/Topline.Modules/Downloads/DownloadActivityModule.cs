using System.Collections.Concurrent;
using System.IO;
using System.Windows.Threading;
using Topline.Core.Contracts;
using Topline.Core.Models;
using Topline.Windows.System;

namespace Topline.Modules.Downloads;

public class DownloadActivityModule : IActivityModule
{
    private static readonly HashSet<string> DownloadExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".crdownload",
        ".part",
        ".opdownload",
        ".download"
    };

    private readonly ISettingsService _settingsService;
    private readonly IActivityAggregator? _aggregator;
    private FileSystemWatcher? _watcher;
    private readonly ConcurrentDictionary<string, DownloadTrackInfo> _activeDownloads = new();
    private readonly List<ActivityItem> _completedItems = [];
    private readonly DispatcherTimer _pollTimer;
    private readonly object _lock = new();

    public string Name => "Downloads";
    public ActivityCategory Category => ActivityCategory.Download;

    public bool IsEnabled
    {
        get => _settingsService.Settings.EnableDownloadModule;
        set
        {
            _settingsService.Settings.EnableDownloadModule = value;
            _settingsService.Save();
            if (value)
            {
                StartWatcher();
            }
            else
            {
                StopWatcher();
            }
        }
    }

    public IReadOnlyList<ActivityItem> CurrentActivities
    {
        get
        {
            lock (_lock)
            {
                var list = new List<ActivityItem>();

                // Active in-progress downloads
                foreach (var kvp in _activeDownloads)
                {
                    list.Add(kvp.Value.ToActivityItem());
                }

                // Recently completed downloads
                list.AddRange(_completedItems);

                return list;
            }
        }
    }

    public event EventHandler<ActivityChangedEventArgs>? ActivityChanged;

    public DownloadActivityModule(ISettingsService settingsService, IActivityAggregator? aggregator = null)
    {
        _settingsService = settingsService;
        _aggregator = aggregator;

        _pollTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(1)
        };
        _pollTimer.Tick += OnPollTick;
    }

    public Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        if (IsEnabled)
        {
            StartWatcher();
        }
        return Task.CompletedTask;
    }

    private void StartWatcher()
    {
        StopWatcher();

        try
        {
            var folder = GetTargetDownloadsFolder();
            if (!Directory.Exists(folder))
            {
                return;
            }

            _watcher = new FileSystemWatcher(folder)
            {
                NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite | NotifyFilters.Size,
                IncludeSubdirectories = false,
                EnableRaisingEvents = true
            };

            _watcher.Created += OnFileCreated;
            _watcher.Changed += OnFileChanged;
            _watcher.Renamed += OnFileRenamed;
            _watcher.Deleted += OnFileDeleted;

            // Initial scan for currently active partial download files
            ScanExistingDownloads(folder);

            _pollTimer.Start();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to start downloads watcher: {ex.Message}");
        }
    }

    private void StopWatcher()
    {
        _pollTimer.Stop();

        if (_watcher != null)
        {
            _watcher.EnableRaisingEvents = false;
            _watcher.Created -= OnFileCreated;
            _watcher.Changed -= OnFileChanged;
            _watcher.Renamed -= OnFileRenamed;
            _watcher.Deleted -= OnFileDeleted;
            _watcher.Dispose();
            _watcher = null;
        }

        _activeDownloads.Clear();
        lock (_lock)
        {
            _completedItems.Clear();
        }
        ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(null));
    }

    private string GetTargetDownloadsFolder()
    {
        var custom = _settingsService.Settings.CustomDownloadsPath;
        if (!string.IsNullOrWhiteSpace(custom) && Directory.Exists(custom))
        {
            return custom;
        }

        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
    }

    private void ScanExistingDownloads(string folder)
    {
        try
        {
            var dir = new DirectoryInfo(folder);
            foreach (var file in dir.GetFiles())
            {
                if (DownloadExtensions.Contains(file.Extension))
                {
                    _activeDownloads.TryAdd(file.FullName, new DownloadTrackInfo(file.FullName, file.Length));
                }
            }
        }
        catch { }
    }

    private void OnFileCreated(object sender, FileSystemEventArgs e)
    {
        var ext = Path.GetExtension(e.FullPath);
        if (DownloadExtensions.Contains(ext))
        {
            long length = 0;
            try { length = new FileInfo(e.FullPath).Length; } catch { }
            _activeDownloads.TryAdd(e.FullPath, new DownloadTrackInfo(e.FullPath, length));
            NotifyUpdated();
        }
    }

    private void OnFileChanged(object sender, FileSystemEventArgs e)
    {
        var ext = Path.GetExtension(e.FullPath);
        if (DownloadExtensions.Contains(ext))
        {
            if (_activeDownloads.TryGetValue(e.FullPath, out var track))
            {
                try
                {
                    track.CurrentBytes = new FileInfo(e.FullPath).Length;
                }
                catch { }
            }
        }
    }

    private void OnFileRenamed(object sender, RenamedEventArgs e)
    {
        var oldExt = Path.GetExtension(e.OldFullPath);
        var newExt = Path.GetExtension(e.FullPath);

        // Download completion case: .crdownload / .part renamed to final target extension!
        if (DownloadExtensions.Contains(oldExt) && !DownloadExtensions.Contains(newExt))
        {
            _activeDownloads.TryRemove(e.OldFullPath, out _);

            long finalSize = 0;
            try { finalSize = new FileInfo(e.FullPath).Length; } catch { }

            var fileName = Path.GetFileName(e.FullPath);
            var completedItem = new ActivityItem
            {
                Id = Guid.NewGuid().ToString(),
                Category = ActivityCategory.Download,
                Title = fileName,
                Subtitle = $"Download complete \u2022 {FormatBytes(finalSize)}",
                IconGlyph = "\uE896", // Download complete icon
                Status = ActivityStatus.Completed,
                Progress = 1.0,
                PrimaryActionLabel = "Open File",
                PrimaryActionGlyph = "\uE8E5",
                SecondaryActionLabel = "Open Folder",
                SecondaryActionGlyph = "\uE8DA",
                TargetPath = e.FullPath
            };

            lock (_lock)
            {
                _completedItems.Add(completedItem);
            }

            // Log to history
            _aggregator?.AddHistory(new ActivityHistoryItem(
                Guid.NewGuid().ToString(),
                ActivityCategory.Download,
                fileName,
                $"Downloaded to {Path.GetFileName(Path.GetDirectoryName(e.FullPath))}",
                "\uE896",
                DateTimeOffset.Now,
                e.FullPath));

            NotifyUpdated(completedItem);

            // Auto-clear completed item after 20 seconds
            Task.Delay(TimeSpan.FromSeconds(20)).ContinueWith(_ =>
            {
                lock (_lock)
                {
                    _completedItems.Remove(completedItem);
                }
                NotifyUpdated();
            }, TaskScheduler.Default);
        }
        else if (DownloadExtensions.Contains(newExt))
        {
            _activeDownloads.TryAdd(e.FullPath, new DownloadTrackInfo(e.FullPath, 0));
            NotifyUpdated();
        }
    }

    private void OnFileDeleted(object sender, FileSystemEventArgs e)
    {
        if (_activeDownloads.TryRemove(e.FullPath, out _))
        {
            NotifyUpdated();
        }
    }

    private void OnPollTick(object? sender, EventArgs e)
    {
        if (_activeDownloads.IsEmpty) return;

        bool changed = false;
        foreach (var kvp in _activeDownloads)
        {
            try
            {
                var fi = new FileInfo(kvp.Key);
                if (fi.Exists)
                {
                    if (kvp.Value.CurrentBytes != fi.Length)
                    {
                        kvp.Value.CurrentBytes = fi.Length;
                        changed = true;
                    }
                }
                else
                {
                    _activeDownloads.TryRemove(kvp.Key, out _);
                    changed = true;
                }
            }
            catch { }
        }

        if (changed)
        {
            NotifyUpdated();
        }
    }

    private void NotifyUpdated(ActivityItem? item = null)
    {
        ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(item));
    }

    public Task ExecutePrimaryActionAsync(ActivityItem item)
    {
        if (item.Status == ActivityStatus.Completed && !string.IsNullOrEmpty(item.TargetPath))
        {
            SystemActions.OpenFile(item.TargetPath);
        }
        else if (!string.IsNullOrEmpty(item.TargetPath))
        {
            SystemActions.OpenFileExplorer(Path.GetDirectoryName(item.TargetPath));
        }
        else
        {
            SystemActions.OpenDownloadsFolder(_settingsService.Settings.CustomDownloadsPath);
        }
        return Task.CompletedTask;
    }

    public Task ExecuteSecondaryActionAsync(ActivityItem item)
    {
        if (!string.IsNullOrEmpty(item.TargetPath))
        {
            SystemActions.OpenFileExplorer(item.TargetPath);
        }
        else
        {
            SystemActions.OpenDownloadsFolder(_settingsService.Settings.CustomDownloadsPath);
        }
        return Task.CompletedTask;
    }

    public static string FormatBytes(long bytes)
    {
        string[] suffixes = ["B", "KB", "MB", "GB", "TB"];
        int counter = 0;
        decimal number = bytes;
        while (Math.Round(number / 1024) >= 1)
        {
            number /= 1024;
            counter++;
        }
        return $"{number:n1} {suffixes[counter]}";
    }

    public void Dispose()
    {
        StopWatcher();
    }

    private class DownloadTrackInfo
    {
        public string FilePath { get; }
        public string CleanFileName { get; }
        public long CurrentBytes { get; set; }

        public DownloadTrackInfo(string filePath, long initialBytes)
        {
            FilePath = filePath;
            CurrentBytes = initialBytes;

            var rawName = Path.GetFileName(filePath);
            // Clean extension (.crdownload, .part, etc.) to get original intended file name
            var ext = Path.GetExtension(rawName);
            CleanFileName = DownloadExtensions.Contains(ext) ? Path.GetFileNameWithoutExtension(rawName) : rawName;
        }

        public ActivityItem ToActivityItem()
        {
            return new ActivityItem
            {
                Id = FilePath,
                Category = ActivityCategory.Download,
                Title = CleanFileName,
                Subtitle = $"Downloading \u2022 {FormatBytes(CurrentBytes)} written",
                IconGlyph = "\uE896", // Download glyph
                Status = ActivityStatus.Active,
                Progress = null, // Honest: progress indeterminate since final total file size is not provided by file system until finish
                PrimaryActionLabel = "Open Folder",
                PrimaryActionGlyph = "\uE8DA",
                TargetPath = FilePath
            };
        }
    }
}
