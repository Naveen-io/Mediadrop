using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using Topline.App.Services;
using Topline.Core.Contracts;
using Topline.Core.Models;
using Topline.Modules.Timer;
using Topline.Windows.Native;
using Topline.Windows.System;

namespace Topline.App.Views;

public partial class ExpandedPanelWindow : Window
{
    private readonly ISettingsService _settingsService;
    private readonly IActivityAggregator _aggregator;
    private readonly TimerActivityModule? _timerModule;
    private readonly ThemeManager _themeManager;
    private SettingsWindow? _settingsWindow;

    public ExpandedPanelWindow(
        ISettingsService settingsService,
        IActivityAggregator aggregator,
        TimerActivityModule? timerModule,
        ThemeManager themeManager)
    {
        InitializeComponent();

        _settingsService = settingsService;
        _aggregator = aggregator;
        _timerModule = timerModule;
        _themeManager = themeManager;

        _aggregator.AllActivitiesChanged += (_, _) => Dispatcher.Invoke(RefreshActivities);
        _aggregator.RecentActivitiesChanged += (_, _) => Dispatcher.Invoke(RefreshRecentActivities);

        Loaded += OnWindowLoaded;
        IsVisibleChanged += OnIsVisibleChanged;
    }

    private void OnWindowLoaded(object sender, RoutedEventArgs e)
    {
        var helper = new WindowInteropHelper(this);
        var hwnd = helper.Handle;

        // Apply ToolWindow style
        if (hwnd != IntPtr.Zero)
        {
            var exStyle = NativeMethods.GetWindowLongPtr(hwnd, NativeMethods.GWL_EXSTYLE).ToInt64();
            exStyle |= NativeMethods.WS_EX_TOOLWINDOW;
            NativeMethods.SetWindowLongPtr(hwnd, NativeMethods.GWL_EXSTYLE, new IntPtr(exStyle));

            _themeManager.ApplyDwmDarkMode(this);
        }

        RefreshActivities();
        RefreshRecentActivities();
    }

    private void OnIsVisibleChanged(object sender, DependencyPropertyChangedEventArgs e)
    {
        if (IsVisible)
        {
            RefreshActivities();
            RefreshRecentActivities();
        }
    }

    private void RefreshActivities()
    {
        var activities = _aggregator.AllActiveActivities;
        ActiveActivitiesList.ItemsSource = activities;

        if (activities.Count == 0)
        {
            EmptyStateBorder.Visibility = Visibility.Visible;
            ActiveCountText.Text = "0 active";
        }
        else
        {
            EmptyStateBorder.Visibility = Visibility.Collapsed;
            ActiveCountText.Text = $"{activities.Count} active";
        }
    }

    private void RefreshRecentActivities()
    {
        var recent = _aggregator.RecentActivities;
        RecentActivitiesList.ItemsSource = recent;

        if (recent.Count == 0)
        {
            NoHistoryText.Visibility = Visibility.Visible;
            ClearHistoryButton.Visibility = Visibility.Collapsed;
        }
        else
        {
            NoHistoryText.Visibility = Visibility.Collapsed;
            ClearHistoryButton.Visibility = Visibility.Visible;
        }
    }

    private void OnWindowDeactivated(object? sender, EventArgs e)
    {
        Hide();
    }

    private void OnWindowKeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Escape)
        {
            Hide();
            e.Handled = true;
        }
    }

    private async void OnActiveItemPrimaryActionClick(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement { Tag: ActivityItem item })
        {
            await _aggregator.ExecutePrimaryActionAsync(item);
        }
    }

    private async void OnActiveItemSecondaryActionClick(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement { Tag: ActivityItem item })
        {
            await _aggregator.ExecuteSecondaryActionAsync(item);
        }
    }

    private void OnQuickActionDownloadsClick(object sender, RoutedEventArgs e)
    {
        SystemActions.OpenDownloadsFolder(_settingsService.Settings.CustomDownloadsPath);
        Hide();
    }

    private void OnQuickActionExplorerClick(object sender, RoutedEventArgs e)
    {
        SystemActions.OpenFileExplorer();
        Hide();
    }

    private void OnQuickActionSoundClick(object sender, RoutedEventArgs e)
    {
        SystemActions.OpenVolumeMixer();
        Hide();
    }

    private void OnQuickActionClipboardClick(object sender, RoutedEventArgs e)
    {
        SystemActions.OpenClipboardHistory();
        Hide();
    }

    private void OnQuickActionTimerClick(object sender, RoutedEventArgs e)
    {
        if (_timerModule != null)
        {
            _timerModule.Start(TimeSpan.FromMinutes(25));
        }
        Hide();
    }

    private void OnQuickActionSettingsClick(object sender, RoutedEventArgs e)
    {
        Hide();
        if (_settingsWindow != null && _settingsWindow.IsVisible)
        {
            _settingsWindow.Activate();
            return;
        }

        _settingsWindow = new SettingsWindow(_settingsService, _themeManager, _aggregator);
        _settingsWindow.Closed += (_, _) => _settingsWindow = null;
        _settingsWindow.Show();
        _settingsWindow.Activate();
    }

    private void OnClearHistoryClick(object sender, RoutedEventArgs e)
    {
        _aggregator.ClearHistory();
        RefreshRecentActivities();
    }
}
