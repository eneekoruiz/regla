import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Droplets, RotateCcw } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { diffDays, parseDateKey } from '../../utils/dateKey';

export function HeroStatus({
  onRecordPeriod,
  onOpenLegend
}: {
  onRecordPeriod: () => void;
  onOpenLegend: () => void;
}) {
  const { currentDayInfo: day, upcomingMilestones, todayDate, selectedDate, cycleStats, settings, logs, hasEnoughData } = useCycle();
  const [confirmedEnd, setConfirmedEnd] = useState<string | null>(null);

  const hasCycle = hasEnoughData && day.dayOfCycle > 0;
  const isRecorded = Boolean(logs[selectedDate]?.isPeriod);
  const cycleLength = Math.max(1, Math.round(cycleStats.estimatedCycleLength || settings.averageCycleLength || 28));
  const periodLength = Math.max(1, Math.round(cycleStats.estimatedPeriodLength || settings.averagePeriodLength || 5));
  const isFuture = selectedDate > todayDate;
  const isPeriodDay = Boolean(day.isPeriod || isRecorded);

  const elapsedDays = hasCycle && selectedDate === todayDate ? diffDays(parseDateKey(cycleStats.lastVerifiedPeriodStart), parseDateKey(todayDate)) : 0;
  const awaitingPeriod = hasCycle && elapsedDays >= cycleLength && !isRecorded && !isFuture;
  const cycleDay = hasCycle ? awaitingPeriod ? elapsedDays + 1 : day.dayOfCycle : 0;
  const daysNext = upcomingMilestones.daysUntilNextPeriod;

  const isPostPeriod = hasCycle && cycleDay > periodLength && !isPeriodDay;
  const daysToNext = typeof daysNext === 'number' && daysNext > 0 ? daysNext : Math.max(1, cycleLength - cycleDay + 1);

  let title = hasCycle ? `Día ${cycleDay} de tu ciclo` : 'Tu primer registro';
  let copy = hasCycle ? day.phaseName : 'Anota cuándo empezó tu regla. No necesitas conocer todavía la duración de tu ciclo.';

  if (hasEnoughData && !hasCycle) {
    title = 'Un día de tu historia';
    copy = 'No hay un inicio de ciclo registrado para esta fecha. Tus anotaciones se guardan igualmente.';
  } else if (hasCycle) {
    if (isPostPeriod) {
      title = 'Tu regla ha terminado';
      copy = `Te faltan ~${daysToNext} días para tu próxima regla · ${day.phaseName}`;
    } else if (isFuture) {
      if (isPeriodDay) {
        title = 'Periodo estimado';
        copy = 'Previsión de sangrado según tus ciclos habituales.';
      } else {
        title = `Día ${cycleDay} de tu ciclo`;
        copy = `${day.phaseName} · Previsión del ciclo`;
      }
    } else if (isPeriodDay) {
      title = isRecorded ? 'En tu periodo' : 'Periodo estimado';
      copy = isRecorded ? 'Ve a tu ritmo. Aquí puedes llevar un registro de cómo te sientes.' : 'Esta fecha es una previsión. Puedes confirmar o corregir el sangrado en tu registro.';
    } else if (selectedDate === todayDate && typeof daysNext === 'number') {
      title = daysNext > 0 ? `Tu regla, en unos ${daysNext} días` : daysNext === 0 ? 'Fecha estimada: hoy' : 'Tu ciclo tiene su ritmo';
      copy = daysNext < 0 ? 'La fecha estimada ha pasado. Registra lo que observas para actualizar tu calendario.' : `${day.phaseName} · Día ${cycleDay} del ciclo`;
    }
  }

  if (awaitingPeriod) {
    title = elapsedDays === cycleLength ? 'Fecha estimada: hoy' : 'Tu ciclo tiene su ritmo';
    copy = elapsedDays === cycleLength ? 'La fecha es orientativa. Registra tu regla cuando empiece.' : 'La fecha estimada ha pasado. Registra lo que observas para actualizar tu calendario.';
  }

  const activeDuration = isPeriodDay ? periodLength : cycleLength;
  const activeDay = isPeriodDay ? Math.min(cycleDay, periodLength) : cycleDay;
  const progress = hasCycle ? Math.min(1, activeDay / activeDuration) : 0;

  const circumference = 2 * Math.PI * 58;

  return <section className={`cycle-summary${hasCycle ? '' : ' is-first-record'}`} data-phase={hasCycle && !awaitingPeriod ? day.phase : 'unknown'} aria-labelledby="cycle-title">
    <motion.div
      key={selectedDate}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="cycle-summary-motion"
    >
      <div className="cycle-summary-top">
        <div className="cycle-summary-info">
          {hasCycle ? <button type="button" className="phase-chip" onClick={onOpenLegend}><span className="phase-dot"/>{awaitingPeriod ? 'Ciclo en curso' : day.phaseName}<ChevronDown size={14}/><span className="sr-only"> · Entender las fases</span></button> : <p className="eyebrow"><Droplets size={15}/>Un espacio para ti</p>}
          <h2 id="cycle-title" className="cycle-headline">{title}</h2>
          <p className="cycle-copy">{copy}</p>

          {isPostPeriod && (
            <div className="post-period-actions" style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="aura-button sm"
                onClick={onRecordPeriod}
                style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Droplets size={14} style={{ color: 'var(--rose)' }} />
                ¿Aún sangras? Alargar 1 día
              </button>
              <button
                type="button"
                className="aura-button sm"
                onClick={() => setConfirmedEnd(selectedDate)}
                style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Check size={14} style={{ color: 'var(--accent)' }} />
                {confirmedEnd === selectedDate ? '¡Fin confirmado!' : 'Confirmar fin de regla'}
              </button>
            </div>
          )}
        </div>
        {hasCycle && <div className="cycle-ring hero-prominent-ring" role="img" aria-label={`Día ${cycleDay} ${isPeriodDay ? 'del periodo' : 'del ciclo'}; duración estimada ${activeDuration} días`}>
          <svg viewBox="0 0 140 140" aria-hidden="true">
            <circle cx="70" cy="70" r="58" fill="none" stroke="var(--border-subtle)" strokeWidth="8"/>
            <circle cx="70" cy="70" r="58" fill="none" stroke="var(--phase-ink)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${progress * circumference} ${circumference}`} transform="rotate(-90 70 70)"/>
          </svg>
          <span className="cycle-ring-label">
            <span>DÍA</span>
            <strong className="cycle-ring-day-number">{cycleDay}</strong>
            <span>de ~{activeDuration} días</span>
          </span>
        </div>}
      </div>
      {!hasCycle && <button type="button" className="aura-button primary first-record-button" onClick={onRecordPeriod}>Registrar mi regla<ArrowRight size={17}/></button>}
    </motion.div>
  </section>;
}
