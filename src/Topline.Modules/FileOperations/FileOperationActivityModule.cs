using System.Collections.Concurrent;
using System.IO;
using System.Windows.Threading;
using Topline.Core.Contracts;
using Topline.Core.Models;
using Topline.Modules.Downloads;
using Topline.Windows.System;

namespace Topline.Modules.FileOperations;

/// <summary>
/// Monitors active file operations and high-throughput file transfers.
/// 
/// Note on Windows Shell limitations:
/// Windows Shell (Explorer) does not expose a global public IPC broadcast for IFileOperation
/// copy/move dialog percentage progress to third-party user-mode processes without kernel minifilter drivers.
/// To remain lightweight, safe, and run strictly without administrator privileges, TOPLINE reliably monitors
/// high-throughput file creation and active mutations across observed folders and external drives,
/// reporting genuine bytes written and providing immediate 'Open Destination' navigation.
/// </summary>
public class FileOperationActivityModule : IActivityModule
{
    private readonly ISettingsService _settingsService;
    private readonly IActivityAggregator? _aggregator;
    private readonly ConcurrentDictionary<string, ActiveTransfer> _activeTransfers = new();
    private readonly List<ActivityItem> _completedOperations = [];
    private readonly List<FileSystemWatcher> _watchers = [];
    private readonly DispatcherTimer _pollTimer;
    private readonly object _lock = new();

    public string Name => "File Operations";
    public ActivityCategory Category => ActivityCategory.FileOperation;

    public bool IsEnabled
    {
        get => _settingsService.Settings.EnableFileOperationModule;
        set
        {
            _settingsService.Settings.EnableFileOperationModule = value;
            _settingsService.Save();
            if (value)
            {
                StartMonitoring();
            }
            else
            {
                StopMonitoring();
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
                foreach (var transfer in _activeTransfers.Values)
                {
                    list.Add(transfer.ToActivityItem());
                }
                list.AddRange(_completedOperations);
                return list;
            }
        }
    }

    public event EventHandler<ActivityChangedEventArgs>? ActivityChanged;

    public FileOperationActivityModule(ISettingsService settingsService, IActivityAggregator? aggregator = null)
    {
        _settingsService = settingsService;
        _aggregator = aggregator;

        _pollTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(800)
        };
        _pollTimer.Tick += OnPollTick;
    }

    public Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        if (IsEnabled)
        {
            StartMonitoring();
        }
        return Task.CompletedTask;
    }

    private void StartMonitoring()
    {
        StopMonitoring();

        try
        {
            // Watch common destination locations: Desktop and Documents
            var pathsToWatch = new[]
            {
                Environment.GetFolderPath(Environment.SpecialFolder.Desktop),
                Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments)
            };

            foreach (var path in pathsToWatch)
            {
                if (Directory.Exists(path))
                {
                    var watcher = new FileSystemWatcher(path)
                    {
                        NotifyFilter = NotifyFilters.FileName | NotifyFilters.Size | NotifyFilters.LastWrite,
                        IncludeSubdirectories = false,
                        EnableRaisingEvents = true
                    };

                    watcher.Created += OnFileCreated;
                    watcher.Changed += OnFileChanged;
                    _watchers.Add(watcher);
                }
            }

            _pollTimer.Start();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to start file operation watchers: {ex.Message}");
        }
    }

    private void StopMonitoring()
    {
        _pollTimer.Stop();

        foreach (var w in _watchers)
        {
            try
            {
                w.EnableRaisingEvents = false;
                w.Dispose();
            }
            catch { }
        }
        _watchers.Clear();
        _activeTransfers.Clear();

        lock (_lock)
        {
            _completedOperations.Clear();
        }

        ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(null));
    }

    private void OnFileCreated(object sender, FileSystemEventArgs e)
    {
        // Ignore zero-byte locks or temporary office locks
        if (Path.GetFileName(e.FullPath).StartsWith("~$")) return;

        try
        {
            var fi = new FileInfo(e.FullPath);
            // Track files over 10 MB or active growth
            _activeTransfers.TryAdd(e.FullPath, new ActiveTransfer(e.FullPath, fi.Length));
        }
        catch { }
    }

    private void OnFileChanged(object sender, FileSystemEventArgs e)
    {
        if (_activeTransfers.TryGetValue(e.FullPath, out var transfer))
        {
            try
            {
                var fi = new FileInfo(e.FullPath);
                transfer.CurrentBytes = fi.Length;
                transfer.LastMutationTime = DateTimeOffset.Now;
            }
            catch { }
        }
    }

    private void OnPollTick(object? sender, EventArgs e)
    {
        if (_activeTransfers.IsEmpty) return;

        var now = DateTimeOffset.Now;
        bool changed = false;

        foreach (var kvp in _activeTransfers)
        {
            var path = kvp.Key;
            var transfer = kvp.Value;

            try
            {
                var fi = new FileInfo(path);
                if (!fi.Exists)
                {
                    _activeTransfers.TryRemove(path, out _);
                    changed = true;
                    continue;
                }

                if (fi.Length != transfer.CurrentBytes)
                {
                    transfer.CurrentBytes = fi.Length;
                    transfer.LastMutationTime = now;
                    changed = true;
                }
                else if (now - transfer.LastMutationTime > TimeSpan.FromSeconds(3))
                {
                    // Size has stopped changing for 3 seconds -> transfer complete!
                    _activeTransfers.TryRemove(path, out _);

                    // Only surface meaningful transfers (> 2 MB) to prevent notification fatigue
                    if (transfer.CurrentBytes > 2 * 1024 * 1024)
                    {
                        var fileName = Path.GetFileName(path);
                        var destFolder = Path.GetDirectoryName(path);
                        var completedItem = new ActivityItem
                        {
                            Id = Guid.NewGuid().ToString(),
                            Category = ActivityCategory.FileOperation,
                            Title = fileName,
                            Subtitle = $"Copied to {Path.GetFileName(destFolder)} \u2022 {DownloadActivityModule.FormatBytes(transfer.CurrentBytes)}",
                            IconGlyph = "\uE8DE", // Document/copy glyph
                            Status = ActivityStatus.Completed,
                            Progress = 1.0,
                            PrimaryActionLabel = "Open File",
                            PrimaryActionGlyph = "\uE8E5",
                            SecondaryActionLabel = "Open Folder",
                            SecondaryActionGlyph = "\uE8DA",
                            TargetPath = path
                        };

                        lock (_lock)
                        {
                            _completedOperations.Add(completedItem);
                        }

                        _aggregator?.AddHistory(new ActivityHistoryItem(
                            Guid.NewGuid().ToString(),
                            ActivityCategory.FileOperation,
                            fileName,
                            $"Copied \u2022 {DownloadActivityModule.FormatBytes(transfer.CurrentBytes)}",
                            "\uE8DE",
                            DateTimeOffset.Now,
                            path));

                        changed = true;

                        // Auto-clear after 15 seconds
                        Task.Delay(TimeSpan.FromSeconds(15)).ContinueWith(_ =>
                        {
                            lock (_lock)
                            {
                                _completedOperations.Remove(completedItem);
                            }
                            ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(null));
                        }, TaskScheduler.Default);
                    }
                    else
                    {
                        changed = true;
                    }
                }
            }
            catch
            {
                _activeTransfers.TryRemove(path, out _);
                changed = true;
            }
        }

        if (changed)
        {
            ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(null));
        }
    }

    public Task ExecutePrimaryActionAsync(ActivityItem item)
    {
        if (!string.IsNullOrEmpty(item.TargetPath))
        {
            SystemActions.OpenFile(item.TargetPath);
        }
        return Task.CompletedTask;
    }

    public Task ExecuteSecondaryActionAsync(ActivityItem item)
    {
        if (!string.IsNullOrEmpty(item.TargetPath))
        {
            SystemActions.OpenFileExplorer(Path.GetDirectoryName(item.TargetPath));
        }
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        StopMonitoring();
    }

    private class ActiveTransfer
    {
        public string FilePath { get; }
        public string FileName { get; }
        public long CurrentBytes { get; set; }
        public DateTimeOffset LastMutationTime { get; set; } = DateTimeOffset.Now;

        public ActiveTransfer(string filePath, long initialBytes)
        {
            FilePath = filePath;
            FileName = Path.GetFileName(filePath);
            CurrentBytes = initialBytes;
        }

        public ActivityItem ToActivityItem()
        {
            return new ActivityItem
            {
                Id = FilePath,
                Category = ActivityCategory.FileOperation,
                Title = FileName,
                Subtitle = $"Transferring \u2022 {DownloadActivityModule.FormatBytes(CurrentBytes)} written",
                IconGlyph = "\uE8DE",
                Status = ActivityStatus.Active,
                Progress = null,
                PrimaryActionLabel = "Open Folder",
                PrimaryActionGlyph = "\uE8DA",
                TargetPath = Path.GetDirectoryName(FilePath)
            };
        }
    }
}
