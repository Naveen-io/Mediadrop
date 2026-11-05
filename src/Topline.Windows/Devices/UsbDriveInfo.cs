namespace Topline.Windows.Devices;

public record UsbDriveInfo(
    string DriveLetter,
    string VolumeLabel,
    string DriveFormat,
    long TotalSizeBytes,
    long FreeSizeBytes)
{
    public string DisplayName => string.IsNullOrWhiteSpace(VolumeLabel) 
        ? $"USB Drive ({DriveLetter})" 
        : $"{VolumeLabel} ({DriveLetter})";

    public string FormattedTotalSize => FormatBytes(TotalSizeBytes);
    public string FormattedFreeSize => FormatBytes(FreeSizeBytes);

    private static string FormatBytes(long bytes)
    {
        string[] suffixes = ["B", "KB", "MB", "GB", "TB"];
        int counter = 0;
        decimal number = bytes;
        while (Math.Round(number / 1024) >= 1)
        {
            number /= 1024;
            counter++;
        }
        return $"{number:n1} {suffixes[counter]}";
    }
}
