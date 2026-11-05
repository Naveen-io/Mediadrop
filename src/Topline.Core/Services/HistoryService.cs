using System.Text.Json;
using Topline.Core.Contracts;
using Topline.Core.Models;

namespace Topline.Core.Services;

public class HistoryService : IHistoryService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };

    private readonly string _historyFilePath;
    private readonly ISettingsService _settingsService;
    private readonly List<ActivityHistoryItem> _items = [];
    private readonly object _lock = new();

    public event EventHandler? HistoryUpdated;

    public HistoryService(ISettingsService settingsService, string? customFilePath = null)
    {
        _settingsService = settingsService;

        if (!string.IsNullOrWhiteSpace(customFilePath))
        {
            _historyFilePath = customFilePath;
        }
        else
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var folder = Path.Combine(appData, "Topline");
            Directory.CreateDirectory(folder);
            _historyFilePath = Path.Combine(folder, "history.json");
        }

        Load();
    }

    public IReadOnlyList<ActivityHistoryItem> GetHistory()
    {
        lock (_lock)
        {
            return _items.ToList();
        }
    }

    public void Add(ActivityHistoryItem item)
    {
        if (!_settingsService.Settings.KeepActivityHistory)
            return;

        lock (_lock)
        {
            _items.Insert(0, item);
            var maxItems = Math.Max(5, _settingsService.Settings.MaxHistoryItems);
            while (_items.Count > maxItems)
            {
                _items.RemoveAt(_items.Count - 1);
            }

            Save();
        }

        HistoryUpdated?.Invoke(this, EventArgs.Empty);
    }

    public void Clear()
    {
        lock (_lock)
        {
            _items.Clear();
            Save();
        }

        HistoryUpdated?.Invoke(this, EventArgs.Empty);
    }

    private void Load()
    {
        lock (_lock)
        {
            try
            {
                if (File.Exists(_historyFilePath))
                {
                    var json = File.ReadAllText(_historyFilePath);
                    var loaded = JsonSerializer.Deserialize<List<ActivityHistoryItem>>(json, JsonOptions);
                    if (loaded != null)
                    {
                        _items.Clear();
                        _items.AddRange(loaded);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to load history: {ex.Message}");
            }
        }
    }

    private void Save()
    {
        try
        {
            var dir = Path.GetDirectoryName(_historyFilePath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(_items, JsonOptions);
            File.WriteAllText(_historyFilePath, json);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to save history: {ex.Message}");
        }
    }
}
