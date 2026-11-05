using Topline.Core.Models;

namespace Topline.Core.Contracts;

public interface IActivityAggregator
{
    ActivityItem? ActiveActivity { get; }
    IReadOnlyList<ActivityItem> AllActiveActivities { get; }
    IReadOnlyList<ActivityHistoryItem> RecentActivities { get; }

    event EventHandler? ActiveActivityChanged;
    event EventHandler? AllActivitiesChanged;
    event EventHandler? RecentActivitiesChanged;

    void RegisterModule(IActivityModule module);
    void UnregisterModule(IActivityModule module);

    Task ExecutePrimaryActionAsync(ActivityItem item);
    Task ExecuteSecondaryActionAsync(ActivityItem item);
    void AddHistory(ActivityHistoryItem item);
    void ClearHistory();
}
