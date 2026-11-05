using Topline.Windows.Devices;
using Xunit;

namespace Topline.Tests;

public class UsbTests
{
    [Fact]
    public void UsbDriveInfo_FormatsSizesCorrectly()
    {
        var drive = new UsbDriveInfo(
            "E:",
            "SANDISK",
            "NTFS",
            32L * 1024 * 1024 * 1024,
            16L * 1024 * 1024 * 1024);

        Assert.Equal("SANDISK (E:)", drive.DisplayName);
        Assert.Equal("32.0 GB", drive.FormattedTotalSize);
        Assert.Equal("16.0 GB", drive.FormattedFreeSize);
    }

    [Fact]
    public void SafeEject_InvalidDrive_ReturnsHonestFailure()
    {
        // Drive Z: is almost certainly non-existent
        var result = SafeEjector.EjectDrive("Z:");
        Assert.False(result.Success);
        Assert.Contains("Could not access drive", result.Message);
    }
}
