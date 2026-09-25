import { Children, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, ClipboardList, NotebookPen } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { useCatchupNotice } from '../../hooks/useCatchupNotice';
import { BIOLOGICAL_LABELS } from '../../services/biologicalMachine';
import { describeCycleDay, phaseBadgeFor } from '../../services/cycleSnapshot';
import { describeHeadline } from '../../services/cycleHeadline';
import { buildCycleDial, closedCycleLengthFor, createDayStatusResolver, weekdayDateLabel } from '../../services/cycleDial';
import { buildPhaseRing } from '../../services/phaseRing';
import type { DailyLog } from '../../types/cycle';
import { hasDayEntries } from '../../utils/dailyLog';
import { CycleDial } from './CycleDial';
import { HeroDayActions } from './HeroDayActions';
import { PhaseRing } from './PhaseRing';
import { CatchupPrompt, CatchupSheet } from './CatchupNotice';

/** Anotaciones de un día pasado cuando no hay ciclo que dibujar (sin regla conocida). */
function PastDayNotes({ log, onOpenDailyModal }: { log: DailyLog; onOpenDailyModal: () => void }) {
  const takenMedications = log.medications?.filter(medication => medication.taken) ?? [];
  const hasIntimacy = Boolean((log.intimacyLog && log.intimacyLog.activity !== 'none') || (log.intimacy && log.intimacy !== 'none'));
  const quizCount = log.quizResults?.length ?? 0;
  return (
    <div className="hero-side-panel is-past">
      <div className="hero-panel-header">
        <ClipboardList size={15} aria-hidden="true" />
        <span>Tus anotaciones</span>
      </div>
      <div className="hero-panel-body">
        <ul className="hero-symptom-chips">
          {log.symptoms.map(symptom => <li key={symptom.id}>{symptom.name}</li>)}
          {hasIntimacy && <li>Intimidad</li>}
          {takenMedications.map(medication => <li key={medication.id}>{medication.name}</li>)}
          {log.bbt !== undefined && Number.isFinite(log.bbt) && <li>{log.bbt} °C</li>}
          {quizCount > 0 && <li>{quizCount} {quizCount > 1 ? 'tests' : 'test'}</li>}
        </ul>
        {log.notes && <p className="hero-notes-preview">"{log.notes}"</p>}
        <button type="button" className="hero-panel-action-btn" onClick={onOpenDailyModal}>
          <NotebookPen size={13} aria-hidden="true" />
          Ver o editar síntomas
          <ArrowRight size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function FirstRecordEmptyState({ onRecordPeriod }: { onRecordPeriod: () => void }) {
  return (
    <div className="first-record-empty-state">
      <div className="first-record-emoji" aria-hidden="true">🌸</div>
      <p className="first-record-headline">Aquí empieza tu historia</p>
      <p className="first-record-sub">
        Tu diario es solo tuyo. Empieza anotando cuándo fue tu última regla y el resto irá solo.
      </p>
      <button type="button" className="aura-button primary first-record-button" onClick={onRecordPeriod}>
        Registrar mi primera regla <ArrowRight size={17} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Tarjeta principal del diario: fase y día del ciclo, la gota que resume el
 * ciclo (y pregunta por los días pendientes) y las acciones del momento. Toda la
 * lógica de qué mostrar vive en modelos puros (cycleSnapshot, cycleDial) y en
 * el hook useCatchupNotice; aquí solo se componen.
 */
export function HeroStatus({
  onRecordPeriod,
  onOpenLegend,
  onOpenDailyModal,
  onOpenRecoveryModal,
  onOpenChat,
  topContent,
  children,
}: {
  onRecordPeriod: () => void;
  onOpenLegend: () => void;
  onOpenDailyModal: () => void;
  onOpenRecoveryModal?: () => void;
  onOpenChat?: () => void;
  topContent?: ReactNode;
  children?: ReactNode;
}) {
  const { currentDayInfo: day, todayDate, selectedDate, cycleStats, settings, logs, hasEnoughData } = useCycle();
  const log = logs[selectedDate];
  const hasAnyLog = hasDayEntries(log);

  const snapshot = useMemo(
    () => describeCycleDay({ day, selectedDate, todayDate, stats: cycleStats, settings, logs, hasEnoughData }),
    [day, selectedDate, todayDate, cycleStats, settings, logs, hasEnoughData],
  );
  const dial = useMemo(() => snapshot.hasCycle
    ? buildCycleDial({
        snapshot,
        selectedDate,
        statusOf: createDayStatusResolver(cycleStats, logs),
        closedCycleLength: closedCycleLengthFor(cycleStats, selectedDate),
      })
    : null, [snapshot, selectedDate, cycleStats, logs]);

  const { notice, dismiss } = useCatchupNotice(snapshot, hasAnyLog, { onRecordPeriod, onOpenDailyModal, onOpenRecoveryModal, onOpenChat });
  const [answeringNotice, setAnsweringNotice] = useState(false);
  // Día que se recorre en la gota, para que el círculo de fases lo marque también.
  const [preview, setPreview] = useState<{ date: string; day: number | null }>({ date: selectedDate, day: null });
  const previewDay = preview.date === selectedDate ? preview.day : null;
  const prompt = notice && (
    <CatchupPrompt notice={notice} placement={dial ? 'bubble' : 'inline'} onOpen={() => setAnsweringNotice(true)} />
  );
  const { title, copy } = describeHeadline(snapshot, dial, hasAnyLog);
  const badge = phaseBadgeFor(day, snapshot, BIOLOGICAL_LABELS.unknown);
  const showFirstRecord = !hasEnoughData && !cycleStats.lastVerifiedPeriodStart && !settings.lastPeriodStartDate;

  return (
    <section
      className={`cycle-summary${snapshot.hasCycle ? '' : ' is-first-record'}`}
      data-phase={snapshot.hasCycle && !snapshot.awaitingPeriod ? day.phase : 'unknown'}
      aria-labelledby="cycle-title"
    >
      <motion.div
        key={selectedDate}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="cycle-summary-motion"
      >
        {!dial && prompt}

        <div className={`cycle-summary-top${dial ? ' has-ring' : ' no-ring'}`}>
          <div className="cycle-summary-header">
            {snapshot.hasCycle && (
              <button
                type="button"
                className={`phase-chip${badge.tone === 'default' ? '' : ` is-${badge.tone}`}`}
                onClick={onOpenLegend}
                title="Toca para ver la leyenda de fases del ciclo"
              >
                <span className="phase-dot" />
                Día {snapshot.cycleDay} · {badge.label}
                <ChevronDown size={13} aria-hidden="true" />
              </button>
            )}
            <h2 id="cycle-title" className="cycle-headline">{title}</h2>
            {copy && <p className="cycle-copy">{copy}</p>}
          </div>

          {dial && (
            <div className="cycle-instruments">
              <CycleDial
                key={selectedDate}
                dial={dial}
                resetLabel={snapshot.isToday ? 'Hoy' : weekdayDateLabel(selectedDate)}
                prompt={prompt}
                onPreviewChange={day => setPreview({ date: selectedDate, day })}
              />
              <PhaseRing ring={buildPhaseRing(dial, snapshot.cycleDay, previewDay)} onOpenLegend={onOpenLegend} />
            </div>
          )}

          <HeroDayActions snapshot={snapshot} isPeriodPrediction={day.isPeriod} showPastPrompt={!notice} onRecordPeriod={onRecordPeriod} />

          {!snapshot.hasCycle && snapshot.isPast && log && hasAnyLog && <PastDayNotes log={log} onOpenDailyModal={onOpenDailyModal} />}
        </div>

        {topContent && <div className="hero-forecast-content">{topContent}</div>}
        {Children.toArray(children).length > 0 && <div className="hero-integrated-record">{children}</div>}
        {showFirstRecord && <FirstRecordEmptyState onRecordPeriod={onRecordPeriod} />}
      </motion.div>
      {notice && <CatchupSheet notice={notice} isOpen={answeringNotice} onClose={() => setAnsweringNotice(false)} onDismiss={dismiss} />}
    </section>
  );
}
