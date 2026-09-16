import { useEffect, useState } from 'react';
import { getDataStorageKey } from '../utils/storage';

export function useDailyGreeting(date: string, hasLog: boolean, busy: boolean) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState('');
  let key = `regla_greeted_${date}`;
  let stored = false;
  try { key = getDataStorageKey(key); stored = localStorage.getItem(key) === 'true'; } catch { /* Session dismissal still works. */ }
  useEffect(() => {
    if (hasLog || busy || stored || dismissed === key) return;
    const timer = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(timer);
  }, [hasLog, busy, stored, dismissed, key]);
  const dismiss = () => {
    setDismissed(key); setReady(false);
    try { localStorage.setItem(key, 'true'); } catch { /* Never block closing. */ }
  };
  return { isOpen: ready && !hasLog && !busy && !stored && dismissed !== key, dismiss };
}
