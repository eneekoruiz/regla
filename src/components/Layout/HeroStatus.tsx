import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, ClipboardList, Droplets, NotebookPen, Plus, X } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { diffDays, formatDateKey, isDateKey, parseDateKey } from '../../utils/dateKey';

export function HeroStatus({
  onRecordPeriod,
  onOpenLegend,
  onOpenDailyModal
}: {
  onRecordPeriod: () => void;
  onOpenLegend: () => void;
  onOpenDailyModal: () => void;
}) {
  const { currentDayInfo: day, upcomingMilestones, todayDate, selectedDate, cycleStats, settings, updateSettings, logs, hasEnoughData, denyPeriodOnDate } = useCycle();
  const [confirmedEndFeedback, setConfirmedEndFeedback] = useState<string | null>(null);

  const hasCycle = hasEnoughData && day.dayOfCycle > 0;
  const log = logs[selectedDate];
  const isRecorded = Boolean(log?.isPeriod);
  const isIrregular = Boolean(log?.isIrregularBleeding);
  const cycleLength = Math.max(1, Math.round(cycleStats.estimatedCycleLength || settings.averageCycleLength || 28));
  const periodLength = Math.max(1, Math.round(cycleStats.estimatedPeriodLength || settings.averagePeriodLength || 5));
  const isPast = selectedDate < todayDate;
  const isToday = selectedDate === todayDate;
  const isFuture = selectedDate > todayDate;
  const isPeriodDay = Boolean(day.isPeriod || isRecorded);

  const hasValidPeriodStart = Boolean(cycleStats.lastVerifiedPeriodStart && isDateKey(cycleStats.lastVerifiedPeriodStart));
  const elapsedDays = hasCycle && isToday && hasValidPeriodStart
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
  // Exactamente 1 o 2 días después de terminar la regla (solo relevante hoy)
  const isJustFinishedPeriod = isToday && hasCycle && !isPeriodDay && (daysSincePeriodEnd === 1 || daysSincePeriodEnd === 2);
  const daysToNext = typeof daysNext === 'number' && daysNext > 0 ? daysNext : Math.max(1, cycleLength - cycleDay + 1);

  const flowName = log?.flow === 'light' ? 'ligero' : log?.flow === 'medium' ? 'medio' : log?.flow === 'heavy' ? 'abundante' : log?.flow === 'very_heavy' ? 'muy abundante' : log?.flow === 'spotting' ? 'manchado' : 'activo';

  // Anotaciones y síntomas para la fecha seleccionada
  const symptoms = log?.symptoms || [];
  const notes = log?.notes;
  const hasIntimacy = Boolean((log?.intimacyLog && log.intimacyLog.activity !== 'none') || (log?.intimacy && log.intimacy !== 'none'));
  const hasMeds = Boolean(log?.medications && log.medications.some(m => m.taken));
  const hasBbt = Boolean(log?.bbt !== undefined && Number.isFinite(log.bbt));
  const hasQuizResults = Boolean(log?.quizResults && log.quizResults.length > 0);
  const hasAnyAnnotation = symptoms.length > 0 || Boolean(notes) || hasIntimacy || hasMeds || hasBbt || hasQuizResults;

  // Handler para confirmar fin de regla en el día de hoy y recalcular
  const handleConfirmPeriodEndToday = () => {
    if (isRecorded) {
      denyPeriodOnDate(todayDate);
      const realDuration = Math.max(1, cycleDay - 1);
      updateSettings({ averagePeriodLength: realDuration });
      setConfirmedEndFeedback(`¡Fin de regla confirmado! Duró ${realDuration} días y se ha recalculado tu ciclo.`);
    } else {
      const realDuration = lastRecordedPeriodDay > 0 ? lastRecordedPeriodDay : periodLength;
      updateSettings({ averagePeriodLength: realDuration });
      setConfirmedEndFeedback(`¡Fin de regla confirmado! Registrado con ${realDuration} días de duración.`);
    }
  };

  let title = hasCycle ? `Día ${cycleDay} de tu ciclo` : 'Tu primer registro';
  let copy = hasCycle ? `Día ${cycleDay} del ciclo` : 'Anota cuándo empezó tu regla. No necesitas conocer todavía la duración de tu ciclo.';

  if (hasEnoughData && !hasCycle) {
    title = 'Un día de tu historia';
    copy = 'No hay un inicio de ciclo registrado para esta fecha. Tus anotaciones se guardan igualmente.';
  } else if (hasCycle) {
    if (isPast) {
      // Día pasado: confirmación y edición clara sin círculo
      if (isRecorded) {
        title = 'Tuviste la regla este día';
        copy = `Flujo ${flowName} registrado · Día ${cycleDay} del ciclo`;
      } else if (isIrregular) {
        title = 'Sangrado irregular registrado';
        copy = `Flujo ${flowName} · Día ${cycleDay} del ciclo`;
      } else if (day.isPeriod) {
        title = 'Previsión de regla no confirmada';
        copy = 'Había previsión de regla para esta fecha. Confirma si te bajó.';
      } else {
        title = `Día ${cycleDay} de tu ciclo`;
        copy = `Día ${cycleDay} de tu ciclo`;
      }
    } else if (isFuture) {
      if (isPeriodDay) {
        title = 'Periodo estimado';
        copy = 'Previsión de sangrado según tus ciclos habituales.';
      } else {
        title = daysToNext > 1
          ? `Te quedan ${daysToNext} días para la regla`
          : daysToNext === 1
            ? 'Te queda 1 día para la regla'
            : `Día ${cycleDay} de tu ciclo`;
        copy = `Día ${cycleDay} del ciclo`;
      }
    } else {
      // Hoy
      if (isRecorded) {
        title = 'En tu periodo';
        copy = `Ve a tu ritmo · Flujo ${flowName} registrado · Día ${cycleDay} del ciclo`;
      } else if (isPeriodDay) {
        title = 'Periodo estimado para hoy';
        copy = 'Esta fecha es una previsión. Confirma o corrige el sangrado de hoy.';
      } else if (isJustFinishedPeriod) {
        title = 'Tu regla ha terminado';
        copy = `Te faltan ${daysToNext} días para tu próxima regla · Día ${cycleDay} del ciclo`;
      } else if (awaitingPeriod) {
        title = elapsedDays === cycleLength ? 'Fecha estimada: hoy' : 'Tu ciclo tiene su ritmo';
        copy = elapsedDays === cycleLength ? 'La fecha es orientativa. Registra tu regla cuando empiece.' : 'La fecha estimada ha pasado. Registra lo que observas para actualizar tu calendario.';
      } else if (daysToNext > 1) {
        title = `Te quedan ${daysToNext} días para la regla`;
        copy = `Día ${cycleDay} del ciclo`;
      } else if (daysToNext === 1) {
        title = 'Te queda 1 día para la regla';
        copy = `Día ${cycleDay} del ciclo`;
      } else if (daysToNext === 0) {
        title = 'Fecha estimada de regla: hoy';
        copy = `Día ${cycleDay} del ciclo`;
      } else {
        title = 'Tu ciclo tiene su ritmo';
        copy = `Día ${cycleDay} del ciclo`;
      }
    }
  }

  const activeDuration = isPeriodDay ? periodLength : cycleLength;
  const activeDay = isPeriodDay ? Math.min(cycleDay, periodLength) : cycleDay;
  const progress = hasCycle && activeDuration > 0 ? Math.min(1, Math.max(0, activeDay / activeDuration)) : 0;
  const circumference = 2 * Math.PI * 58;
  const showRing = hasCycle && isToday;

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

          {/* Acciones para HOY */}
          {isToday && (
            <div className="hero-quick-actions" style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {isRecorded ? (
                <>
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={onRecordPeriod}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Droplets size={14} style={{ color: 'var(--rose)' }} />
                    Editar flujo
                  </button>
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={handleConfirmPeriodEndToday}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Indicar que hoy ya no tienes regla y recalcular tu ciclo"
                  >
                    <Check size={14} style={{ color: 'var(--accent)' }} />
                    No, hoy se me ha terminado
                  </button>
                </>
              ) : day.isPeriod ? (
                <>
                  <button
                    type="button"
                    className="aura-button sm primary"
                    onClick={onRecordPeriod}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Droplets size={14} />
                    Sí, hoy me ha bajado la regla
                  </button>
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={() => denyPeriodOnDate(todayDate)}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <X size={14} />
                    No, hoy no me ha bajado
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="aura-button sm primary"
                    onClick={onRecordPeriod}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Droplets size={14} />
                    Sí, hoy he tenido la regla
                  </button>
                  {daysSincePeriodEnd > 0 && daysSincePeriodEnd <= 7 && (
                    <button
                      type="button"
                      className="aura-button sm"
                      onClick={handleConfirmPeriodEndToday}
                      style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      title="Confirmar que la regla terminó y recalcular ciclo"
                    >
                      <Check size={14} style={{ color: 'var(--accent)' }} />
                      {confirmedEndFeedback ? '¡Fin de regla confirmado!' : 'Confirmar fin de regla'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Acciones para DÍA PASADO */}
          {isPast && (
            <div className="hero-quick-actions" style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {isRecorded || isIrregular ? (
                <>
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={onRecordPeriod}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Droplets size={14} style={{ color: 'var(--rose)' }} />
                    Editar flujo
                  </button>
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={() => denyPeriodOnDate(selectedDate)}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Quitar registro de regla para esta fecha"
                  >
                    <X size={14} />
                    No tuve regla este día
                  </button>
                </>
              ) : day.isPeriod ? (
                <>
                  <button
                    type="button"
                    className="aura-button sm primary"
                    onClick={onRecordPeriod}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Droplets size={14} />
                    Sí, me bajó la regla
                  </button>
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={() => denyPeriodOnDate(selectedDate)}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Check size={14} />
                    No me bajó
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="aura-button sm"
                  onClick={onRecordPeriod}
                  style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Droplets size={14} style={{ color: 'var(--rose)' }} />
                  ¿Tuviste regla este día?
                </button>
              )}
            </div>
          )}

          {confirmedEndFeedback && (
            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} /> {confirmedEndFeedback}
            </p>
          )}
        </div>

        {/* El círculo solo se muestra en el día de hoy con la cuenta atrás sincronizada */}
        {showRing && (
          <div
            className="cycle-ring hero-prominent-ring"
            role="img"
            aria-label={
              isPeriodDay
                ? `Día ${cycleDay} de regla`
                : daysToNext === 1
                  ? 'Queda 1 día para la regla'
                  : daysToNext > 0
                    ? `Quedan ${daysToNext} días para la regla`
                    : `Día ${cycleDay} del ciclo`
            }
          >
            <svg viewBox="0 0 140 140" aria-hidden="true">
              <circle cx="70" cy="70" r="58" fill="none" stroke="var(--border-subtle)" strokeWidth="8"/>
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke="var(--phase-ink)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * circumference} ${circumference}`}
                transform="rotate(-90 70 70)"
              />
            </svg>
            <span className="cycle-ring-label">
              {isPeriodDay ? (
                <>
                  <span>DÍA</span>
                  <strong className="cycle-ring-day-number">{cycleDay}</strong>
                  <span>de regla</span>
                </>
              ) : awaitingPeriod ? (
                <>
                  <span>ESPERANDO</span>
                  <strong className="cycle-ring-day-number">+{Math.max(1, elapsedDays - cycleLength + 1)}</strong>
                  <span>días</span>
                </>
              ) : daysToNext === 1 ? (
                <>
                  <span>QUEDA</span>
                  <strong className="cycle-ring-day-number">1</strong>
                  <span>día</span>
                </>
              ) : daysToNext > 1 ? (
                <>
                  <span>QUEDAN</span>
                  <strong className="cycle-ring-day-number">{daysToNext}</strong>
                  <span>días</span>
                </>
              ) : (
                <>
                  <span>PREVISIÓN</span>
                  <strong className="cycle-ring-day-number" style={{ fontSize: '1.4rem' }}>Hoy</strong>
                  <span>de regla</span>
                </>
              )}
            </span>
          </div>
        )}

        {/* En días pasados / sin anillo: se aprovecha el espacio derecho para las anotaciones y síntomas */}
        {!showRing && (
          <div className="hero-side-panel">
            <div className="hero-panel-header">
              <ClipboardList size={15} />
              <span>Anotaciones del día</span>
            </div>
            {hasAnyAnnotation ? (
              <div className="hero-panel-body">
                <ul className="hero-symptom-chips">
                  {symptoms.map(s => <li key={s.id}>{s.name}</li>)}
                  {hasIntimacy && <li>Intimidad</li>}
                  {hasMeds && log?.medications?.filter(m => m.taken).map(m => <li key={m.id}>{m.name}</li>)}
                  {hasBbt && <li>{log?.bbt} °C</li>}
                  {hasQuizResults && <li>{log?.quizResults?.length} test{log!.quizResults!.length > 1 ? 's' : ''}</li>}
                </ul>
                {notes && <p className="hero-notes-preview">“{notes}”</p>}
                <button
                  type="button"
                  className="hero-panel-action-btn"
                  onClick={onOpenDailyModal}
                >
                  <NotebookPen size={13} />
                  Ver o editar síntomas
                  <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              <div className="hero-panel-empty">
                <p className="hero-empty-text">Aún no hay anotaciones de síntomas para este día.</p>
                <button
                  type="button"
                  className="aura-button sm hero-add-symptom-btn"
                  onClick={onOpenDailyModal}
                >
                  <Plus size={13} />
                  Anotar síntomas o notas
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* En Hoy: barra inferior con el resumen o aviso de síntomas para este día */}
      {showRing && (
        <div className="hero-today-symptoms-bar">
          {hasAnyAnnotation ? (
            <div className="hero-today-symptoms-content">
              <div className="hero-today-symptoms-left">
                <span className="hero-today-symptoms-label">
                  <ClipboardList size={13}/> Tus anotaciones de hoy:
                </span>
                <ul className="hero-symptom-chips compact">
                  {symptoms.map(s => <li key={s.id}>{s.name}</li>)}
                  {hasIntimacy && <li>Intimidad</li>}
                  {hasMeds && log?.medications?.filter(m => m.taken).map(m => <li key={m.id}>{m.name}</li>)}
                  {hasBbt && <li>{log?.bbt} °C</li>}
                  {hasQuizResults && <li>{log?.quizResults?.length} test{log!.quizResults!.length > 1 ? 's' : ''}</li>}
                </ul>
                {notes && <span className="hero-today-notes-snippet">“{notes}”</span>}
              </div>
              <button type="button" className="hero-today-action-btn" onClick={onOpenDailyModal}>
                <NotebookPen size={13} />
                Editar
              </button>
            </div>
          ) : (
            <div className="hero-today-symptoms-empty">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <ClipboardList size={14} style={{ color: 'var(--text-secondary)' }} />
                <span>Aún no hay anotaciones de síntomas para este día.</span>
              </div>
              <button type="button" className="hero-today-action-btn" onClick={onOpenDailyModal}>
                <Plus size={13} />
                Anotar síntomas
              </button>
            </div>
          )}
        </div>
      )}

      {!hasCycle && (
        <button type="button" className="aura-button primary first-record-button" onClick={onRecordPeriod}>
          Registrar mi regla<ArrowRight size={17}/>
        </button>
      )}
    </motion.div>
  </section>;
}

