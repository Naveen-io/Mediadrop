using Topline.Core.Models;

namespace Topline.Core.Contracts;

public class ActivityChangedEventArgs : EventArgs
{
    public ActivityItem? Item { get; }
    public bool IsRemoved { get; }

    public ActivityChangedEventArgs(ActivityItem? item, bool isRemoved = false)
    {
        Item = item;
        IsRemoved = isRemoved;
    }
}

public interface IActivityModule : IDisposable
{
    string Name { get; }
    ActivityCategory Category { get; }
    bool IsEnabled { get; set; }
    IReadOnlyList<ActivityItem> CurrentActivities { get; }

    event EventHandler<ActivityChangedEventArgs>? ActivityChanged;

    Task InitializeAsync(CancellationToken cancellationToken = default);
    Task ExecutePrimaryActionAsync(ActivityItem item);
    Task ExecuteSecondaryActionAsync(ActivityItem item);
}
