import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { formatDateKey, SPANISH_MONTHS_FULL } from '../../utils/cycleCalculator';

interface YearViewCalendarProps {
  onSelectMonth: (key: string) => void;
  onSelectDate: (date: string) => void;
  initialYear?: number;
  onOpenLegendModal?: () => void;
  onOpenCycleSyncing?: () => void;
}

export function YearViewCalendar({
  onSelectMonth,
  onSelectDate,
  initialYear,
  onOpenLegendModal,
  onOpenCycleSyncing
}: YearViewCalendarProps) {
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

  return (
    <section className="space-y-4" aria-label="Vista anual">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setYear(value => value - 1)}
          className="aura-icon-button h-11 w-11"
          aria-label="Año anterior"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <h2 className="text-base font-semibold" aria-live="polite">{year}</h2>
        <button
          type="button"
          onClick={() => setYear(value => value + 1)}
          className="aura-icon-button h-11 w-11"
          aria-label="Año siguiente"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Quick legend bar at the top of the annual calendar for immediate reference on mobile & desktop */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 text-xs text-[var(--text-secondary)] shadow-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--rose)]" />
          Regla registrada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--rose-soft)] ring-1 ring-inset ring-[var(--rose)]" />
          Regla estimada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-xs" />
          Ovulación
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]" />
          Ventana fértil
        </span>
        {onOpenLegendModal && (
          <button
            type="button"
            onClick={onOpenLegendModal}
            className="aura-button min-h-7 px-2 py-0.5 text-xs text-[var(--text-primary)] hover:border-[var(--accent)]"
          >
            <Info size={13} aria-hidden="true" />
            Leyenda
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }, (_, month) => {
          const key = `${year}-${String(month + 1).padStart(2, '0')}`;
          const offset = (new Date(year, month, 1).getDay() + 6) % 7;
          const days = new Date(year, month + 1, 0).getDate();
          const isCurrentMonth = todayDate.startsWith(key);

          return (
            <div
              key={key}
              id={'year-month-' + key}
              onClick={() => onSelectMonth(key)}
              className={`min-w-0 rounded-xl border bg-[var(--bg-card)] p-3 text-left transition-all ${
                isCurrentMonth ? 'border-2 border-[var(--accent)] shadow-sm' : 'border-[var(--border-subtle)] hover:border-[var(--accent)]'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMonth(key);
                }}
                aria-label={`Abrir ${SPANISH_MONTHS_FULL[month]} de ${year}`}
                className="mb-3 flex w-full min-h-8 items-center justify-between gap-2 text-sm font-semibold capitalize hover:text-[var(--accent)] transition-colors text-left cursor-pointer"
              >
                <span>{SPANISH_MONTHS_FULL[month]}</span>
                {isCurrentMonth && (
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[12px] font-bold text-[var(--accent)]">
                    Actual
                  </span>
                )}
              </button>

              <div className="grid grid-cols-7 gap-y-1 text-center text-[13px]">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label, index) => (
                  <span key={'week-' + index} className="py-1 text-[var(--text-secondary)] text-[11px] font-medium">
                    {label}
                  </span>
                ))}
                {Array.from({ length: offset }, (_, index) => (
                  <span key={'empty-' + index} aria-hidden="true" />
                ))}
                {Array.from({ length: days }, (_, index) => {
                  const date = formatDateKey(new Date(year, month, index + 1));
                  const info = getDayInfo(date);
                  const recordedPeriod = Boolean(logs[date]?.isPeriod);
                  const period = recordedPeriod || (hasEnoughData && info.isPeriod);
                  const fertile = hasEnoughData && info.isFertileWindow;
                  const ovulation = hasEnoughData && info.isOvulationDay;
                  const isToday = date === todayDate;

                  const state = recordedPeriod
                    ? 'Regla registrada'
                    : period
                    ? 'Regla estimada'
                    : ovulation
                    ? 'Ovulación máxima'
                    : fertile
                    ? 'Ventana fértil'
                    : '';

                  const color = isRefugio
                    ? 'text-[var(--text-primary)] hover:bg-[var(--bg-chip)]'
                    : recordedPeriod
                    ? 'bg-[var(--rose)] text-[var(--accent-on)] font-semibold shadow-xs'
                    : period
                    ? 'bg-[var(--rose-soft)] text-[var(--rose)] font-semibold'
                    : ovulation
                    ? 'bg-amber-400 text-amber-950 font-bold shadow-xs ring-1 ring-amber-400/80'
                    : fertile
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-chip)]';

                  return (
                    <button
                      type="button"
                      key={date}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDate(date);
                        onSelectMonth(key);
                      }}
                      title={state || undefined}
                      aria-label={`${index + 1} de ${SPANISH_MONTHS_FULL[month]}${state ? ', ' + state : ''}`}
                      className={`relative mx-auto flex h-7 w-7 flex-col items-center justify-center rounded-full text-[12px] transition-all cursor-pointer ${color} ${
                        isToday ? 'font-bold ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-card)]' : ''
                      }`}
                    >
                      <span>{index + 1}</span>
                      {info.hasLog && (
                        <span aria-hidden="true" className="absolute bottom-0.5 h-1 w-1 rounded-full bg-current opacity-70" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick legend & actions at the bottom of the annual view */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border-subtle)] pt-3 text-[13px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[var(--rose)]" />
          Regla registrada
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[var(--rose-soft)] ring-1 ring-inset ring-[var(--rose)]" />
          Regla estimada
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-400 shadow-xs" />
          Ovulación máxima
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]" />
          Ventana fértil
        </span>
        {onOpenLegendModal && (
          <button type="button" onClick={onOpenLegendModal} className="aura-button min-h-11 text-sm">
            <Info size={17} aria-hidden="true" />
            Leyenda
          </button>
        )}
        {onOpenCycleSyncing && (
          <button type="button" onClick={onOpenCycleSyncing} className="aura-button min-h-11 text-sm">
            Guía de fases
          </button>
        )}
      </div>
    </section>
  );
}
