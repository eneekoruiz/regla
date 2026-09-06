import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { formatDateKey, SPANISH_MONTHS_FULL } from '../../utils/cycleCalculator';

interface YearViewCalendarProps {
  onSelectMonth: (key: string) => void;
  onSelectDate: (date: string) => void;
  initialYear?: number;
}
export function YearViewCalendar({ onSelectMonth, initialYear }: YearViewCalendarProps) {
  const { todayDate, logs, getDayInfo, hasEnoughData, isRefugio } = useCycle();
  const [year, setYear] = useState(initialYear ?? Number(todayDate.slice(0, 4)));

  useEffect(() => {
    const currentMonthKey = (initialYear && initialYear !== Number(todayDate.slice(0, 4)))
      ? `${year}-01`
      : todayDate.slice(0, 7);
    const targetElement = document.getElementById('year-month-' + currentMonthKey);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [year, todayDate, initialYear]);

  return <section className="space-y-4" aria-label="Vista anual">
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={() => setYear(value => value - 1)} className="aura-icon-button h-11 w-11" aria-label="Año anterior"><ChevronLeft size={20} aria-hidden="true" /></button>
      <h2 className="text-base font-semibold" aria-live="polite">{year}</h2>
      <button type="button" onClick={() => setYear(value => value + 1)} className="aura-icon-button h-11 w-11" aria-label="Año siguiente"><ChevronRight size={20} aria-hidden="true" /></button>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 12 }, (_, month) => {
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        const offset = (new Date(year, month, 1).getDay() + 6) % 7;
        const days = new Date(year, month + 1, 0).getDate();
        const isCurrentMonth = todayDate.startsWith(key);
        return <button type="button" key={key} id={'year-month-' + key} onClick={() => onSelectMonth(key)} aria-label={`Abrir ${SPANISH_MONTHS_FULL[month]} de ${year}`}
          className={`min-w-0 rounded-xl border bg-[var(--bg-card)] p-3 text-left transition-all hover:border-[var(--accent)] ${isCurrentMonth ? 'border-2 border-[var(--accent)] shadow-sm' : 'border-[var(--border-subtle)]'}`}>
          <span className="mb-3 flex min-h-8 items-center justify-between gap-2 text-sm font-semibold capitalize">
            {SPANISH_MONTHS_FULL[month]}
            {isCurrentMonth && <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[12px] font-bold text-[var(--accent)]">Actual</span>}
          </span>
          <span aria-hidden="true" className="grid grid-cols-7 gap-y-1 text-center text-[13px]">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label, index) => <span key={'week-' + index} className="py-1 text-[var(--text-secondary)]">{label}</span>)}
            {Array.from({ length: offset }, (_, index) => <span key={'empty-' + index} />)}
            {Array.from({ length: days }, (_, index) => {
              const date = formatDateKey(new Date(year, month, index + 1));
              const recordedPeriod = Boolean(logs[date]?.isPeriod);
              const period = recordedPeriod || (hasEnoughData && getDayInfo(date).isPeriod);
              return <span key={date} title={recordedPeriod ? 'Regla registrada' : period ? 'Regla estimada' : undefined}
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[12px] ${recordedPeriod && !isRefugio ? 'bg-[var(--rose)] text-[var(--accent-on)] font-semibold' : period && !isRefugio ? 'bg-[var(--rose-soft)] text-[var(--rose)] font-semibold' : 'text-[var(--text-primary)]'} ${date === todayDate ? 'font-bold ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-card)]' : ''}`}>{index + 1}</span>;
            })}
          </span>
        </button>;
      })}
    </div>
  </section>;
}
