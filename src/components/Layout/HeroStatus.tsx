import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Droplets } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { diffDays, formatDateKey, isDateKey, parseDateKey } from '../../utils/dateKey';


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

  const hasValidPeriodStart = Boolean(cycleStats.lastVerifiedPeriodStart && isDateKey(cycleStats.lastVerifiedPeriodStart));
  const elapsedDays = hasCycle && selectedDate === todayDate && hasValidPeriodStart
    ? diffDays(parseDateKey(cycleStats.lastVerifiedPeriodStart), parseDateKey(todayDate))
    : 0;
  const awaitingPeriod = hasCycle && elapsedDays >= cycleLength && !isRecorded && !isFuture;
  const cycleDay = hasCycle ? awaitingPeriod ? elapsedDays + 1 : day.dayOfCycle : 0;
  const daysNext = upcomingMilestones.daysUntilNextPeriod;

  // Find effective last period day in this cycle to accurately know when the period finished
  let lastRecordedPeriodDay = periodLength;
  if (hasValidPeriodStart) {
    const start = parseDateKey(cycleStats.lastVerifiedPeriodStart);
    let maxRecorded = 0;
    for (let d = 0; d < cycleLength; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + d);
      const k = formatDateKey(dt);
      if (k && logs[k]?.isPeriod) {
        maxRecorded = d + 1;
      }
    }
    if (maxRecorded > 0) {
      lastRecordedPeriodDay = maxRecorded;
    }
  }

  const effectivePeriodEndDay = Math.min(periodLength, lastRecordedPeriodDay);
  const daysSincePeriodEnd = hasCycle && !isPeriodDay && cycleDay > effectivePeriodEndDay ? cycleDay - effectivePeriodEndDay : 0;
  // Exactamente 1 o 2 días después de terminar la regla
  const isJustFinishedPeriod = hasCycle && !isPeriodDay && (daysSincePeriodEnd === 1 || daysSincePeriodEnd === 2);
  const daysToNext = typeof daysNext === 'number' && daysNext > 0 ? daysNext : Math.max(1, cycleLength - cycleDay + 1);

  let title = hasCycle ? `Día ${cycleDay} de tu ciclo` : 'Tu primer registro';
  let copy = hasCycle ? day.phaseName : 'Anota cuándo empezó tu regla. No necesitas conocer todavía la duración de tu ciclo.';

  if (hasEnoughData && !hasCycle) {
    title = 'Un día de tu historia';
    copy = 'No hay un inicio de ciclo registrado para esta fecha. Tus anotaciones se guardan igualmente.';
  } else if (hasCycle) {
    if (isFuture) {
      if (isPeriodDay) {
        title = 'Periodo estimado';
        copy = 'Previsión de sangrado según tus ciclos habituales.';
      } else {
        title = daysToNext > 1
          ? `Te quedan ${daysToNext} días para la regla`
          : daysToNext === 1
            ? 'Te queda 1 día para la regla'
            : `Día ${cycleDay} de tu ciclo`;
        copy = `${day.phaseName} · Previsión del ciclo`;
      }
    } else if (isPeriodDay) {
      title = isRecorded ? 'En tu periodo' : 'Periodo estimado';
      copy = isRecorded ? 'Ve a tu ritmo. Registro de regla activo.' : 'Esta fecha es una previsión. Puedes confirmar o corregir el sangrado en tu registro.';
    } else if (isJustFinishedPeriod) {
      // EXACTAMENTE 1 o 2 días después de terminar la regla
      title = 'Tu regla ha terminado';
      copy = `Te faltan ~${daysToNext} días para tu próxima regla · ${day.phaseName}`;
    } else {
      // Más de 1 o 2 días después de la regla: "Te quedan X días para la regla"
      if (awaitingPeriod) {
        title = elapsedDays === cycleLength ? 'Fecha estimada: hoy' : 'Tu ciclo tiene su ritmo';
        copy = elapsedDays === cycleLength ? 'La fecha es orientativa. Registra tu regla cuando empiece.' : 'La fecha estimada ha pasado. Registra lo que observas para actualizar tu calendario.';
      } else if (daysToNext > 1) {
        title = `Te quedan ${daysToNext} días para la regla`;
        copy = `${day.phaseName} · Día ${cycleDay} del ciclo`;
      } else if (daysToNext === 1) {
        title = 'Te queda 1 día para la regla';
        copy = `${day.phaseName} · Día ${cycleDay} del ciclo`;
      } else if (daysToNext === 0) {
        title = 'Fecha estimada de regla: hoy';
        copy = `${day.phaseName} · Día ${cycleDay} del ciclo`;
      } else {
        title = 'Tu ciclo tiene su ritmo';
        copy = `${day.phaseName} · Día ${cycleDay} del ciclo`;
      }
    }
  }

  const activeDuration = isPeriodDay ? periodLength : cycleLength;
  const activeDay = isPeriodDay ? Math.min(cycleDay, periodLength) : cycleDay;
  const progress = hasCycle && activeDuration > 0 ? Math.min(1, Math.max(0, activeDay / activeDuration)) : 0;


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
          {hasCycle ? (
            <button type="button" className="phase-chip" onClick={onOpenLegend}>
              <span className="phase-dot"/>
              {awaitingPeriod ? 'Ciclo en curso' : day.phaseName}
              <ChevronDown size={14}/>
              <span className="sr-only"> · Entender las fases</span>
            </button>
          ) : (
            <p className="eyebrow"><Droplets size={15}/>Un espacio para ti</p>
          )}
          <h2 id="cycle-title" className="cycle-headline">{title}</h2>
          <p className="cycle-copy">{copy}</p>

          {isJustFinishedPeriod && (
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
