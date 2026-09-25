import type { CycleDial } from './cycleDial';

/**
 * Círculo de fases (solo cuando hay sitio, en el ordenador): el mismo ciclo
 * que la gota, dividido en sus fases con la duración real de cada una. Su
 * centro responde a otra pregunta que la gota: en qué fase y día estás.
 */

type PhaseKind = 'period' | 'follicular' | 'fertile' | 'luteal' | 'unknown';

interface PhaseSegment {
  kind: PhaseKind;
  start: number;
  end: number;
}

export interface PhaseRing {
  length: number;
  /** Día marcado en el círculo (el consultado o el que se está recorriendo en la gota). */
  day: number;
  /** Con retraso, el marcador espera al inicio del círculo, como en la gota. */
  isLate: boolean;
  segments: PhaseSegment[];
  ovulationDay: number | null;
  active: PhaseKind;
  kicker: string;
  value: string;
  caption: string;
  summary: string;
}

const KICKERS: Record<PhaseKind, string> = {
  period: 'Regla',
  follicular: 'Fase folicular',
  fertile: 'Ventana fértil',
  luteal: 'Fase lútea',
  unknown: 'Tu ciclo',
};

function segmentsOf(dial: CycleDial): PhaseSegment[] {
  const segments: PhaseSegment[] = [];
  const push = (kind: PhaseKind, start: number, end: number) => {
    if (end >= start) segments.push({ kind, start, end });
  };
  const periodEnd = dial.period?.end ?? 0;
  push('period', 1, periodEnd);
  if (!dial.fertile) {
    push('unknown', periodEnd + 1, dial.length);
    return segments;
  }
  const fertileStart = Math.max(dial.fertile.start, periodEnd + 1);
  push('follicular', periodEnd + 1, fertileStart - 1);
  push('fertile', fertileStart, dial.fertile.end);
  push('luteal', Math.max(dial.fertile.end, periodEnd) + 1, dial.length);
  return segments;
}

export function buildPhaseRing(dial: CycleDial, cycleDay: number, previewDay: number | null = null): PhaseRing {
  const segments = segmentsOf(dial);
  const day = previewDay ?? dial.day;
  const isLate = dial.isLate && previewDay === null;
  const active = segments.find(segment => day >= segment.start && day <= segment.end)?.kind ?? 'unknown';
  const isOvulation = active === 'fertile' && dial.ovulationDay === day;

  if (isLate) {
    return {
      length: dial.length, day, isLate, segments, ovulationDay: dial.ovulationDay, active,
      kicker: 'Retraso',
      value: String(cycleDay),
      caption: `días de ciclo (sueles tener ${dial.length})`,
      summary: `Día ${cycleDay} del ciclo: tu regla se está retrasando.`,
    };
  }
  const kicker = isOvulation ? 'Ovulación estimada' : KICKERS[active];
  return {
    length: dial.length, day, isLate, segments, ovulationDay: dial.ovulationDay, active,
    kicker,
    value: String(day),
    caption: `de ${dial.length} días`,
    summary: `${kicker}: día ${day} de ${dial.length} de tu ciclo.`,
  };
}
