import type { CyclePhase, ReproductiveStatus } from '../types/cycle';

/** A calendar estimate is never an observation or a confirmation of ovulation. */
export type BiologicalState =
  | { value: 'unknown' | 'pregnancy' | 'postpartum' | 'menopause' | 'hormonal'; isPeriod: false; isOvulationDay: false; isFertileWindow: false }
  | { value: 'menstrual'; isPeriod: true; isOvulationDay: false; isFertileWindow: false }
  | { value: 'follicular' | 'luteal'; isPeriod: false; isOvulationDay: false; isFertileWindow: boolean }
  | { value: 'ovulation'; isPeriod: false; isOvulationDay: true; isFertileWindow: true };

export interface BiologicalEvidence {
  reproductiveStatus?: ReproductiveStatus;
  hormonal: boolean;
  uncertain: boolean;
  hasAnchor: boolean;
  observedPeriod: boolean | undefined;
  estimatedPeriod: boolean;
  day: number;
  ovulationDay: number;
}

export type BiologicalEvent = { type: 'RECONCILE'; evidence: BiologicalEvidence } | { type: 'RESET' };
export const INITIAL_BIOLOGICAL_STATE = { value: 'unknown', isPeriod: false, isOvulationDay: false, isFertileWindow: false } as const satisfies BiologicalState;

/** All transitions reconcile validated evidence, including edits and historical dates.
 * There is deliberately no timer event that can declare a new observed cycle.
 */
export function biologicalReducer(_state: BiologicalState, event: BiologicalEvent): BiologicalState {
  if (event.type === 'RESET') return INITIAL_BIOLOGICAL_STATE;
  const e = event.evidence;
  if (e.reproductiveStatus && e.reproductiveStatus !== 'cycling') return { ...INITIAL_BIOLOGICAL_STATE, value: e.reproductiveStatus };
  if (e.hormonal) return { ...INITIAL_BIOLOGICAL_STATE, value: 'hormonal' };
  if (e.observedPeriod === true) return { value: 'menstrual', isPeriod: true, isOvulationDay: false, isFertileWindow: false };
  if (!e.hasAnchor || e.uncertain || !Number.isFinite(e.day) || !Number.isFinite(e.ovulationDay)) return INITIAL_BIOLOGICAL_STATE;
  if (e.observedPeriod === undefined && e.estimatedPeriod) return { value: 'menstrual', isPeriod: true, isOvulationDay: false, isFertileWindow: false };
  if (e.day === e.ovulationDay) return { value: 'ovulation', isPeriod: false, isOvulationDay: true, isFertileWindow: true };
  return { value: e.day < e.ovulationDay ? 'follicular' : 'luteal', isPeriod: false, isOvulationDay: false, isFertileWindow: e.day >= e.ovulationDay - 5 && e.day <= e.ovulationDay + 1 };
}

export const BIOLOGICAL_LABELS: Record<CyclePhase, string> = {
  unknown: 'Fase por determinar', menstrual: 'Fase menstrual', follicular: 'Fase folicular',
  ovulation: 'Ovulación estimada', luteal: 'Fase lútea', pregnancy: 'Embarazo registrado',
  postpartum: 'Posparto', menopause: 'Menopausia registrada', hormonal: 'Anticoncepción hormonal',
};
