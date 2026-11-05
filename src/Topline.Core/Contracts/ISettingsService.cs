using Topline.Core.Models;

namespace Topline.Core.Contracts;

public interface ISettingsService
{
    AppSettings Settings { get; }
    void Save();
    void Load();
    event EventHandler<AppSettings>? SettingsChanged;
}

public interface IHistoryService
{
    IReadOnlyList<ActivityHistoryItem> GetHistory();
    void Add(ActivityHistoryItem item);
    void Clear();
    event EventHandler? HistoryUpdated;
}
