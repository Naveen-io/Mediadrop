namespace Topline.Core.Models;

public enum AppThemeMode
{
    System,
    Dark,
    Light
}

public enum UiDensity
{
    Standard,
    Compact
}

public class AppSettings
{
    // General
    public bool StartWithWindows { get; set; } = false;
    public bool AutoHide { get; set; } = false;
    public bool ReserveDesktopSpace { get; set; } = true;
    public string? SelectedMonitorDeviceName { get; set; }
    public int BarHeight { get; set; } = 36;
    public bool IgnoreInFullscreen { get; set; } = true;

    // Appearance
    public AppThemeMode ThemeMode { get; set; } = AppThemeMode.Dark;
    public double Opacity { get; set; } = 0.96;
    public UiDensity Density { get; set; } = UiDensity.Standard;
    public bool Use24HourClock { get; set; } = true;

    // Modules
    public bool EnableMediaModule { get; set; } = true;
    public bool EnableDownloadModule { get; set; } = true;
    public bool EnableFileOperationModule { get; set; } = true;
    public bool EnableTimerModule { get; set; } = true;
    public bool EnableUsbModule { get; set; } = true;
    public string? CustomDownloadsPath { get; set; }

    // Privacy & History
    public bool KeepActivityHistory { get; set; } = true;
    public int MaxHistoryItems { get; set; } = 50;

    public AppSettings Clone()
    {
        return (AppSettings)MemberwiseClone();
    }
}
