'use client';

import { useState, useEffect, useCallback } from 'react';
import { BackendHealth } from '@/types/media';
import { checkBackendHealth } from '@/lib/api';

export function useBackendHealth() {
  const [health, setHealth] = useState<BackendHealth>({
    status: 'unreachable',
  });
  const [isChecking, setIsChecking] = useState(true);

  const check = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await checkBackendHealth();
      setHealth(res);
    } catch {
      setHealth({ status: 'unreachable', lastChecked: Date.now() });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return { health, isChecking, recheck: check };
}
