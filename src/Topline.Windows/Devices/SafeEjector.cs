using System.ComponentModel;
using System.Runtime.InteropServices;
using Topline.Windows.Native;

namespace Topline.Windows.Devices;

public record EjectResult(bool Success, string Message);

public static class SafeEjector
{
    public static Task<EjectResult> EjectDriveAsync(string driveLetter)
    {
        return Task.Run(() => EjectDrive(driveLetter));
    }

    public static EjectResult EjectDrive(string driveLetter)
    {
        // Strip trailing backslash and colon if present
        var letter = driveLetter.Trim().TrimEnd('\\');
        if (letter.EndsWith(':'))
        {
            letter = letter[..^1];
        }

        var devicePath = $@"\\.\{letter}:";

        IntPtr handle = NativeMethods.CreateFile(
            devicePath,
            NativeMethods.GENERIC_READ | NativeMethods.GENERIC_WRITE,
            NativeMethods.FILE_SHARE_READ | NativeMethods.FILE_SHARE_WRITE,
            IntPtr.Zero,
            NativeMethods.OPEN_EXISTING,
            0,
            IntPtr.Zero);

        if (handle == IntPtr.Zero || handle == new IntPtr(-1))
        {
            int error = Marshal.GetLastWin32Error();
            return new EjectResult(false, $"Could not access drive {letter}: ({new Win32Exception(error).Message})");
        }

        try
        {
            // Step 1: Lock Volume (retry a few times if briefly busy)
            bool locked = false;
            for (int i = 0; i < 3; i++)
            {
                if (NativeMethods.DeviceIoControl(
                    handle,
                    NativeMethods.FSCTL_LOCK_VOLUME,
                    IntPtr.Zero, 0,
                    IntPtr.Zero, 0,
                    out _,
                    IntPtr.Zero))
                {
                    locked = true;
                    break;
                }
                Thread.Sleep(200);
            }

            if (!locked)
            {
                int error = Marshal.GetLastWin32Error();
                return new EjectResult(false, $"Drive {letter}: is in use by another application. Close open files and try again.");
            }

            // Step 2: Dismount Volume
            if (!NativeMethods.DeviceIoControl(
                handle,
                NativeMethods.FSCTL_DISMOUNT_VOLUME,
                IntPtr.Zero, 0,
                IntPtr.Zero, 0,
                out _,
                IntPtr.Zero))
            {
                int error = Marshal.GetLastWin32Error();
                return new EjectResult(false, $"Failed to dismount drive {letter}: ({new Win32Exception(error).Message})");
            }

            // Step 3: Prevent removal disabled / Eject storage
            if (!NativeMethods.DeviceIoControl(
                handle,
                NativeMethods.IOCTL_STORAGE_EJECT_MEDIA,
                IntPtr.Zero, 0,
                IntPtr.Zero, 0,
                out _,
                IntPtr.Zero))
            {
                int error = Marshal.GetLastWin32Error();
                return new EjectResult(false, $"Failed to eject media {letter}: ({new Win32Exception(error).Message})");
            }

            return new EjectResult(true, $"Drive {letter}: is safely dismounted. You may remove the device now.");
        }
        finally
        {
            NativeMethods.CloseHandle(handle);
        }
    }
}
