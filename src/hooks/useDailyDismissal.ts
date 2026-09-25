import { useCallback, useState } from 'react';
import { getDataStorageKey } from '../utils/storage';

function readDismissedDate(storageKey: string): string | null {
  try {
    return localStorage.getItem(getDataStorageKey(storageKey));
  } catch {
    // Sin acceso al almacenamiento el aviso simplemente vuelve a mostrarse.
    return null;
  }
}

function writeDismissedDate(storageKey: string, dateKey: string): void {
  try {
    localStorage.setItem(getDataStorageKey(storageKey), dateKey);
  } catch {
    // El cierre sigue valiendo durante esta sesión gracias al estado en memoria.
  }
}

/**
 * Un aviso que la usuaria puede cerrar "por hoy": se recuerda qué fecha se
 * cerró (por cuenta y por tipo de aviso), así que al día siguiente vuelve a
 * aparecer si sigue siendo relevante, sin acumular claves en el almacenamiento.
 */
export function useDailyDismissal(noticeId: string | null, dateKey: string): [boolean, () => void] {
  const storageKey = noticeId ? `aura_notice_dismissed_${noticeId}` : null;
  const [sessionDismissals, setSessionDismissals] = useState<Record<string, string>>({});
  const dismissedOn = storageKey ? sessionDismissals[storageKey] ?? readDismissedDate(storageKey) : null;
  const dismiss = useCallback(() => {
    if (!storageKey) return;
    setSessionDismissals(previous => ({ ...previous, [storageKey]: dateKey }));
    writeDismissedDate(storageKey, dateKey);
  }, [storageKey, dateKey]);
  return [dismissedOn === dateKey, dismiss];
}
