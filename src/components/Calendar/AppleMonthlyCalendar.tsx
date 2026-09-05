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
  return <section className="w-full min-w-0 space-y-4 text-[var(--text-primary)]" aria-label="Vista mensual del ciclo">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] p-1" aria-label="Vista del calendario">
        {(['month', 'year'] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${mode === value ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'text-[var(--text-primary)]'}`}>{value === 'month' ? 'Mes' : 'Año'}</button>)}
      </div>
      <button type="button" onClick={() => { setMode('month'); setMonthKey(todayDate.slice(0, 7)); resetToToday(); }} className="aura-button min-h-11 rounded-lg px-3 text-sm"><RotateCcw size={17} aria-hidden="true" />Hoy</button>
    </div>
    {mode === 'year' ? <YearViewCalendar initialYear={year} onSelectMonth={key => { setMonthKey(key); setMode('month'); }} onSelectDate={select} /> : <>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => navigate(-1)} className="aura-icon-button h-11 w-11 shrink-0" aria-label="Mes anterior"><ChevronLeft size={20} aria-hidden="true" /></button>
        <h2 className="text-center text-base font-semibold capitalize" aria-live="polite">{SPANISH_MONTHS_FULL[month]} {year}</h2>
        <button type="button" onClick={() => navigate(1)} className="aura-icon-button h-11 w-11 shrink-0" aria-label="Mes siguiente"><ChevronRight size={20} aria-hidden="true" /></button>
      </div>
      <div className="grid grid-cols-7 text-center">{WEEKDAYS.map(day => <span key={day} className="py-2 text-[13px] text-[var(--text-secondary)]">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: offset }, (_, index) => <span key={'empty-' + index} aria-hidden="true" />)}
        {Array.from({ length }, (_, index) => {
          const date = formatDateKey(new Date(year, month, index + 1));
          const info = getDayInfo(date);
          const recordedPeriod = Boolean(logs[date]?.isPeriod);
          const period = recordedPeriod || (hasEnoughData && info.isPeriod);
          const fertile = hasEnoughData && info.isFertileWindow;
          const ovulation = hasEnoughData && info.isOvulationDay;
          const state = recordedPeriod ? 'Regla registrada' : period ? 'Regla estimada' : ovulation ? 'Ovulación estimada' : fertile ? 'Ventana fértil estimada' : '';
          const color = isRefugio ? 'bg-[var(--bg-chip)] text-[var(--text-primary)]' : recordedPeriod ? 'bg-[var(--rose)] text-[var(--accent-on)]' : period ? 'bg-[var(--rose-soft)] text-[var(--rose)]' : ovulation ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : fertile ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-chip)]';
          return <button type="button" key={date} id={'calendar-day-' + date} aria-label={`${parseDateKey(date).toLocaleDateString('es-ES', { dateStyle: 'full' })}${state ? ', ' + state : ''}${info.hasLog ? ', con registros' : ''}`} aria-current={date === todayDate ? 'date' : undefined} aria-pressed={date === selectedDate} onClick={() => select(date)} onKeyDown={event => moveFocus(event, date)}
            className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center rounded-lg border-2 text-sm ${color} ${date === selectedDate ? 'border-[var(--accent)] font-bold' : 'border-transparent'}`}>
            <span className={date === todayDate ? 'underline decoration-2 underline-offset-4' : ''}>{index + 1}</span>
            {info.hasLog && <span aria-hidden="true" className="absolute bottom-0.5 h-1 w-1 rounded-full bg-current" />}
          </button>;
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border-subtle)] pt-3 text-[13px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[var(--rose)]" />Regla registrada</span>
        {hasEnoughData && <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[var(--rose-soft)] ring-1 ring-inset ring-[var(--rose)]" />Regla estimada</span>}
        {hasEnoughData && <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[var(--accent)]" />Fertilidad estimada</span>}
        {onOpenLegendModal && <button type="button" onClick={onOpenLegendModal} className="aura-button min-h-11 text-sm"><Info size={17} aria-hidden="true" />Leyenda</button>}
        {onOpenCycleSyncing && <button type="button" onClick={() => onOpenCycleSyncing()} className="aura-button min-h-11 text-sm">Guía de fases</button>}
      </div>
    </>}
  </section>;
};
