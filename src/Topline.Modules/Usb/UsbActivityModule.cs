using Topline.Core.Contracts;
using Topline.Core.Models;
using Topline.Windows.Devices;
using Topline.Windows.System;

namespace Topline.Modules.Usb;

public class UsbActivityModule : IActivityModule
{
    private readonly ISettingsService _settingsService;
    private readonly UsbDeviceNotifier _deviceNotifier;
    private readonly IActivityAggregator? _aggregator;
    private readonly Dictionary<string, ActivityItem> _drives = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _lock = new();

    public string Name => "USB Devices";
    public ActivityCategory Category => ActivityCategory.UsbDevice;

    public bool IsEnabled
    {
        get => _settingsService.Settings.EnableUsbModule;
        set
        {
            _settingsService.Settings.EnableUsbModule = value;
            _settingsService.Save();
            if (!value)
            {
                lock (_lock)
                {
                    _drives.Clear();
                }
                ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(null));
            }
            else
            {
                RefreshDrives();
            }
        }
    }

    public IReadOnlyList<ActivityItem> CurrentActivities
    {
        get
        {
            lock (_lock)
            {
                return _drives.Values.ToList();
            }
        }
    }

    public event EventHandler<ActivityChangedEventArgs>? ActivityChanged;

    public UsbActivityModule(
        ISettingsService settingsService,
        UsbDeviceNotifier deviceNotifier,
        IActivityAggregator? aggregator = null)
    {
        _settingsService = settingsService;
        _deviceNotifier = deviceNotifier;
        _aggregator = aggregator;

        _deviceNotifier.DeviceConnected += OnDeviceConnected;
        _deviceNotifier.DeviceRemoved += OnDeviceRemoved;
    }

    public Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        if (IsEnabled)
        {
            RefreshDrives();
        }
        return Task.CompletedTask;
    }

    private void RefreshDrives()
    {
        var existing = _deviceNotifier.GetCurrentlyConnectedRemovableDrives();
        lock (_lock)
        {
            _drives.Clear();
            foreach (var d in existing)
            {
                var item = CreateActivityItem(d);
                _drives[d.DriveLetter] = item;
            }
        }
        ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(null));
    }

    private void OnDeviceConnected(object? sender, UsbDriveInfo drive)
    {
        if (!IsEnabled) return;

        var item = CreateActivityItem(drive);
        lock (_lock)
        {
            _drives[drive.DriveLetter] = item;
        }

        _aggregator?.AddHistory(new ActivityHistoryItem(
            Guid.NewGuid().ToString(),
            ActivityCategory.UsbDevice,
            drive.DisplayName,
            $"Connected \u2022 {drive.FormattedFreeSize} free of {drive.FormattedTotalSize}",
            "\uE88E",
            DateTimeOffset.Now,
            drive.DriveLetter));

        ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(item));
    }

    private void OnDeviceRemoved(object? sender, string driveLetter)
    {
        ActivityItem? removed;
        lock (_lock)
        {
            _drives.Remove(driveLetter, out removed);
        }

        if (removed != null)
        {
            ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(removed, isRemoved: true));
        }
    }

    private static ActivityItem CreateActivityItem(UsbDriveInfo drive)
    {
        return new ActivityItem
        {
            Id = $"usb-{drive.DriveLetter}",
            Category = ActivityCategory.UsbDevice,
            Title = drive.DisplayName,
            Subtitle = $"USB Storage \u2022 {drive.FormattedFreeSize} free of {drive.FormattedTotalSize}",
            IconGlyph = "\uE88E", // USB drive glyph
            Status = ActivityStatus.Active,
            PrimaryActionLabel = "Open in Explorer",
            PrimaryActionGlyph = "\uE8DA",
            SecondaryActionLabel = "Safely Eject",
            SecondaryActionGlyph = "\uF10B", // Eject icon
            TargetPath = drive.DriveLetter,
            Tag = drive
        };
    }

    public Task ExecutePrimaryActionAsync(ActivityItem item)
    {
        if (!string.IsNullOrEmpty(item.TargetPath))
        {
            SystemActions.OpenFileExplorer(item.TargetPath);
        }
        return Task.CompletedTask;
    }

    public async Task ExecuteSecondaryActionAsync(ActivityItem item)
    {
        if (string.IsNullOrEmpty(item.TargetPath)) return;

        var driveLetter = item.TargetPath;
        item.Subtitle = "Safely ejecting...";
        item.CanExecuteSecondaryAction = false;
        ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(item));

        var result = await SafeEjector.EjectDriveAsync(driveLetter);

        if (result.Success)
        {
            item.Status = ActivityStatus.Completed;
            item.Subtitle = "Safely ejected \u2022 Safe to unplug";
            item.PrimaryActionLabel = null;
            item.SecondaryActionLabel = null;
            ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(item));

            _aggregator?.AddHistory(new ActivityHistoryItem(
                Guid.NewGuid().ToString(),
                ActivityCategory.UsbDevice,
                item.Title,
                "Safely ejected",
                "\uF10B",
                DateTimeOffset.Now));

            // Remove from active list after 5 seconds
            await Task.Delay(5000);
            lock (_lock)
            {
                _drives.Remove(driveLetter);
            }
            ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(item, isRemoved: true));
        }
        else
        {
            item.Status = ActivityStatus.Failed;
            item.Subtitle = result.Message;
            item.CanExecuteSecondaryAction = true;
            ActivityChanged?.Invoke(this, new ActivityChangedEventArgs(item));
        }
    }

    public void Dispose()
    {
        _deviceNotifier.DeviceConnected -= OnDeviceConnected;
        _deviceNotifier.DeviceRemoved -= OnDeviceRemoved;
    }
}
