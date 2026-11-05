'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserSettings } from '@/types/media';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { loadSettings, saveSettings as persistSettings } from '@/lib/storage';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      persistSettings(merged);
      return merged;
    });
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings,
  };
}
