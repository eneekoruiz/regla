import { CalendarPlus, Check, MessageCircle } from 'lucide-react';
import { useCycle } from './useCycle';
import { useToast } from '../context/toast';
import { useDailyDismissal } from './useDailyDismissal';
import { useYesterdayCatchup } from './useYesterdayCatchup';
import type { PastCatchupNotice } from '../components/Layout/PastCatchupBanner';
import type { CycleSnapshot } from '../services/cycleSnapshot';
import { diffDays, parseDateKey } from '../utils/dateKey';
import { hapticSuccess } from '../utils/haptics';

/** Espera a que cambie la fecha seleccionada antes de abrir el registro de ese día. */
const OPEN_AFTER_DATE_CHANGE_MS = 50;
const MISSED_PERIOD_GRACE_DAYS = 10;
const RECENT_PAST_DAYS = 3;
const CALM_DAY_SYMPTOM = { id: 'calm_day', name: 'Día normal sin molestias', category: 'general', emoji: '✨' } as const;

interface CatchupHandlers {
  onRecordPeriod: () => void;
  onOpenDailyModal: () => void;
  onOpenRecoveryModal?: () => void;
  onOpenChat?: () => void;
}

function pastDayLabel(daysAgo: number): string {
  if (daysAgo === 1) return 'Ayer';
  if (daysAgo === 2) return 'Antes de ayer';
  return `Hace ${daysAgo} días`;
}

/**
 * Decide qué recordatorio de "ponte al día" merece la pena mostrar (como
 * mucho uno, el más relevante) y lo deja listo para resolverse con un toque.
 */
export function useCatchupNotice(snapshot: CycleSnapshot, hasAnyLog: boolean, handlers: CatchupHandlers) {
  const { selectedDate, todayDate, setSelectedDate, logMultipleSymptoms } = useCycle();
  const { yesterdayKey, needsCatchup } = useYesterdayCatchup();
  const toast = useToast();

  let notice: PastCatchupNotice | null = null;
  if (snapshot.likelyMissedPeriod) {
    notice = {
      id: 'missed-period',
      tone: 'gold',
      message: '¿Te bajó la regla el mes pasado?',
      detail: `Hace más de ${snapshot.cycleLength + MISSED_PERIOD_GRACE_DAYS} días de tu último registro.`,
      actions: [{ label: 'Completar', icon: <CalendarPlus size={14} aria-hidden="true" />, onClick: () => handlers.onOpenRecoveryModal?.() }],
    };
  } else if (snapshot.isToday && needsCatchup) {
    notice = {
      id: 'yesterday',
      tone: 'urgent',
      message: 'Ayer quedó sin registrar.',
      detail: '¿Qué tal fue?',
      actions: [
        {
          label: 'Estuve bien',
          icon: <Check size={14} aria-hidden="true" />,
          onClick: () => {
            logMultipleSymptoms(yesterdayKey, [{ ...CALM_DAY_SYMPTOM }]);
            hapticSuccess();
            toast.success('Anotado: ayer fue un día tranquilo');
          },
        },
        {
          label: 'Anotar ayer',
          onClick: () => {
            setSelectedDate(yesterdayKey);
            window.setTimeout(handlers.onOpenDailyModal, OPEN_AFTER_DATE_CHANGE_MS);
          },
        },
      ],
      link: handlers.onOpenChat
        ? { label: 'Contárselo al Confidente', icon: <MessageCircle size={14} aria-hidden="true" />, onClick: handlers.onOpenChat }
        : undefined,
    };
  } else if (snapshot.isPast && !hasAnyLog) {
    const daysAgo = diffDays(parseDateKey(selectedDate), parseDateKey(todayDate));
    notice = {
      id: 'past-day',
      tone: 'calm',
      message: daysAgo <= RECENT_PAST_DAYS ? `${pastDayLabel(daysAgo)} sin registrar.` : 'Día sin registros.',
      detail: '¿Tuviste la regla o algún síntoma?',
      actions: [
        { label: 'Anotar regla', onClick: handlers.onRecordPeriod },
        { label: 'Anotar síntomas', onClick: handlers.onOpenDailyModal },
      ],
    };
  }

  const dismissalDate = notice?.id === 'past-day' ? selectedDate : todayDate;
  const [isDismissed, dismiss] = useDailyDismissal(notice?.id ?? null, dismissalDate);
  return { notice: isDismissed ? null : notice, dismiss };
}
