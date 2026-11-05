using System.Diagnostics;
using System.IO;
using Microsoft.Win32;
using Topline.Windows.Native;

namespace Topline.Windows.System;

public static class SystemActions
{
    private const string RunRegistryKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string AppRegistryValueName = "ToplineDesktop";

    public static void OpenClipboardHistory()
    {
        try
        {
            // Synthesize Win + V
            NativeMethods.keybd_event(NativeMethods.VK_LWIN, 0, 0, UIntPtr.Zero);
            NativeMethods.keybd_event(NativeMethods.VK_V, 0, 0, UIntPtr.Zero);
            NativeMethods.keybd_event(NativeMethods.VK_V, 0, NativeMethods.KEYEVENTF_KEYUP, UIntPtr.Zero);
            NativeMethods.keybd_event(NativeMethods.VK_LWIN, 0, NativeMethods.KEYEVENTF_KEYUP, UIntPtr.Zero);
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error triggering clipboard history: {ex.Message}");
        }
    }

    public static void OpenAudioSettings()
    {
        try
        {
            Process.Start(new ProcessStartInfo("ms-settings:sound") { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error opening audio settings: {ex.Message}");
        }
    }

    public static void OpenVolumeMixer()
    {
        try
        {
            Process.Start(new ProcessStartInfo("ms-settings:apps-volume") { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error opening volume mixer: {ex.Message}");
        }
    }

    public static void OpenDownloadsFolder(string? customPath = null)
    {
        try
        {
            var folder = !string.IsNullOrWhiteSpace(customPath) && Directory.Exists(customPath)
                ? customPath
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");

            if (Directory.Exists(folder))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = folder,
                    UseShellExecute = true
                });
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error opening downloads folder: {ex.Message}");
        }
    }

    public static void OpenFileExplorer(string? targetPath = null)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(targetPath) || (!File.Exists(targetPath) && !Directory.Exists(targetPath)))
            {
                Process.Start(new ProcessStartInfo("explorer.exe") { UseShellExecute = true });
                return;
            }

            if (File.Exists(targetPath))
            {
                // Select file in explorer
                Process.Start(new ProcessStartInfo("explorer.exe", $"/select,\"{targetPath}\"") { UseShellExecute = true });
            }
            else
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = targetPath,
                    UseShellExecute = true
                });
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error opening explorer: {ex.Message}");
        }
    }

    public static void OpenFile(string filePath)
    {
        try
        {
            if (File.Exists(filePath))
            {
                Process.Start(new ProcessStartInfo(filePath) { UseShellExecute = true });
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error opening file: {ex.Message}");
        }
    }

    public static void SetStartWithWindows(bool enable)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunRegistryKey, true);
            if (key == null) return;

            if (enable)
            {
                var exePath = Process.GetCurrentProcess().MainModule?.FileName;
                if (!string.IsNullOrEmpty(exePath))
                {
                    key.SetValue(AppRegistryValueName, $"\"{exePath}\"");
                }
            }
            else
            {
                key.DeleteValue(AppRegistryValueName, false);
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"Error updating start with windows: {ex.Message}");
        }
    }

    public static void TrimWorkingSet()
    {
        try
        {
            GC.Collect(2, GCCollectionMode.Aggressive, true, true);
            GC.WaitForPendingFinalizers();
            NativeMethods.SetProcessWorkingSetSize(Process.GetCurrentProcess().Handle, new IntPtr(-1), new IntPtr(-1));
        }
        catch { }
    }

    public static bool IsStartWithWindowsEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunRegistryKey, false);
            return key?.GetValue(AppRegistryValueName) != null;
        }
        catch
        {
            return false;
        }
    }
}
