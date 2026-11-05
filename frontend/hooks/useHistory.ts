'use client';

import { useState, useEffect, useCallback } from 'react';
import { HistoryItem } from '@/types/media';
import { loadHistory, saveHistoryItem, clearHistory as clearStorage } from '@/lib/storage';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    setIsLoaded(true);
  }, []);

  const addRecord = useCallback((item: Omit<HistoryItem, 'id' | 'date'>) => {
    const updated = saveHistoryItem(item);
    setHistory(updated);
  }, []);

  const clearAll = useCallback(() => {
    clearStorage();
    setHistory([]);
  }, []);

  return {
    history,
    isLoaded,
    addRecord,
    clearAll,
  };
}
