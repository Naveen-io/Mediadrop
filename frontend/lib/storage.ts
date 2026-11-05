import { HistoryItem, UserSettings } from '@/types/media';
import { DEFAULT_SETTINGS } from './constants';

const HISTORY_STORAGE_KEY = 'mediadrop_history_v1';
const SETTINGS_STORAGE_KEY = 'mediadrop_settings_v1';
const MAX_HISTORY_ITEMS = 20;

export function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_HISTORY_ITEMS);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveHistoryItem(item: Omit<HistoryItem, 'id' | 'date'>): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = loadHistory();
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 11),
      date: new Date().toISOString(),
    };

    // Keep unique URLs or most recent on top, limited to MAX_HISTORY_ITEMS
    const updated = [newItem, ...existing.filter((i) => i.url !== item.url || i.format !== item.format)].slice(
      0,
      MAX_HISTORY_ITEMS
    );

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}
