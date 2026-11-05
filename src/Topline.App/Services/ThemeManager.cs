using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Win32;
using Topline.Core.Contracts;
using Topline.Core.Models;
using Topline.Windows.Native;

namespace Topline.App.Services;

public class ThemeManager
{
    private readonly ISettingsService _settingsService;
    private bool _isCurrentlyDark = true;

    public bool IsDarkTheme => _isCurrentlyDark;

    public event EventHandler? ThemeChanged;

    public ThemeManager(ISettingsService settingsService)
    {
        _settingsService = settingsService;
        _settingsService.SettingsChanged += (_, _) => ApplyTheme();

        // Listen for Windows system theme changes
        SystemEvents.UserPreferenceChanged += (_, _) =>
        {
            if (_settingsService.Settings.ThemeMode == AppThemeMode.System)
            {
                Application.Current.Dispatcher.Invoke(ApplyTheme);
            }
        };
    }

    public void ApplyTheme()
    {
        bool useDark = ShouldUseDarkMode();
        _isCurrentlyDark = useDark;

        var dictUri = useDark
            ? new Uri("pack://application:,,,/Themes/DarkTheme.xaml", UriKind.Absolute)
            : new Uri("pack://application:,,,/Themes/LightTheme.xaml", UriKind.Absolute);

        var newThemeDict = new ResourceDictionary { Source = dictUri };

        // Replace theme dictionary in application resources
        var appResources = Application.Current.Resources.MergedDictionaries;
        if (appResources.Count > 0)
        {
            appResources[0] = newThemeDict;
        }
        else
        {
            appResources.Add(newThemeDict);
        }

        // Apply DWM dark mode attribute to all open windows
        foreach (Window window in Application.Current.Windows)
        {
            ApplyDwmDarkMode(window, useDark);
        }

        ThemeChanged?.Invoke(this, EventArgs.Empty);
    }

    public void ApplyDwmDarkMode(Window window, bool? isDark = null)
    {
        try
        {
            var hwnd = new WindowInteropHelper(window).Handle;
            if (hwnd == IntPtr.Zero) return;

            bool dark = isDark ?? _isCurrentlyDark;
            int darkMode = dark ? 1 : 0;
            NativeMethods.DwmSetWindowAttribute(
                hwnd,
                NativeMethods.DWMWA_USE_IMMERSIVE_DARK_MODE,
                ref darkMode,
                sizeof(int));
        }
        catch { }
    }

    private bool ShouldUseDarkMode()
    {
        return _settingsService.Settings.ThemeMode switch
        {
            AppThemeMode.Dark => true,
            AppThemeMode.Light => false,
            AppThemeMode.System => IsWindowsSystemDarkMode(),
            _ => true
        };
    }

    private static bool IsWindowsSystemDarkMode()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            var val = key?.GetValue("AppsUseLightTheme");
            if (val is int intVal)
            {
                return intVal == 0;
            }
        }
        catch { }

        return true;
    }
}
