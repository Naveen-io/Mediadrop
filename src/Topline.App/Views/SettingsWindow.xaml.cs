using System.Windows;
using System.Windows.Controls;
using Topline.App.Services;
using Topline.Core.Contracts;
using Topline.Core.Models;
using Topline.Windows.System;

namespace Topline.App.Views;

public partial class SettingsWindow : Window
{
    private readonly ISettingsService _settingsService;
    private readonly ThemeManager _themeManager;
    private readonly IActivityAggregator _aggregator;

    public SettingsWindow(
        ISettingsService settingsService,
        ThemeManager themeManager,
        IActivityAggregator aggregator)
    {
        InitializeComponent();

        _settingsService = settingsService;
        _themeManager = themeManager;
        _aggregator = aggregator;

        Loaded += OnWindowLoaded;
    }

    private void OnWindowLoaded(object sender, RoutedEventArgs e)
    {
        _themeManager.ApplyDwmDarkMode(this);
        LoadSettingsIntoUI();
    }

    private void LoadSettingsIntoUI()
    {
        var s = _settingsService.Settings;

        // General
        StartWithWindowsCheckBox.IsChecked = SystemActions.IsStartWithWindowsEnabled();
        ReserveDesktopSpaceCheckBox.IsChecked = s.ReserveDesktopSpace;
        AutoHideCheckBox.IsChecked = s.AutoHide;
        IgnoreFullscreenCheckBox.IsChecked = s.IgnoreInFullscreen;
        Use24HourClockCheckBox.IsChecked = s.Use24HourClock;

        // Appearance
        switch (s.ThemeMode)
        {
            case AppThemeMode.Dark:
                ThemeComboBox.SelectedIndex = 0;
                break;
            case AppThemeMode.Light:
                ThemeComboBox.SelectedIndex = 1;
                break;
            default:
                ThemeComboBox.SelectedIndex = 2;
                break;
        }

        BarHeightSlider.Value = s.BarHeight;
        BarHeightValueText.Text = $"{s.BarHeight} px";

        int opacityPct = (int)Math.Round(s.Opacity * 100);
        OpacitySlider.Value = opacityPct;
        OpacityValueText.Text = $"{opacityPct}%";

        // Modules
        MediaModuleCheckBox.IsChecked = s.EnableMediaModule;
        DownloadModuleCheckBox.IsChecked = s.EnableDownloadModule;
        FileOperationModuleCheckBox.IsChecked = s.EnableFileOperationModule;
        UsbModuleCheckBox.IsChecked = s.EnableUsbModule;
        TimerModuleCheckBox.IsChecked = s.EnableTimerModule;
    }

    private void OnBarHeightSliderValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
    {
        if (BarHeightValueText != null)
        {
            BarHeightValueText.Text = $"{(int)e.NewValue} px";
        }
    }

    private void OnOpacitySliderValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
    {
        if (OpacityValueText != null)
        {
            OpacityValueText.Text = $"{(int)e.NewValue}%";
        }
    }

    private void OnSaveClick(object sender, RoutedEventArgs e)
    {
        var s = _settingsService.Settings;

        // General
        bool startWithWin = StartWithWindowsCheckBox.IsChecked == true;
        s.StartWithWindows = startWithWin;
        SystemActions.SetStartWithWindows(startWithWin);

        s.ReserveDesktopSpace = ReserveDesktopSpaceCheckBox.IsChecked == true;
        s.AutoHide = AutoHideCheckBox.IsChecked == true;
        s.IgnoreInFullscreen = IgnoreFullscreenCheckBox.IsChecked == true;
        s.Use24HourClock = Use24HourClockCheckBox.IsChecked == true;

        // Appearance
        if (ThemeComboBox.SelectedItem is ComboBoxItem item && item.Tag is string tag)
        {
            s.ThemeMode = tag switch
            {
                "Dark" => AppThemeMode.Dark,
                "Light" => AppThemeMode.Light,
                _ => AppThemeMode.System
            };
        }

        s.BarHeight = (int)BarHeightSlider.Value;
        s.Opacity = OpacitySlider.Value / 100.0;

        // Modules
        s.EnableMediaModule = MediaModuleCheckBox.IsChecked == true;
        s.EnableDownloadModule = DownloadModuleCheckBox.IsChecked == true;
        s.EnableFileOperationModule = FileOperationModuleCheckBox.IsChecked == true;
        s.EnableUsbModule = UsbModuleCheckBox.IsChecked == true;
        s.EnableTimerModule = TimerModuleCheckBox.IsChecked == true;

        _settingsService.Save();
        _themeManager.ApplyTheme();
        _themeManager.ApplyDwmDarkMode(this);

        Close();
    }

    private void OnCloseClick(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void OnClearHistoryClick(object sender, RoutedEventArgs e)
    {
        _aggregator.ClearHistory();
        MessageBox.Show(
            "Recent activity history has been cleared.",
            "TOPLINE",
            MessageBoxButton.OK,
            MessageBoxImage.Information);
    }
}
