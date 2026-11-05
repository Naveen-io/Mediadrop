using System.Threading;
using System.Windows;
using Topline.App.Services;
using Topline.App.Views;
using Topline.Core.Contracts;
using Topline.Core.Services;
using Topline.Modules.Downloads;
using Topline.Modules.FileOperations;
using Topline.Modules.Media;
using Topline.Modules.Timer;
using Topline.Modules.Usb;
using Topline.Windows.AppBar;
using Topline.Windows.Devices;

namespace Topline.App;

public partial class App : Application
{
    private static Mutex? _singleInstanceMutex;
    private const string MutexName = "Global\\Topline_Desktop_Activity_Companion_SingleInstance";

    private ISettingsService? _settingsService;
    private IHistoryService? _historyService;
    private ThemeManager? _themeManager;
    private IActivityAggregator? _aggregator;
    private AppBarManager? _appBarManager;
    private UsbDeviceNotifier? _usbNotifier;

    private MediaActivityModule? _mediaModule;
    private DownloadActivityModule? _downloadModule;
    private FileOperationActivityModule? _fileOpModule;
    private UsbActivityModule? _usbModule;
    private TimerActivityModule? _timerModule;

    private TopBarWindow? _topBarWindow;

    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        // Single instance check
        _singleInstanceMutex = new Mutex(true, MutexName, out bool createdNew);
        if (!createdNew)
        {
            MessageBox.Show(
                "TOPLINE is already running at the top edge of your screen.",
                "TOPLINE",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
            Shutdown();
            return;
        }

        // Initialize Core Services
        _settingsService = new SettingsService();
        _historyService = new HistoryService(_settingsService);
        _aggregator = new ActivityAggregator(_historyService);

        // Initialize Theme Manager
        _themeManager = new ThemeManager(_settingsService);
        _themeManager.ApplyTheme();

        // Initialize Windows Subsystems
        _appBarManager = new AppBarManager();
        _usbNotifier = new UsbDeviceNotifier();

        // Initialize Modules
        _timerModule = new TimerActivityModule(_settingsService, _aggregator);
        _mediaModule = new MediaActivityModule(_settingsService);
        _downloadModule = new DownloadActivityModule(_settingsService, _aggregator);
        _fileOpModule = new FileOperationActivityModule(_settingsService, _aggregator);
        _usbModule = new UsbActivityModule(_settingsService, _usbNotifier, _aggregator);

        // Register Modules with Aggregator
        _aggregator.RegisterModule(_timerModule);
        _aggregator.RegisterModule(_mediaModule);
        _aggregator.RegisterModule(_downloadModule);
        _aggregator.RegisterModule(_fileOpModule);
        _aggregator.RegisterModule(_usbModule);

        // Initialize Modules Asynchronously
        await _timerModule.InitializeAsync();
        await _mediaModule.InitializeAsync();
        await _downloadModule.InitializeAsync();
        await _fileOpModule.InitializeAsync();
        await _usbModule.InitializeAsync();

        // Create and show TopBarWindow
        _topBarWindow = new TopBarWindow(
            _settingsService,
            _aggregator,
            _themeManager,
            _usbNotifier,
            _appBarManager,
            _timerModule);

        MainWindow = _topBarWindow;
        _topBarWindow.Show();

        // Release startup JIT allocations after initialization to achieve low idle memory footprint
        _ = Task.Delay(3000).ContinueWith(_ =>
        {
            Topline.Windows.System.SystemActions.TrimWorkingSet();
        }, TaskScheduler.Default);
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _topBarWindow?.Close();

        _timerModule?.Dispose();
        _mediaModule?.Dispose();
        _downloadModule?.Dispose();
        _fileOpModule?.Dispose();
        _usbModule?.Dispose();

        _appBarManager?.Dispose();
        _usbNotifier?.Dispose();

        if (_singleInstanceMutex != null)
        {
            _singleInstanceMutex.ReleaseMutex();
            _singleInstanceMutex.Dispose();
            _singleInstanceMutex = null;
        }

        base.OnExit(e);
    }
}
