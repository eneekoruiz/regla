import { useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Check, Clock, Droplets, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCycle } from '../../hooks/useCycle';
import { useToast } from '../../context/toast';
import type { CycleSnapshot } from '../../services/cycleSnapshot';
import { diffDays, formatDateKey, isDateKey, parseDateKey } from '../../utils/dateKey';
import { shiftDateKey } from '../../utils/dailyLog';
import { hapticSuccess, hapticWarning } from '../../utils/haptics';

/** A partir de cuántos días antes de la fecha prevista se ofrece "se me ha adelantado". */
const EARLY_PERIOD_WINDOW_DAYS = 4;
const END_OF_PERIOD_CONFETTI = { particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#b86e6e', '#f7ecec', '#fdfaf9', '#e3a6a6'] };

function ActionButton({ onClick, icon, children, primary = false, warning = false, title }: {
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
  primary?: boolean;
  warning?: boolean;
  title?: string;
}) {
  const variant = [primary && 'primary', warning && 'is-warning'].filter(Boolean).join(' ');
  return (
    <button type="button" className={`aura-button sm hero-action${variant ? ` ${variant}` : ''}`} onClick={onClick} title={title}>
      {icon}
      {children}
    </button>
  );
}

/**
 * Acciones de un toque que dependen del momento del ciclo: confirmar o
 * corregir la regla de hoy y, en días pasados, añadir o quitar el sangrado.
 */
export function HeroDayActions({ snapshot, isPeriodPrediction, showPastPrompt, onRecordPeriod }: {
  snapshot: CycleSnapshot;
  /** El motor prevé regla para la fecha seleccionada (aunque no esté registrada). */
  isPeriodPrediction: boolean;
  /** Mostrar la pregunta "¿Tuviste regla este día?" (se omite si ya lo pregunta el aviso superior). */
  showPastPrompt: boolean;
  onRecordPeriod: () => void;
}) {
  const { todayDate, selectedDate, cycleStats, settings, updateSettings, logs, denyPeriodOnDate, logBleedingForDate } = useCycle();
  const toast = useToast();
  const [confirmedEndFeedback, setConfirmedEndFeedback] = useState<string | null>(null);
  const [confirmRemovalPending, setConfirmRemovalPending] = useState(false);
  const { cycleDay, isRecorded, isIrregular, awaitingPeriod, daysToNext } = snapshot;

  const confirmPeriodEndToday = () => {
    hapticSuccess();
    confetti(END_OF_PERIOD_CONFETTI);
    if (isRecorded) denyPeriodOnDate(todayDate);
    let message: string;
    if (isDateKey(cycleStats.lastVerifiedPeriodStart)) {
      const start = parseDateKey(cycleStats.lastVerifiedPeriodStart);
      const daysCount = Math.max(1, diffDays(start, parseDateKey(todayDate)));
      // Los días anteriores de esta regla (desde el inicio hasta ayer) quedan registrados.
      for (let offset = 0; offset < daysCount; offset++) {
        const date = new Date(start);
        date.setDate(start.getDate() + offset);
        const key = formatDateKey(date);
        if (key && !logs[key]?.isPeriod) {
          logBleedingForDate(key, { flow: settings.typicalFlowIntensity || 'medium', isCycleStart: offset === 0, isIrregular: false });
        }
      }
      updateSettings({ averagePeriodLength: daysCount });
      message = `¡Fin de regla confirmado! Duró ${daysCount} días y se ha actualizado tu ciclo.`;
    } else {
      const realDuration = Math.max(1, cycleDay - 1);
      updateSettings({ averagePeriodLength: realDuration });
      message = `¡Fin de regla confirmado! Registrado con ${realDuration} días de duración.`;
    }
    setConfirmedEndFeedback(message);
    toast.success(message);
  };

  const removePeriodOnSelectedDate = () => {
    const previousKey = shiftDateKey(selectedDate, -1);
    // Una regla de un único día no es una regla: el día anterior pasa a manchado irregular.
    if (cycleStats.lastVerifiedPeriodStart === previousKey && logs[previousKey]?.isPeriod) {
      logBleedingForDate(previousKey, { flow: 'spotting', isCycleStart: false, isIrregular: true });
      toast.success('El sangrado de ayer se ha cambiado a manchado irregular al durar solo 1 día.');
    } else if (isRecorded || isIrregular) {
      toast.success('Registro eliminado');
    }
    denyPeriodOnDate(selectedDate);
    setConfirmRemovalPending(false);
    hapticWarning();
  };

  const removalButton = (label: string, icon: ReactNode) => confirmRemovalPending
    ? <ActionButton warning onClick={removePeriodOnSelectedDate} icon={<AlertTriangle size={14} aria-hidden="true" />} title="Toca de nuevo para confirmar el borrado">¿Segura? Confirmar</ActionButton>
    : <ActionButton onClick={() => setConfirmRemovalPending(true)} icon={icon} title="Quitar registro de regla para esta fecha">{label}</ActionButton>;

  const todayActions = (): ReactNode => {
    if (isRecorded) {
      return <>
        <ActionButton onClick={onRecordPeriod} icon={<Droplets size={14} aria-hidden="true" />}>Editar flujo</ActionButton>
        <ActionButton onClick={confirmPeriodEndToday} icon={<Check size={14} aria-hidden="true" />} title="Indicar que hoy ya no tienes regla y recalcular tu ciclo">Ya terminó mi regla</ActionButton>
      </>;
    }
    if (awaitingPeriod) {
      return <>
        <ActionButton primary onClick={onRecordPeriod} icon={<Droplets size={14} aria-hidden="true" />}>
          Me ha bajado hoy
        </ActionButton>
        <ActionButton onClick={() => toast.info('Anotado retraso. La fecha estimada se adaptará si tu ciclo se alarga.')} icon={<Clock size={14} aria-hidden="true" />}>Aún no me ha bajado</ActionButton>
      </>;
    }
    if (isPeriodPrediction) {
      const onSecondary = cycleDay > 1
        ? confirmPeriodEndToday
        : () => { denyPeriodOnDate(todayDate); toast.info('Se ha ajustado tu previsión. Te avisaremos en los próximos días.'); };
      return <>
        <ActionButton primary onClick={onRecordPeriod} icon={<Droplets size={14} aria-hidden="true" />}>Confirmar regla</ActionButton>
        <ActionButton onClick={onSecondary} icon={cycleDay > 1 ? <Check size={14} aria-hidden="true" /> : <Clock size={14} aria-hidden="true" />}>
          {cycleDay > 1 ? 'Ya terminó mi regla' : 'Aún no me ha bajado'}
        </ActionButton>
      </>;
    }
    if (daysToNext <= EARLY_PERIOD_WINDOW_DAYS) {
      return <ActionButton onClick={onRecordPeriod} icon={<Droplets size={14} aria-hidden="true" />}>Se me ha adelantado la regla</ActionButton>;
    }
    return null;
  };

  const pastActions = (): ReactNode => {
    if (isRecorded || isIrregular) {
      return <>
        <ActionButton onClick={onRecordPeriod} icon={<Droplets size={14} aria-hidden="true" />}>Editar flujo</ActionButton>
        {removalButton('No tuve regla', <X size={14} aria-hidden="true" />)}
      </>;
    }
    if (isPeriodPrediction) {
      return <>
        <ActionButton primary onClick={onRecordPeriod} icon={<Droplets size={14} aria-hidden="true" />}>Sí tuve regla</ActionButton>
        {removalButton('No tuve regla', <Check size={14} aria-hidden="true" />)}
      </>;
    }
    return showPastPrompt
      ? <ActionButton onClick={onRecordPeriod} icon={<Droplets size={14} aria-hidden="true" />}>¿Tuviste regla este día?</ActionButton>
      : null;
  };

  let actions: ReactNode = null;
  if (snapshot.hasCycle && snapshot.isToday) actions = todayActions();
  else if (snapshot.isPast) actions = pastActions();

  if (!actions && !confirmedEndFeedback) return null;
  return (
    <div className="hero-day-actions">
      {actions && <div className="hero-quick-actions">{actions}</div>}
      {confirmedEndFeedback && (
        <p className="confirmed-feedback-msg">
          <Check size={14} aria-hidden="true" /> {confirmedEndFeedback}
        </p>
      )}
    </div>
  );
}
