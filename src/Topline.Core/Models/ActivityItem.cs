namespace Topline.Core.Models;

public enum ActivityCategory
{
    Media,
    Download,
    FileOperation,
    Timer,
    UsbDevice,
    System
}

public enum ActivityStatus
{
    Idle,
    Active,
    Paused,
    Completed,
    Failed
}

public record ActivityAction(
    string Id,
    string Label,
    string? IconGlyph = null,
    bool IsPrimary = false);

public class ActivityItem
{
    public required string Id { get; init; }
    public required ActivityCategory Category { get; init; }
    public required string Title { get; set; }
    public string? Subtitle { get; set; }
    public string? IconGlyph { get; set; }
    public ActivityStatus Status { get; set; } = ActivityStatus.Active;
    public double? Progress { get; set; } // 0.0 to 1.0, or null
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.Now;
    
    // Quick Actions
    public string? PrimaryActionLabel { get; set; }
    public string? PrimaryActionGlyph { get; set; }
    public bool CanExecutePrimaryAction { get; set; } = true;

    public string? SecondaryActionLabel { get; set; }
    public string? SecondaryActionGlyph { get; set; }
    public bool CanExecuteSecondaryAction { get; set; } = true;

    // Optional metadata
    public string? TargetPath { get; set; }
    public object? Tag { get; set; }

    public ActivityItem Clone()
    {
        return (ActivityItem)MemberwiseClone();
    }
}
