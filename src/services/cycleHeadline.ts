import { weekdayDateLabel, type CycleDial, type DayRange } from './cycleDial';
import type { CycleSnapshot } from './cycleSnapshot';
import { shiftDateKey } from '../utils/dailyLog';

/**
 * Título y subtítulo de la tarjeta principal.
 *
 * Reparto fijo para que se aprenda de un vistazo:
 * - la cabecera habla siempre de fertilidad (ventana fértil y ovulación);
 * - la gota habla siempre de la regla (cuánto falta, qué día es, retraso).
 * En días pasados la cabecera solo sitúa el día dentro del ciclo.
 */
export interface CycleHeadline {
  title: string;
  copy: string;
}

const days = (count: number) => (count === 1 ? '1 día' : `${count} días`);

function dateOfDay(dial: CycleDial, day: number): string {
  return weekdayDateLabel(shiftDateKey(dial.startDate, day - 1));
}

function fertilityHeadline(dial: CycleDial, day: number, fertile: DayRange, ovulationDay: number | null): CycleHeadline {
  if (day < fertile.start) {
    const remaining = fertile.start - day;
    return {
      title: remaining === 1 ? 'Ventana fértil mañana' : `Ventana fértil en ${days(remaining)}`,
      copy: `Empieza el ${dateOfDay(dial, fertile.start)}`,
    };
  }
  if (day > fertile.end) {
    const remaining = dial.length + fertile.start - day;
    return {
      title: `Próxima ventana fértil en ${days(remaining)}`,
      copy: 'Tu ventana fértil de este ciclo ya pasó',
    };
  }
  if (ovulationDay !== null && day < ovulationDay) {
    const remaining = ovulationDay - day;
    return {
      title: remaining === 1 ? 'Ovulación mañana' : `Ovulación en ${days(remaining)}`,
      copy: `Estás en tu ventana fértil, hasta el ${dateOfDay(dial, fertile.end)}`,
    };
  }
  if (day === ovulationDay) {
    return { title: 'Hoy es tu ovulación estimada', copy: 'Tu día más fértil del ciclo' };
  }
  return {
    title: day === fertile.end ? 'Último día fértil' : `Días fértiles hasta el ${dateOfDay(dial, fertile.end)}`,
    copy: ovulationDay === null ? 'Estás en tu ventana fértil' : `Ovulación estimada el ${dateOfDay(dial, ovulationDay)}`,
  };
}

function pastDayCopy(snapshot: CycleSnapshot, hasAnyLog: boolean): string {
  if (snapshot.isRecorded) return `Regla registrada · flujo ${snapshot.flowName}`;
  if (snapshot.isPeriodDay) return 'Regla prevista, sin confirmar';
  return hasAnyLog ? '' : 'Sin registros este día · fase estimada';
}

export function describeHeadline(snapshot: CycleSnapshot, dial: CycleDial | null, hasAnyLog: boolean): CycleHeadline {
  if (!snapshot.hasHistory) {
    return { title: 'Tu primer registro', copy: 'Anota cuándo empezó tu regla. No necesitas conocer todavía la duración de tu ciclo.' };
  }
  if (!snapshot.hasCycle || !dial) {
    return { title: 'Un día de tu historia', copy: 'Tus anotaciones se guardan igualmente.' };
  }
  if (snapshot.isPast) {
    return { title: `Día ${snapshot.cycleDay} de tu ciclo`, copy: pastDayCopy(snapshot, hasAnyLog) };
  }
  if (dial.isLate) {
    return {
      title: snapshot.cycleDay === dial.length + 1 ? 'Hoy podría bajarte la regla' : 'Tu regla se está retrasando',
      copy: 'Recalcularemos tu ciclo cuando llegue',
    };
  }
  const periodNote = snapshot.isRecorded ? `Flujo ${snapshot.flowName} registrado` : null;
  if (!dial.fertile) {
    return { title: 'Tu propio ritmo', copy: periodNote ?? 'Con ciclos irregulares no se estima la ventana fértil' };
  }
  const headline = fertilityHeadline(dial, dial.day, dial.fertile, dial.ovulationDay);
  return periodNote ? { title: headline.title, copy: periodNote } : headline;
}
