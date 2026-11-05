using Topline.Core.Contracts;
using Topline.Core.Models;

namespace Topline.Core.Services;

public class ActivityAggregator : IActivityAggregator
{
    private readonly List<IActivityModule> _modules = [];
    private readonly IHistoryService _historyService;
    private readonly object _lock = new();

    public event EventHandler? ActiveActivityChanged;
    public event EventHandler? AllActivitiesChanged;
    public event EventHandler? RecentActivitiesChanged;

    public ActivityAggregator(IHistoryService historyService)
    {
        _historyService = historyService;
        _historyService.HistoryUpdated += (_, _) => RecentActivitiesChanged?.Invoke(this, EventArgs.Empty);
    }

    public ActivityItem? ActiveActivity
    {
        get
        {
            var activities = AllActiveActivities;
            if (activities.Count == 0) return null;

            // Prioritize: Timer > Download > FileOperation > Playing Media > UsbDevice > Paused Media
            return activities
                .OrderBy(GetPriorityScore)
                .ThenByDescending(a => a.Timestamp)
                .FirstOrDefault();
        }
    }

    private static int GetPriorityScore(ActivityItem item)
    {
        return item.Category switch
        {
            ActivityCategory.Timer when item.Status == ActivityStatus.Active => 10,
            ActivityCategory.Download when item.Status == ActivityStatus.Active => 20,
            ActivityCategory.FileOperation when item.Status == ActivityStatus.Active => 25,
            ActivityCategory.Media when item.Status == ActivityStatus.Active => 30,
            ActivityCategory.UsbDevice when item.Status == ActivityStatus.Active => 40,
            ActivityCategory.Timer when item.Status == ActivityStatus.Paused => 50,
            ActivityCategory.Media when item.Status == ActivityStatus.Paused => 60,
            ActivityCategory.Download when item.Status == ActivityStatus.Completed => 70,
            ActivityCategory.Timer when item.Status == ActivityStatus.Completed => 80,
            _ => 100
        };
    }

    public IReadOnlyList<ActivityItem> AllActiveActivities
    {
        get
        {
            lock (_lock)
            {
                return _modules
                    .Where(m => m.IsEnabled)
                    .SelectMany(m => m.CurrentActivities)
                    .ToList();
            }
        }
    }

    public IReadOnlyList<ActivityHistoryItem> RecentActivities => _historyService.GetHistory();

    public void RegisterModule(IActivityModule module)
    {
        lock (_lock)
        {
            if (!_modules.Contains(module))
            {
                _modules.Add(module);
                module.ActivityChanged += OnModuleActivityChanged;
            }
        }
        NotifyStateChanged();
    }

    public void UnregisterModule(IActivityModule module)
    {
        lock (_lock)
        {
            if (_modules.Remove(module))
            {
                module.ActivityChanged -= OnModuleActivityChanged;
            }
        }
        NotifyStateChanged();
    }

    private void OnModuleActivityChanged(object? sender, ActivityChangedEventArgs e)
    {
        NotifyStateChanged();
    }

    private void NotifyStateChanged()
    {
        ActiveActivityChanged?.Invoke(this, EventArgs.Empty);
        AllActivitiesChanged?.Invoke(this, EventArgs.Empty);
    }

    public async Task ExecutePrimaryActionAsync(ActivityItem item)
    {
        IActivityModule? targetModule;
        lock (_lock)
        {
            targetModule = _modules.FirstOrDefault(m => m.Category == item.Category);
        }

        if (targetModule != null)
        {
            await targetModule.ExecutePrimaryActionAsync(item);
        }
    }

    public async Task ExecuteSecondaryActionAsync(ActivityItem item)
    {
        IActivityModule? targetModule;
        lock (_lock)
        {
            targetModule = _modules.FirstOrDefault(m => m.Category == item.Category);
        }

        if (targetModule != null)
        {
            await targetModule.ExecuteSecondaryActionAsync(item);
        }
    }

    public void AddHistory(ActivityHistoryItem item)
    {
        _historyService.Add(item);
    }

    public void ClearHistory()
    {
        _historyService.Clear();
    }
}
