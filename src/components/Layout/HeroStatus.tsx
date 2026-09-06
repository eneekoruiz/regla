import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, ClipboardList, Droplets } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { diffDays, formatDateKey, parseDateKey } from '../../utils/dateKey';

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

  // Day annotations info (symptoms, notes, intimacy)
  const currentLog = logs[selectedDate];
  const symptomsCount = currentLog?.symptoms?.length || 0;
  const hasDayNotes = Boolean(currentLog?.notes?.trim());
  const hasDayIntimacy = Boolean((currentLog?.intimacy && currentLog.intimacy !== 'none') || (currentLog?.intimacyLog?.activity && currentLog.intimacyLog.activity !== 'none'));
  const hasDayBbt = currentLog?.bbt !== undefined;
  const hasDayMedications = Boolean(currentLog?.medications?.some(m => m.taken));
  const hasDayAnnotations = symptomsCount > 0 || hasDayNotes || hasDayIntimacy || hasDayBbt || hasDayMedications;

  // Find effective last period day in this cycle to accurately know when the period finished
  let lastRecordedPeriodDay = periodLength;
  if (cycleStats.lastVerifiedPeriodStart) {
    const start = parseDateKey(cycleStats.lastVerifiedPeriodStart);
    let maxRecorded = 0;
    for (let d = 0; d < cycleLength; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + d);
      const k = formatDateKey(dt);
      if (logs[k]?.isPeriod) {
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

  const symptomsStatusSummary = hasDayAnnotations
    ? (symptomsCount > 0 ? `${symptomsCount} síntoma${symptomsCount > 1 ? 's' : ''} registrado${symptomsCount > 1 ? 's' : ''}` : 'Anotaciones registradas')
    : 'Aún no hay anotaciones de síntomas para este día';

  let title = hasCycle ? `Día ${cycleDay} de tu ciclo` : 'Tu primer registro';
  let copy = hasCycle ? day.phaseName : 'Anota cuándo empezó tu regla. No necesitas conocer todavía la duración de tu ciclo.';

  if (hasEnoughData && !hasCycle) {
    title = 'Un día de tu historia';
    copy = isFuture
      ? 'No hay un inicio de ciclo registrado para esta fecha.'
      : `${symptomsStatusSummary}. Tus anotaciones se guardan igualmente.`;
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
      copy = `${symptomsStatusSummary} · ${isRecorded ? 'Día de regla registrado.' : 'Previsión de sangrado.'}`;
    } else if (isJustFinishedPeriod) {
      // EXACTAMENTE 1 o 2 días después de terminar la regla
      title = 'Tu regla ha terminado';
      copy = `${symptomsStatusSummary} · Te faltan ~${daysToNext} días para tu próxima regla`;
    } else {
      // Más de 1 o 2 días después de la regla: "Te quedan X días para la regla"
      if (awaitingPeriod) {
        title = elapsedDays === cycleLength ? 'Fecha estimada: hoy' : 'Tu ciclo tiene su ritmo';
        copy = `${symptomsStatusSummary} · ${elapsedDays === cycleLength ? 'La fecha es orientativa. Registra tu regla cuando empiece.' : 'La fecha estimada ha pasado. Registra lo que observes.'}`;
      } else if (daysToNext > 1) {
        title = `Te quedan ${daysToNext} días para la regla`;
        copy = `${day.phaseName} · ${symptomsStatusSummary}`;
      } else if (daysToNext === 1) {
        title = 'Te queda 1 día para la regla';
        copy = `${day.phaseName} · ${symptomsStatusSummary}`;
      } else if (daysToNext === 0) {
        title = 'Fecha estimada de regla: hoy';
        copy = `${day.phaseName} · ${symptomsStatusSummary}`;
      } else {
        title = 'Tu ciclo tiene su ritmo';
        copy = `${day.phaseName} · ${symptomsStatusSummary}`;
      }
    }
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
          <div className="cycle-chips-line" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {hasCycle ? (
              <button type="button" className="phase-chip" onClick={onOpenLegend} style={{ margin: 0 }}>
                <span className="phase-dot"/>
                {awaitingPeriod ? 'Ciclo en curso' : day.phaseName}
                <ChevronDown size={14}/>
                <span className="sr-only"> · Entender las fases</span>
              </button>
            ) : (
              <p className="eyebrow" style={{ margin: 0 }}><Droplets size={15}/>Un espacio para ti</p>
            )}
            {!isFuture && (
              <span className={`day-annotation-chip ${hasDayAnnotations ? 'has-data' : ''}`}>
                {hasDayAnnotations ? <Check size={13} /> : <ClipboardList size={13} />}
                {hasDayAnnotations
                  ? (symptomsCount > 0 ? `${symptomsCount} síntoma${symptomsCount > 1 ? 's' : ''}` : 'Anotaciones')
                  : 'Aún no hay anotaciones de síntomas'}
              </span>
            )}
          </div>
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
