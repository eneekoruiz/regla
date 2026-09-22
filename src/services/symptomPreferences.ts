import type { DailyLog, SymptomItem } from '../types/cycle';

/** Derive favourites from this account's actual records; no extra tracking store. */
export function rankSymptoms(items: readonly SymptomItem[], logs: Record<string, DailyLog>): SymptomItem[] {
  const counts = new Map<string, number>();
  for (const log of Object.values(logs)) for (const symptom of log.symptoms) counts.set(symptom.id, (counts.get(symptom.id) || 0) + 1);
  return [...items].sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
}
