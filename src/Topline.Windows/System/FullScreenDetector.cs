using System.Runtime.InteropServices;
using Topline.Windows.Native;

namespace Topline.Windows.System;

public class FullScreenDetector
{
    private IntPtr _lastForegroundWindow;
    private bool _lastIsFullScreen;

    public bool IsFullScreenActive(IntPtr ourWindowHwnd)
    {
        var foregroundHwnd = NativeMethods.GetForegroundWindow();
        if (foregroundHwnd == IntPtr.Zero || foregroundHwnd == ourWindowHwnd)
        {
            return false;
        }

        if (foregroundHwnd == _lastForegroundWindow)
        {
            return _lastIsFullScreen;
        }

        _lastForegroundWindow = foregroundHwnd;

        var hMonitor = NativeMethods.MonitorFromWindow(foregroundHwnd, NativeMethods.MONITOR_DEFAULTTONEAREST);
        var monitorInfo = new NativeMethods.MONITORINFO
        {
            cbSize = Marshal.SizeOf<NativeMethods.MONITORINFO>()
        };

        if (!NativeMethods.GetMonitorInfo(hMonitor, ref monitorInfo))
        {
            _lastIsFullScreen = false;
            return false;
        }

        if (NativeMethods.GetWindowRect(foregroundHwnd, out var windowRect))
        {
            // If the window covers or exceeds the entire monitor rectangle
            bool isFull = windowRect.Left <= monitorInfo.rcMonitor.Left &&
                          windowRect.Top <= monitorInfo.rcMonitor.Top &&
                          windowRect.Right >= monitorInfo.rcMonitor.Right &&
                          windowRect.Bottom >= monitorInfo.rcMonitor.Bottom;

            _lastIsFullScreen = isFull;
            return isFull;
        }

        _lastIsFullScreen = false;
        return false;
    }
}
