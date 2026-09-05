import type { DailyLog } from '../types/cycle';
import { formatDateKey } from './cycleCalculator';

export const generateTestData = (): Record<string, DailyLog> => {
  const logs: Record<string, DailyLog> = {};
  
  const today = new Date();
  // Generate 4 past cycles
  // Cycle lengths: 28, 29, 27, 34 (one irregular)
  const cycleLengths = [28, 29, 27, 34];
  const periodLengths = [5, 5, 4, 6];
  
  let currentDate = new Date();
  currentDate.setDate(today.getDate() - (28 + 29 + 27 + 34) + 15); // Shift so we are midway through current cycle
  
  for (let i = 0; i < cycleLengths.length; i++) {
    const cycleLen = cycleLengths[i];
    const periodLen = periodLengths[i];
    
    for (let p = 0; p < periodLen; p++) {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + p);
      const key = formatDateKey(d);
      
      logs[key] = {
        date: key,
        isPeriod: true,
        flow: p === 0 || p === periodLen - 1 ? 'light' : 'medium',
        symptoms: [],
        recordedAt: new Date().toISOString()
      };
    }
    
    currentDate.setDate(currentDate.getDate() + cycleLen);
  }

  return logs;
};
