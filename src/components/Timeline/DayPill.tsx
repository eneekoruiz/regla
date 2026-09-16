import { Droplet, Heart, Circle, Check } from 'lucide-react';
import type { CycleDayInfo } from '../../types/cycle';
import { useCycle } from '../../hooks/useCycle';
import { formatDateKey, parseDateKey } from '../../utils/dateKey';

export function DayPill({ day, onSelect }: { day: CycleDayInfo; onSelect: (date: string) => void }) {
  const { logs, settings } = useCycle();
  const hasCycle = Boolean(settings.lastPeriodStartDate || Object.values(logs).some(log => log.isPeriod));
  const recorded = Boolean(logs[day.date]?.isPeriod);
  const hasIntimacy = logs[day.date]?.intimacyLog && logs[day.date]?.intimacyLog?.activity !== 'none';
  const period = hasCycle && day.isPeriod;
  return <button type="button" tabIndex={day.isSelected ? 0 : -1} data-date={day.date} className={`day-pill${period ? ' is-period' : ''}${day.isSelected ? ' is-selected' : ''}${day.isToday ? ' is-today' : ''}`} onClick={() => onSelect(day.date)} onKeyDown={event => {
    const offsets: Record<string, number | undefined> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const next = parseDateKey(day.date); next.setDate(next.getDate() + offset);
    const key = formatDateKey(next); onSelect(key);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-date="${key}"]`)?.focus({ preventScroll: true }));
  }} aria-pressed={day.isSelected} aria-current={day.isToday ? 'date' : undefined} aria-label={`${day.dayOfMonth} de ${day.monthNameFull} de ${day.year}${day.isToday ? ', hoy' : ''}${recorded ? ', regla registrada' : period ? ', periodo estimado' : ''}`}>
    <span className="day-label">{day.isToday ? 'Hoy' : day.dayOfWeekShort}</span>
    <span className="day-number">{day.dayOfMonth}</span>
    <span className="day-mark" aria-hidden="true">{period ? <Droplet size={12} fill={recorded ? 'currentColor' : 'none'}/> : day.hasLog ? <Check size={12}/> : hasCycle && day.isFertileWindow ? <Circle size={7} fill="currentColor"/> : null}{hasIntimacy && <Heart size={10}/>}</span>
  </button>;
}
