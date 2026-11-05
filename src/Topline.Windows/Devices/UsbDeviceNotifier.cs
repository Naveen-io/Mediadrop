using System.IO;
using System.Runtime.InteropServices;
using Topline.Windows.Native;
using Debug = System.Diagnostics.Debug;

namespace Topline.Windows.Devices;

public class UsbDeviceNotifier : IDisposable
{
    private IntPtr _hwnd;
    private IntPtr _hNotify;

    public event EventHandler<UsbDriveInfo>? DeviceConnected;
    public event EventHandler<string>? DeviceRemoved;

    public void Initialize(IntPtr hwnd)
    {
        _hwnd = hwnd;
        RegisterNotification();
    }

    private void RegisterNotification()
    {
        if (_hwnd == IntPtr.Zero) return;

        var filter = new NativeMethods.DEV_BROADCAST_HDR
        {
            dbch_size = Marshal.SizeOf<NativeMethods.DEV_BROADCAST_HDR>(),
            dbch_devicetype = NativeMethods.DBT_DEVTYP_VOLUME
        };

        var pFilter = Marshal.AllocHGlobal(filter.dbch_size);
        try
        {
            Marshal.StructureToPtr(filter, pFilter, true);
            _hNotify = NativeMethods.RegisterDeviceNotification(_hwnd, pFilter, NativeMethods.DEVICE_NOTIFY_WINDOW_HANDLE);
        }
        finally
        {
            Marshal.FreeHGlobal(pFilter);
        }
    }

    public IntPtr HandleWindowMessages(int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == NativeMethods.WM_DEVICECHANGE && lParam != IntPtr.Zero)
        {
            var eventType = wParam.ToInt32();
            if (eventType == NativeMethods.DBT_DEVICEARRIVAL || eventType == NativeMethods.DBT_DEVICEREMOVECOMPLETE)
            {
                var hdr = Marshal.PtrToStructure<NativeMethods.DEV_BROADCAST_HDR>(lParam);
                if (hdr.dbch_devicetype == NativeMethods.DBT_DEVTYP_VOLUME)
                {
                    var vol = Marshal.PtrToStructure<NativeMethods.DEV_BROADCAST_VOLUME>(lParam);
                    var driveLetter = GetDriveLetterFromMask(vol.dbcv_unitmask);
                    if (!string.IsNullOrEmpty(driveLetter))
                    {
                        if (eventType == NativeMethods.DBT_DEVICEARRIVAL)
                        {
                            OnDeviceArrival(driveLetter);
                        }
                        else
                        {
                            DeviceRemoved?.Invoke(this, driveLetter);
                        }
                        handled = true;
                    }
                }
            }
        }

        return IntPtr.Zero;
    }

    private void OnDeviceArrival(string driveLetter)
    {
        Task.Run(() =>
        {
            // Give Windows Shell a brief moment to mount filesystem
            Thread.Sleep(500);

            try
            {
                var driveInfo = new DriveInfo(driveLetter);
                if (driveInfo.IsReady)
                {
                    var usbInfo = new UsbDriveInfo(
                        driveLetter,
                        driveInfo.VolumeLabel,
                        driveInfo.DriveFormat,
                        driveInfo.TotalSize,
                        driveInfo.TotalFreeSpace);

                    DeviceConnected?.Invoke(this, usbInfo);
                }
            }
            catch (Exception ex)
            {
                global::System.Diagnostics.Debug.WriteLine($"Failed to query drive info for {driveLetter}: {ex.Message}");
            }
        });
    }

    public IReadOnlyList<UsbDriveInfo> GetCurrentlyConnectedRemovableDrives()
    {
        var result = new List<UsbDriveInfo>();
        try
        {
            foreach (var drive in DriveInfo.GetDrives())
            {
                if (drive.DriveType == DriveType.Removable && drive.IsReady)
                {
                    result.Add(new UsbDriveInfo(
                        drive.Name.TrimEnd('\\'),
                        drive.VolumeLabel,
                        drive.DriveFormat,
                        drive.TotalSize,
                        drive.TotalFreeSpace));
                }
            }
        }
        catch (Exception ex)
        {
            global::System.Diagnostics.Debug.WriteLine($"Error enumerating removable drives: {ex.Message}");
        }

        return result;
    }

    private static string? GetDriveLetterFromMask(int unitMask)
    {
        for (int i = 0; i < 26; i++)
        {
            if ((unitMask & (1 << i)) != 0)
            {
                char letter = (char)('A' + i);
                return $"{letter}:";
            }
        }
        return null;
    }

    public void Dispose()
    {
        if (_hNotify != IntPtr.Zero)
        {
            NativeMethods.UnregisterDeviceNotification(_hNotify);
            _hNotify = IntPtr.Zero;
        }
        _hwnd = IntPtr.Zero;
    }
}
