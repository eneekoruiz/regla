import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { formatDateKey, parseDateKey, SPANISH_MONTHS_FULL } from '../../utils/cycleCalculator';
import { predictDayStatus } from '../../services/predictiveEngine';
import type { CyclePhase } from '../../types/cycle';
import { YearViewCalendar } from './YearViewCalendar';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_BEFORE_INITIAL = 3;
const MONTHS_AFTER_INITIAL = 9;
const MONTHS_EXTEND_STEP = 6;
const MAX_TOTAL_MONTHS = 300; // ~25 years combined, a safety ceiling, not a practical limit

function monthKeyAdd(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

export const AppleMonthlyCalendar = ({ onSelectDate, onOpenLegendModal, onOpenCycleSyncing }: {
  onSelectDate: (date: string) => void;
  onOpenLegendModal?: () => void;
  onOpenCycleSyncing?: (phase?: CyclePhase) => void;
}) => {
  const { selectedDate, todayDate, hasEnoughData, logs, isRefugio, cycleStats, resetToToday } = useCycle();
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [initialYear, setInitialYear] = useState(Number(todayDate.slice(0, 4)));
  const todayMonthKey = todayDate.slice(0, 7);
  const [range, setRange] = useState(() => ({
    start: monthKeyAdd(todayMonthKey, -MONTHS_BEFORE_INITIAL),
    end: monthKeyAdd(todayMonthKey, MONTHS_AFTER_INITIAL)
  }));

  const monthKeys = useMemo(() => {
    const keys: string[] = [];
    let cursor = range.start;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      keys.push(cursor);
      if (cursor === range.end) break;
      cursor = monthKeyAdd(cursor, 1);
    }
    return keys;
  }, [range]);

  const sectionRef = useRef<HTMLElement | null>(null);
  const scrollElRef = useRef<HTMLElement | null>(null);
  const stickyHeaderRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prependAdjustRef = useRef<number | null>(null);
  const hasScrolledInitially = useRef(false);
  const [stickyOffset, setStickyOffset] = useState(76);

  // Locate the nearest scrollable ancestor (the app's `.workspace` container) once.
  useEffect(() => {
    let node: HTMLElement | null = sectionRef.current;
    while (node) {
      const style = window.getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
        scrollElRef.current = node;
        break;
      }
      node = node.parentElement;
    }
  }, []);

  const scrollToToday = useCallback((behavior: ScrollBehavior) => {
    monthRefs.current[todayMonthKey]?.scrollIntoView({ behavior, block: 'start' });
  }, [todayMonthKey]);

  // Land on today's month on first mount, before paint, so there's no visible jump.
  useLayoutEffect(() => {
    if (mode === 'month' && !hasScrolledInitially.current && monthRefs.current[todayMonthKey]) {
      hasScrolledInitially.current = true;
      scrollToToday('auto');
    }
  });

  // Measure the sticky header (toggle/Hoy row + weekday row) so month labels dock right beneath it.
  useLayoutEffect(() => {
    if (mode !== 'month') return;
    const measure = () => { if (stickyHeaderRef.current) setStickyOffset(stickyHeaderRef.current.offsetHeight); };
    measure();
    const ro = new ResizeObserver(measure);
    if (stickyHeaderRef.current) ro.observe(stickyHeaderRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [mode]);

  // Extend the loaded month range as the person nears either edge — continuous, Apple-style scroll.
  useEffect(() => {
    if (mode !== 'month') return;
    const io = { root: null, rootMargin: '600px 0px', threshold: 0 };
    const bottomObserver = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) return;
      setRange(prev => {
        if (monthDiff(prev.start, prev.end) >= MAX_TOTAL_MONTHS) return prev;
        return { ...prev, end: monthKeyAdd(prev.end, MONTHS_EXTEND_STEP) };
      });
    }, io);
    const topObserver = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) return;
      setRange(prev => {
        if (monthDiff(prev.start, prev.end) >= MAX_TOTAL_MONTHS) return prev;
        const scrollEl = scrollElRef.current;
        prependAdjustRef.current = scrollEl?.scrollHeight ?? null;
        return { ...prev, start: monthKeyAdd(prev.start, -MONTHS_EXTEND_STEP) };
      });
    }, io);
    if (bottomSentinelRef.current) bottomObserver.observe(bottomSentinelRef.current);
    if (topSentinelRef.current) topObserver.observe(topSentinelRef.current);
    return () => { bottomObserver.disconnect(); topObserver.disconnect(); };
  }, [mode]);

  // After prepending months above the viewport, restore the scroll position so content doesn't jump.
  useLayoutEffect(() => {
    const before = prependAdjustRef.current;
    const scrollEl = scrollElRef.current;
    if (before !== null && scrollEl) {
      scrollEl.scrollTop += scrollEl.scrollHeight - before;
    }
    prependAdjustRef.current = null;
  }, [monthKeys]);

  const select = (date: string) => onSelectDate(date);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const target = parseDateKey(date);
    const weekday = (target.getDay() + 6) % 7;
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
    if (!(event.key in deltas)) return;
    event.preventDefault();
    target.setDate(target.getDate() + deltas[event.key]);
    const key = formatDateKey(target);
    const targetMonthKey = key.slice(0, 7);
    setRange(prev => {
      if (targetMonthKey < prev.start) return { ...prev, start: targetMonthKey };
      if (targetMonthKey > prev.end) return { ...prev, end: targetMonthKey };
      return prev;
    });
    requestAnimationFrame(() => document.getElementById('calendar-day-' + key)?.focus());
  };

  const handleToday = () => {
    resetToToday();
    if (mode === 'year') setMode('month');
    requestAnimationFrame(() => scrollToToday('smooth'));
  };

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] p-0.5 sm:p-1" aria-label="Vista del calendario">
        {(['month', 'year'] as const).map(value => <button type="button" key={value} aria-pressed={mode === value} onClick={() => { setMode(value); if (value === 'year') setInitialYear(Number(todayMonthKey.slice(0, 4))); }} className={`min-h-9 sm:min-h-10 rounded-lg px-3 sm:px-4 text-xs sm:text-sm font-semibold ${mode === value ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'text-[var(--text-primary)]'}`}>{value === 'month' ? 'Mes' : 'Año'}</button>)}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {onOpenLegendModal && <button type="button" onClick={onOpenLegendModal} className="aura-icon-button h-9 w-9 sm:h-10 sm:w-10" aria-label="Ver leyenda de colores"><Info size={16} aria-hidden="true" /></button>}
        <button type="button" onClick={handleToday} className="aura-button min-h-9 sm:min-h-10 rounded-lg px-2.5 sm:px-3 text-xs sm:text-sm"><RotateCcw size={15} aria-hidden="true" />Hoy</button>
      </div>
    </div>
  );

  return <section ref={sectionRef} className="w-full min-w-0 text-[var(--text-primary)]" aria-label="Vista mensual del ciclo">
    {/* Barra superior de navegación y controles: fija en la parte superior, no desaparece al scroll */}
    <div
      ref={stickyHeaderRef}
      className="calendar-sticky-header shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border-b border-[var(--border-subtle)]/50"
    >
      {controls}
      {mode === 'month' && (
        <div className="flex items-center border-t border-[var(--border-subtle)]/50 pt-1" style={{ height: 28 }}>
          {WEEKDAYS.map(day => <span key={day} className="flex-1 text-center text-[11px] sm:text-[12px] font-medium text-[var(--text-secondary)]">{day}</span>)}
        </div>
      )}
    </div>

    {mode === 'year' ? (
      <div className="pt-2">
        <YearViewCalendar
          initialYear={initialYear}
          onSelectMonth={key => { setRange(prev => (key < prev.start || key > prev.end) ? { start: key < prev.start ? key : prev.start, end: key > prev.end ? key : prev.end } : prev); setMode('month'); requestAnimationFrame(() => monthRefs.current[key]?.scrollIntoView({ behavior: 'auto', block: 'start' })); }}
          onSelectDate={select}
          onOpenLegendModal={onOpenLegendModal}
          onOpenCycleSyncing={onOpenCycleSyncing}
        />
      </div>
    ) : (
      <div className="pt-1">
        <div ref={topSentinelRef} aria-hidden="true" style={{ height: 1 }} />
        {monthKeys.map(key => {
          const monthDate = parseDateKey(key + '-01');
          const year = monthDate.getFullYear();
          const month = monthDate.getMonth();
          const offset = (monthDate.getDay() + 6) % 7;
          const length = new Date(year, month + 1, 0).getDate();
          return <div key={key} ref={el => { monthRefs.current[key] = el; }} style={{ scrollMarginTop: stickyOffset }}>
            <h2 className="border-b border-[var(--border-subtle)]/60 bg-[var(--bg-root)] px-0.5 py-1.5 text-sm sm:text-base font-semibold capitalize" aria-live="off">{SPANISH_MONTHS_FULL[month]} {year}</h2>
            <div className="grid grid-cols-7 gap-y-0.5 sm:gap-y-1 pt-1.5 pb-3">
              {Array.from({ length: offset }, (_, index) => <span key={'empty-' + index} aria-hidden="true" />)}
              {Array.from({ length }, (_, index) => {
                const date = formatDateKey(new Date(year, month, index + 1));
                const prediction = predictDayStatus(date, cycleStats, logs);
                const recordedPeriod = Boolean(logs[date]?.isPeriod);
                const period = recordedPeriod || (hasEnoughData && prediction.isPeriod);
                const fertile = hasEnoughData && prediction.isFertileWindow;
                const ovulation = hasEnoughData && prediction.isOvulationDay;
                const hasLog = Boolean(logs[date]);
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
                  ? 'bg-amber-100 text-amber-800 font-medium dark:bg-amber-500/20 dark:text-amber-200'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-chip)]';
                return <div key={date} className="flex items-center justify-center py-0.5">
                  <button type="button" id={'calendar-day-' + date} aria-label={`${parseDateKey(date).toLocaleDateString('es-ES', { dateStyle: 'full' })}${state ? ', ' + state : ''}${hasLog ? ', con registros' : ''}`} aria-current={isToday ? 'date' : undefined} aria-pressed={isSelected} onClick={() => select(date)} onKeyDown={event => moveFocus(event, date)}
                    className={`relative mx-auto flex h-9 w-9 sm:h-9.5 sm:w-9.5 flex-col items-center justify-center rounded-full text-xs sm:text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${color} ${isSelected ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-root)] font-bold scale-105' : ''}`}>
                    <span className={isToday && !recordedPeriod ? 'font-bold underline decoration-2 underline-offset-2' : ''}>{index + 1}</span>
                    {hasLog && <span aria-hidden="true" className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-80" />}
                  </button>
                </div>;
              })}
            </div>
          </div>;
        })}
        <div ref={bottomSentinelRef} aria-hidden="true" style={{ height: 1 }} />
      </div>
    )}
  </section>;
};
