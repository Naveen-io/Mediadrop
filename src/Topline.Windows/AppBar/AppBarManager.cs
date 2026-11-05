using System.Runtime.InteropServices;
using Topline.Windows.Native;

namespace Topline.Windows.AppBar;

public class AppBarManager : IDisposable
{
    private IntPtr _hwnd;
    private bool _isRegistered;
    private int _uCallbackMessage;
    private int _barHeightPixels = 36;
    private readonly int _taskbarCreatedMsg;
    private NativeMethods.RECT _currentRect;

    public bool IsRegistered => _isRegistered;
    public event EventHandler? PositionChanged;

    public AppBarManager()
    {
        _uCallbackMessage = NativeMethods.WM_APPBAR_CALLBACK;
        _taskbarCreatedMsg = NativeMethods.RegisterWindowMessage("TaskbarCreated");
    }

    public void Register(IntPtr hwnd, int heightPixels)
    {
        if (_hwnd != IntPtr.Zero && _isRegistered)
        {
            Unregister();
        }

        _hwnd = hwnd;
        _barHeightPixels = heightPixels;

        var abd = new NativeMethods.APPBARDATA
        {
            cbSize = Marshal.SizeOf<NativeMethods.APPBARDATA>(),
            hWnd = _hwnd,
            uCallbackMessage = _uCallbackMessage
        };

        var result = NativeMethods.SHAppBarMessage(NativeMethods.ABM_NEW, ref abd);
        _isRegistered = result != UIntPtr.Zero;

        if (_isRegistered)
        {
            UpdatePosition();
        }
    }

    public void Unregister()
    {
        if (!_isRegistered || _hwnd == IntPtr.Zero)
            return;

        var abd = new NativeMethods.APPBARDATA
        {
            cbSize = Marshal.SizeOf<NativeMethods.APPBARDATA>(),
            hWnd = _hwnd
        };

        NativeMethods.SHAppBarMessage(NativeMethods.ABM_REMOVE, ref abd);
        _isRegistered = false;
    }

    public void UpdatePosition(int? newHeightPixels = null)
    {
        if (!_isRegistered || _hwnd == IntPtr.Zero)
            return;

        if (newHeightPixels.HasValue)
        {
            _barHeightPixels = newHeightPixels.Value;
        }

        // Get monitor dimensions for the window's current monitor
        var hMonitor = NativeMethods.MonitorFromWindow(_hwnd, NativeMethods.MONITOR_DEFAULTTONEAREST);
        var monitorInfo = new NativeMethods.MONITORINFO
        {
            cbSize = Marshal.SizeOf<NativeMethods.MONITORINFO>()
        };

        if (!NativeMethods.GetMonitorInfo(hMonitor, ref monitorInfo))
            return;

        var abd = new NativeMethods.APPBARDATA
        {
            cbSize = Marshal.SizeOf<NativeMethods.APPBARDATA>(),
            hWnd = _hwnd,
            uEdge = NativeMethods.ABE_TOP,
            rc = new NativeMethods.RECT
            {
                Left = monitorInfo.rcMonitor.Left,
                Top = monitorInfo.rcMonitor.Top,
                Right = monitorInfo.rcMonitor.Right,
                Bottom = monitorInfo.rcMonitor.Top + _barHeightPixels
            }
        };

        // Query system for proposed position
        NativeMethods.SHAppBarMessage(NativeMethods.ABM_QUERYPOS, ref abd);

        // Adjust top edge bounds
        abd.rc.Bottom = abd.rc.Top + _barHeightPixels;

        // Set approved position (reserving desktop work area)
        NativeMethods.SHAppBarMessage(NativeMethods.ABM_SETPOS, ref abd);

        _currentRect = abd.rc;

        // Position our HWND to the assigned rectangle
        NativeMethods.SetWindowPos(
            _hwnd,
            NativeMethods.HWND_TOPMOST,
            abd.rc.Left,
            abd.rc.Top,
            abd.rc.Width,
            abd.rc.Height,
            NativeMethods.SWP_NOACTIVATE | NativeMethods.SWP_SHOWWINDOW);

        PositionChanged?.Invoke(this, EventArgs.Empty);
    }

    public IntPtr HandleWindowMessages(int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == _taskbarCreatedMsg)
        {
            // Windows Explorer crashed and restarted. Re-register AppBar.
            if (_hwnd != IntPtr.Zero && _isRegistered)
            {
                Unregister();
                Register(_hwnd, _barHeightPixels);
                handled = true;
            }
        }
        else if (msg == NativeMethods.WM_ACTIVATE)
        {
            if (_isRegistered && _hwnd != IntPtr.Zero)
            {
                var abd = new NativeMethods.APPBARDATA
                {
                    cbSize = Marshal.SizeOf<NativeMethods.APPBARDATA>(),
                    hWnd = _hwnd
                };
                NativeMethods.SHAppBarMessage(NativeMethods.ABM_ACTIVATE, ref abd);
            }
        }
        else if (msg == NativeMethods.WM_WINDOWPOSCHANGED)
        {
            if (_isRegistered && _hwnd != IntPtr.Zero)
            {
                var abd = new NativeMethods.APPBARDATA
                {
                    cbSize = Marshal.SizeOf<NativeMethods.APPBARDATA>(),
                    hWnd = _hwnd
                };
                NativeMethods.SHAppBarMessage(NativeMethods.ABM_WINDOWPOSCHANGED, ref abd);
            }
        }
        else if (msg == _uCallbackMessage)
        {
            var notification = (int)wParam;
            switch (notification)
            {
                case NativeMethods.ABN_POSCHANGED:
                    UpdatePosition();
                    handled = true;
                    break;
            }
        }

        return IntPtr.Zero;
    }

    public void Dispose()
    {
        Unregister();
        _hwnd = IntPtr.Zero;
    }
}
