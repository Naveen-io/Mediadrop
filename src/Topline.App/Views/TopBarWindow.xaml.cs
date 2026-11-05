using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Threading;
using Topline.App.Services;
using Topline.Core.Contracts;
using Topline.Core.Models;
using Topline.Modules.Timer;
using Topline.Windows.AppBar;
using Topline.Windows.Devices;
using Topline.Windows.Native;
using Topline.Windows.System;

namespace Topline.App.Views;

public partial class TopBarWindow : Window
{
    private readonly ISettingsService _settingsService;
    private readonly IActivityAggregator _aggregator;
    private readonly ThemeManager _themeManager;
    private readonly UsbDeviceNotifier _usbNotifier;
    private readonly AppBarManager _appBarManager;
    private readonly FullScreenDetector _fullScreenDetector = new();
    private readonly TimerActivityModule? _timerModule;

    private readonly DispatcherTimer _clockTimer;
    private readonly DispatcherTimer _fullscreenCheckTimer;
    private readonly DispatcherTimer _autoHideDelayTimer;

    private ExpandedPanelWindow? _expandedPanel;
    private SettingsWindow? _settingsWindow;

    private IntPtr _hwnd;
    private bool _isAutoHideHidden;
    private bool _isMouseInside;

    public TopBarWindow(
        ISettingsService settingsService,
        IActivityAggregator aggregator,
        ThemeManager themeManager,
        UsbDeviceNotifier usbNotifier,
        AppBarManager appBarManager,
        TimerActivityModule? timerModule = null)
    {
        InitializeComponent();

        _settingsService = settingsService;
        _aggregator = aggregator;
        _themeManager = themeManager;
        _usbNotifier = usbNotifier;
        _appBarManager = appBarManager;
        _timerModule = timerModule;

        // Clock timer
        _clockTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        _clockTimer.Tick += (_, _) => UpdateClock();
        _clockTimer.Start();
        UpdateClock();

        // Fullscreen check timer
        _fullscreenCheckTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1.5) };
        _fullscreenCheckTimer.Tick += OnFullScreenCheckTick;
        _fullscreenCheckTimer.Start();

        // Auto-hide delay timer
        _autoHideDelayTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(400) };
        _autoHideDelayTimer.Tick += (_, _) =>
        {
            _autoHideDelayTimer.Stop();
            if (!_isMouseInside && _settingsService.Settings.AutoHide)
            {
                ApplyAutoHide(true);
            }
        };

        // Aggregator events
        _aggregator.ActiveActivityChanged += (_, _) => Dispatcher.Invoke(UpdateActiveActivityDisplay);

        // Settings events
        _settingsService.SettingsChanged += OnSettingsChanged;

        Loaded += OnWindowLoaded;
        Closing += OnWindowClosing;
    }

    private void OnWindowLoaded(object sender, RoutedEventArgs e)
    {
        var helper = new WindowInteropHelper(this);
        _hwnd = helper.Handle;

        // Apply extended window styles: ToolWindow (no Alt+Tab) and NoActivate (no focus stealing)
        ApplyExtendedWindowStyles();

        // Register Windows message hook for AppBar and USB notifications
        var source = HwndSource.FromHwnd(_hwnd);
        source?.AddHook(HwndMessageHook);

        // Initialize USB notifications
        _usbNotifier.Initialize(_hwnd);

        // Apply theme and DWM dark mode
        _themeManager.ApplyDwmDarkMode(this);

        // Apply initial layout & AppBar registration
        ApplyBarLayout();

        // Initial activity update
        UpdateActiveActivityDisplay();
    }

    private void ApplyExtendedWindowStyles()
    {
        if (_hwnd == IntPtr.Zero) return;

        var exStyle = NativeMethods.GetWindowLongPtr(_hwnd, NativeMethods.GWL_EXSTYLE).ToInt64();
        // WS_EX_TOOLWINDOW: don't show on taskbar or Alt+Tab
        // WS_EX_NOACTIVATE: click does not steal active application focus
        exStyle |= NativeMethods.WS_EX_TOOLWINDOW | NativeMethods.WS_EX_NOACTIVATE;
        NativeMethods.SetWindowLongPtr(_hwnd, NativeMethods.GWL_EXSTYLE, new IntPtr(exStyle));
    }

    public void ApplyBarLayout()
    {
        if (_hwnd == IntPtr.Zero) return;

        var settings = _settingsService.Settings;
        var barHeight = Math.Clamp(settings.BarHeight, 32, 44);
        Height = barHeight;
        RootGrid.Height = barHeight;
        BarBorder.Opacity = Math.Clamp(settings.Opacity, 0.70, 1.0);

        var hMonitor = NativeMethods.MonitorFromWindow(_hwnd, NativeMethods.MONITOR_DEFAULTTONEAREST);
        var monitorInfo = new NativeMethods.MONITORINFO
        {
            cbSize = Marshal.SizeOf<NativeMethods.MONITORINFO>()
        };

        if (NativeMethods.GetMonitorInfo(hMonitor, ref monitorInfo))
        {
            var dpi = VisualTreeHelper.GetDpi(this);
            double screenWidthDip = monitorInfo.rcMonitor.Width / dpi.DpiScaleX;
            double screenLeftDip = monitorInfo.rcMonitor.Left / dpi.DpiScaleX;
            double screenTopDip = monitorInfo.rcMonitor.Top / dpi.DpiScaleY;

            Left = screenLeftDip;
            Top = screenTopDip;
            Width = screenWidthDip;

            if (settings.ReserveDesktopSpace && !settings.AutoHide)
            {
                int pixelHeight = (int)Math.Round(barHeight * dpi.DpiScaleY);
                _appBarManager.Register(_hwnd, pixelHeight);
            }
            else
            {
                _appBarManager.Unregister();
                NativeMethods.SetWindowPos(
                    _hwnd,
                    NativeMethods.HWND_TOPMOST,
                    monitorInfo.rcMonitor.Left,
                    monitorInfo.rcMonitor.Top,
                    monitorInfo.rcMonitor.Width,
                    (int)(barHeight * dpi.DpiScaleY),
                    NativeMethods.SWP_NOACTIVATE | NativeMethods.SWP_SHOWWINDOW);
            }
        }
    }

    private IntPtr HwndMessageHook(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        _appBarManager.HandleWindowMessages(msg, wParam, lParam, ref handled);
        _usbNotifier.HandleWindowMessages(msg, wParam, lParam, ref handled);
        return IntPtr.Zero;
    }

    private void UpdateClock()
    {
        var now = DateTime.Now;
        bool is24 = _settingsService.Settings.Use24HourClock;
        ClockText.Text = is24 ? now.ToString("HH:mm") : now.ToString("h:mm tt");
        ClockText.ToolTip = now.ToString("dddd, MMMM d, yyyy");
    }

    private void UpdateActiveActivityDisplay()
    {
        var active = _aggregator.ActiveActivity;

        if (active == null)
        {
            ActivityChip.Visibility = Visibility.Collapsed;
            StatusDot.Fill = (System.Windows.Media.Brush)FindResource("TextTertiaryBrush");
            return;
        }

        StatusDot.Fill = (System.Windows.Media.Brush)FindResource("AccentBrush");

        ActivityGlyphText.Text = active.IconGlyph ?? "\uE946";
        ActivityTitleText.Text = active.Title;
        ActivitySubtitleText.Text = active.Subtitle ?? "";

        // Progress bar
        if (active.Progress.HasValue)
        {
            ActivityProgressLine.Value = active.Progress.Value;
            ActivityProgressLine.Visibility = Visibility.Visible;
        }
        else
        {
            ActivityProgressLine.Visibility = Visibility.Collapsed;
        }

        // Inline primary button
        if (!string.IsNullOrEmpty(active.PrimaryActionGlyph))
        {
            PrimaryInlineGlyph.Text = active.PrimaryActionGlyph;
            PrimaryInlineButton.ToolTip = active.PrimaryActionLabel;
            PrimaryInlineButton.Visibility = Visibility.Visible;
        }
        else
        {
            PrimaryInlineButton.Visibility = Visibility.Collapsed;
        }

        // Inline secondary button
        if (!string.IsNullOrEmpty(active.SecondaryActionGlyph))
        {
            SecondaryInlineGlyph.Text = active.SecondaryActionGlyph;
            SecondaryInlineButton.ToolTip = active.SecondaryActionLabel;
            SecondaryInlineButton.Visibility = Visibility.Visible;
        }
        else
        {
            SecondaryInlineButton.Visibility = Visibility.Collapsed;
        }

        ActivityChip.Visibility = Visibility.Visible;
    }

    private void OnFullScreenCheckTick(object? sender, EventArgs e)
    {
        if (!_settingsService.Settings.IgnoreInFullscreen) return;

        bool isFullscreen = _fullScreenDetector.IsFullScreenActive(_hwnd);
        if (isFullscreen)
        {
            if (Visibility == Visibility.Visible)
            {
                Visibility = Visibility.Collapsed;
            }
        }
        else
        {
            if (Visibility != Visibility.Visible)
            {
                Visibility = Visibility.Visible;
            }
        }
    }

    private void OnSettingsChanged(object? sender, AppSettings e)
    {
        Dispatcher.Invoke(() =>
        {
            ApplyBarLayout();
            UpdateClock();
            UpdateActiveActivityDisplay();
        });
    }

    private void OnActivityChipMouseEnter(object sender, MouseEventArgs e)
    {
        InlineActionsPanel.Visibility = Visibility.Visible;
    }

    private void OnActivityChipMouseLeave(object sender, MouseEventArgs e)
    {
        InlineActionsPanel.Visibility = Visibility.Collapsed;
    }

    private async void OnPrimaryInlineButtonClick(object sender, RoutedEventArgs e)
    {
        e.Handled = true;
        var active = _aggregator.ActiveActivity;
        if (active != null)
        {
            await _aggregator.ExecutePrimaryActionAsync(active);
        }
    }

    private async void OnSecondaryInlineButtonClick(object sender, RoutedEventArgs e)
    {
        e.Handled = true;
        var active = _aggregator.ActiveActivity;
        if (active != null)
        {
            await _aggregator.ExecuteSecondaryActionAsync(active);
        }
    }

    private void OnActivityChipClick(object sender, RoutedEventArgs e)
    {
        ToggleExpandedPanel();
    }

    private void OnWordmarkClick(object sender, RoutedEventArgs e)
    {
        ToggleExpandedPanel();
    }

    private void OnClockClick(object sender, RoutedEventArgs e)
    {
        ToggleExpandedPanel();
    }

    private void OnExpandButtonClick(object sender, RoutedEventArgs e)
    {
        ToggleExpandedPanel();
    }

    private void ToggleExpandedPanel()
    {
        if (_expandedPanel != null && _expandedPanel.IsVisible)
        {
            _expandedPanel.Hide();
            ExpandChevron.Text = "\uE70D"; // Down arrow
            return;
        }

        if (_expandedPanel == null)
        {
            _expandedPanel = new ExpandedPanelWindow(_settingsService, _aggregator, _timerModule, _themeManager);
            _expandedPanel.Closed += (_, _) => _expandedPanel = null;
        }

        // Anchor below TopBarWindow
        var dpi = VisualTreeHelper.GetDpi(this);
        double panelWidth = 410;
        double targetLeft = Left + (Width - panelWidth) / 2.0;
        double targetTop = Top + Height + 4;

        _expandedPanel.Left = Math.Max(Left, targetLeft);
        _expandedPanel.Top = targetTop;
        _expandedPanel.Show();
        _expandedPanel.Activate();
        ExpandChevron.Text = "\uE70E"; // Up arrow
    }

    private void OnAudioButtonClick(object sender, RoutedEventArgs e)
    {
        SystemActions.OpenVolumeMixer();
    }

    private void OnQuickTimerButtonClick(object sender, RoutedEventArgs e)
    {
        if (_timerModule != null)
        {
            if (_timerModule.Status == ActivityStatus.Active)
            {
                _timerModule.Pause();
            }
            else if (_timerModule.Status == ActivityStatus.Paused)
            {
                _timerModule.Resume();
            }
            else
            {
                _timerModule.Start(TimeSpan.FromMinutes(25));
            }
        }
    }

    private void OnSettingsButtonClick(object sender, RoutedEventArgs e)
    {
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

    // Auto-hide handlers
    private void OnWindowMouseEnter(object sender, MouseEventArgs e)
    {
        _isMouseInside = true;
        _autoHideDelayTimer.Stop();
        if (_isAutoHideHidden)
        {
            ApplyAutoHide(false);
        }
    }

    private void OnWindowMouseLeave(object sender, MouseEventArgs e)
    {
        _isMouseInside = false;
        if (_settingsService.Settings.AutoHide)
        {
            _autoHideDelayTimer.Start();
        }
    }

    private void OnAutoHideTriggerMouseEnter(object sender, MouseEventArgs e)
    {
        ApplyAutoHide(false);
    }

    private void ApplyAutoHide(bool hide)
    {
        _isAutoHideHidden = hide;
        if (hide)
        {
            Top = -Height + 2; // Leave 2px touch strip at top
            AutoHideTrigger.Visibility = Visibility.Visible;
        }
        else
        {
            Top = 0;
            AutoHideTrigger.Visibility = Visibility.Collapsed;
        }
    }

    private void OnWindowClosing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        _clockTimer.Stop();
        _fullscreenCheckTimer.Stop();
        _autoHideDelayTimer.Stop();
        _appBarManager.Dispose();
        _usbNotifier.Dispose();
    }
}
