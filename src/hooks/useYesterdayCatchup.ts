import { useMemo } from 'react';
import { useCycle } from './useCycle';
import { hasActivityOnOrBefore, hasDayEntries, shiftDateKey } from '../utils/dailyLog';

/**
 * Única fuente de verdad para el recordatorio de "ayer sin registrar", que
 * comparten la tarjeta principal, el acceso al Confidente y el propio chat.
 */
export function useYesterdayCatchup() {
  const { logs, todayDate, hasEnoughData } = useCycle();
  return useMemo(() => {
    const yesterdayKey = shiftDateKey(todayDate, -1);
    const needsCatchup = hasEnoughData && !hasDayEntries(logs[yesterdayKey]) && hasActivityOnOrBefore(logs, yesterdayKey);
    return { yesterdayKey, needsCatchup };
  }, [logs, todayDate, hasEnoughData]);
}
