import { useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Info } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { formatDateKey, parseDateKey, SPANISH_MONTHS_FULL } from '../../utils/cycleCalculator';
import type { CyclePhase } from '../../types/cycle';
import { YearViewCalendar } from './YearViewCalendar';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const AppleMonthlyCalendar = ({ onSelectDate, onOpenLegendModal, onOpenCycleSyncing }: {
  onSelectDate: (date: string) => void;
  onOpenLegendModal?: () => void;
  onOpenCycleSyncing?: (phase?: CyclePhase) => void;
}) => {
  const { getDayInfo, selectedDate, todayDate, hasEnoughData, logs, isRefugio, resetToToday } = useCycle();
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [monthKey, setMonthKey] = useState(selectedDate.slice(0, 7));
  const monthDate = parseDateKey(monthKey + '-01');
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const offset = (monthDate.getDay() + 6) % 7;
  const length = new Date(year, month + 1, 0).getDate();
  const navigate = (delta: number) => setMonthKey(formatDateKey(new Date(year, month + delta, 1)).slice(0, 7));
  const select = (date: string) => { setMonthKey(date.slice(0, 7)); onSelectDate(date); };
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const target = parseDateKey(date);
    const weekday = (target.getDay() + 6) % 7;
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
    if (!(event.key in deltas)) return;
    event.preventDefault();
    target.setDate(target.getDate() + deltas[event.key]);
    const key = formatDateKey(target);
    setMonthKey(key.slice(0, 7));
    requestAnimationFrame(() => document.getElementById('calendar-day-' + key)?.focus());
  };
  return <section className="w-full min-w-0 space-y-2.5 sm:space-y-3 text-[var(--text-primary)]" aria-label="Vista mensual del ciclo">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] p-0.5 sm:p-1" aria-label="Vista del calendario">
        {(['month', 'year'] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-9 sm:min-h-10 rounded-lg px-3 sm:px-4 text-xs sm:text-sm font-semibold ${mode === value ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'text-[var(--text-primary)]'}`}>{value === 'month' ? 'Mes' : 'Año'}</button>)}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button type="button" onClick={() => { setMode('month'); setMonthKey(todayDate.slice(0, 7)); resetToToday(); }} className="aura-button min-h-9 sm:min-h-10 rounded-lg px-2.5 sm:px-3 text-xs sm:text-sm"><RotateCcw size={15} aria-hidden="true" />Hoy</button>
      </div>
    </div>
    {mode === 'year' ? (
      <YearViewCalendar
        initialYear={year}
        onSelectMonth={key => { setMonthKey(key); setMode('month'); }}
        onSelectDate={select}
        onOpenLegendModal={onOpenLegendModal}
        onOpenCycleSyncing={onOpenCycleSyncing}
      />
    ) : <>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => navigate(-1)} className="aura-icon-button h-9 w-9 sm:h-10 sm:w-10 shrink-0" aria-label="Mes anterior"><ChevronLeft size={18} aria-hidden="true" /></button>
        <h2 className="text-center text-sm sm:text-base font-semibold capitalize" aria-live="polite">{SPANISH_MONTHS_FULL[month]} {year}</h2>
        <button type="button" onClick={() => navigate(1)} className="aura-icon-button h-9 w-9 sm:h-10 sm:w-10 shrink-0" aria-label="Mes siguiente"><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <div className="grid grid-cols-7 text-center">{WEEKDAYS.map(day => <span key={day} className="py-1 sm:py-1.5 text-[12px] sm:text-[13px] text-[var(--text-secondary)]">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-0.5 sm:gap-y-1">
        {Array.from({ length: offset }, (_, index) => <span key={'empty-' + index} aria-hidden="true" />)}
        {Array.from({ length }, (_, index) => {
          const date = formatDateKey(new Date(year, month, index + 1));
          const info = getDayInfo(date);
          const recordedPeriod = Boolean(logs[date]?.isPeriod);
          const period = recordedPeriod || (hasEnoughData && Boolean(info?.isPeriod));
          const fertile = hasEnoughData && Boolean(info?.isFertileWindow);
          const ovulation = hasEnoughData && Boolean(info?.isOvulationDay);
          const state = recordedPeriod ? 'Regla registrada' : period ? 'Regla estimada' : ovulation ? 'Ovulación máxima estimada' : fertile ? 'Ventana fértil estimada' : '';
          const isSelected = date === selectedDate;
          const isToday = date === todayDate;
          const color = isRefugio
            ? 'bg-[var(--bg-chip)] text-[var(--text-primary)]'
            : recordedPeriod
            ? 'bg-[var(--rose)] text-[var(--accent-on)] font-semibold shadow-sm'
            : period
            ? 'bg-[var(--rose-soft)] text-[var(--rose)] font-semibold'
            : ovulation
            ? 'bg-amber-400 text-amber-950 font-bold shadow-sm ring-2 ring-amber-400/70'
            : fertile
            ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
            : 'text-[var(--text-primary)] hover:bg-[var(--bg-chip)]';
          return <div key={date} className="flex items-center justify-center py-0.5">
            <button type="button" id={'calendar-day-' + date} aria-label={`${parseDateKey(date).toLocaleDateString('es-ES', { dateStyle: 'full' })}${state ? ', ' + state : ''}${info?.hasLog ? ', con registros' : ''}`} aria-current={isToday ? 'date' : undefined} aria-pressed={isSelected} onClick={() => select(date)} onKeyDown={event => moveFocus(event, date)}
              className={`relative mx-auto flex h-9 w-9 sm:h-9.5 sm:w-9.5 flex-col items-center justify-center rounded-full text-xs sm:text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${color} ${isSelected ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-root)] font-bold scale-105' : ''}`}>
              <span className={isToday && !recordedPeriod ? 'font-bold underline decoration-2 underline-offset-2' : ''}>{index + 1}</span>
              {info?.hasLog && <span aria-hidden="true" className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-80" />}
            </button>
          </div>;
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--border-subtle)] pt-2.5 text-xs sm:text-[13px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--rose)]" />Regla registrada</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--rose-soft)] ring-1 ring-inset ring-[var(--rose)]" />Regla estimada</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-xs" />Ovulación máxima</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]" />Ventana fértil</span>
        {onOpenLegendModal && <button type="button" onClick={onOpenLegendModal} className="aura-button min-h-8 px-2.5 py-1 text-xs"><Info size={14} aria-hidden="true" />Leyenda</button>}
        {onOpenCycleSyncing && <button type="button" onClick={() => onOpenCycleSyncing()} className="aura-button min-h-8 px-2.5 py-1 text-xs">Guía de fases</button>}
      </div>
    </>}
  </section>;
};
