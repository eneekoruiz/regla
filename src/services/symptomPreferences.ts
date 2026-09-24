import type { DailyLog, SymptomItem } from '../types/cycle';

/** Derive favourites from this account's actual records; no extra tracking store. */
export function rankSymptoms(items: readonly SymptomItem[], logs: Record<string, DailyLog>): SymptomItem[] {
  const counts = new Map<string, number>();
  for (const log of Object.values(logs)) for (const symptom of log.symptoms) counts.set(symptom.id, (counts.get(symptom.id) || 0) + 1);
  return [...items].sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
}

/**
 * Detect the user's top frequent symptoms (minimum 2 occurrences across logs).
 * Returns a combo of 2-3 symptoms commonly logged together.
 */
export function getFrequentSymptomCombo(logs: Record<string, DailyLog>, limit = 3): SymptomItem[] {
  const counts = new Map<string, { count: number; symptom: SymptomItem }>();
  for (const log of Object.values(logs)) {
    if (!log.symptoms) continue;
    for (const symptom of log.symptoms) {
      if (symptom.id === 'calm_day') continue;
      const existing = counts.get(symptom.id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(symptom.id, { count: 1, symptom });
      }
    }
  }

  return Array.from(counts.values())
    .filter(item => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(item => item.symptom);
}
