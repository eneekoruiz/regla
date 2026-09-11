import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, ClipboardList, Clock, Droplets, NotebookPen, Plus, X, AlertTriangle, Sparkles, RotateCcw } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { useToast } from '../../context/toast';
import { diffDays, formatDateKey, isDateKey, parseDateKey } from '../../utils/dateKey';
import { calculateUpcomingMilestones } from '../../services/predictiveEngine';

export function HeroStatus({
  onRecordPeriod,
  onOpenLegend,
  onOpenDailyModal,
  onOpenRecoveryModal,
  children
}: {
  onRecordPeriod: () => void;
  onOpenLegend: () => void;
  onOpenDailyModal: () => void;
  onOpenRecoveryModal?: () => void;
  children?: React.ReactNode;
}) {
  const { currentDayInfo: day, upcomingMilestones, todayDate, selectedDate, cycleStats, settings, updateSettings, logs, hasEnoughData, denyPeriodOnDate, logBleedingForDate, setSelectedDate } = useCycle();
  const toast = useToast();
  const [confirmedEndFeedback, setConfirmedEndFeedback] = useState<string | null>(null);
  // Mejora 6: estado para doble confirmación antes de borrar registro de regla
  const [confirmDeletePending, setConfirmDeletePending] = useState(false);
  // Reset automático al cambiar de fecha para evitar que quede activo el botón de "¿Segura?"
  // cuando se navega a otro día


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
  const selectedMilestones = useMemo(() => {
    return calculateUpcomingMilestones(cycleStats, selectedDate);
  }, [cycleStats, selectedDate]);
  const daysNext = selectedMilestones.daysUntilNextPeriod;
  const daysToOvu = selectedMilestones.daysUntilNextOvulation;

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
  const hasAnyLog = Boolean(isRecorded || isIrregular || hasAnyAnnotation);
  const daysAgo = isPast ? diffDays(parseDateKey(selectedDate), parseDateKey(todayDate)) : 0;
  const daysAgoLabel = daysAgo === 1
    ? 'Ayer'
    : daysAgo === 2
      ? 'Antes de ayer'
      : `Hace ${daysAgo} días`;

  const yesterdayKey = (() => {
    const d = parseDateKey(todayDate);
    d.setDate(d.getDate() - 1);
    return formatDateKey(d);
  })();
  const yesterdayLog = logs[yesterdayKey];
  const yesterdayHasLog = Boolean(
    yesterdayLog && (
      yesterdayLog.isPeriod ||
      yesterdayLog.isIrregularBleeding ||
      (yesterdayLog.symptoms && yesterdayLog.symptoms.length > 0) ||
      yesterdayLog.notes ||
      (yesterdayLog.intimacyLog && yesterdayLog.intimacyLog.activity !== 'none') ||
      yesterdayLog.medications?.some(m => m.taken) ||
      yesterdayLog.bbt !== undefined
    )
  );

  // Handler para confirmar fin de regla en el día de hoy y recalcular
  const handleConfirmPeriodEndToday = () => {
    try { navigator.vibrate?.(20); } catch {}
    if (isRecorded) {
      denyPeriodOnDate(todayDate);
    }
    if (hasValidPeriodStart) {
      const start = parseDateKey(cycleStats.lastVerifiedPeriodStart);
      const today = parseDateKey(todayDate);
      const daysCount = Math.max(1, diffDays(start, today));
      // Asegurar que los días anteriores del periodo (desde el inicio hasta ayer) queden registrados
      for (let d = 0; d < daysCount; d++) {
        const dt = new Date(start);
        dt.setDate(start.getDate() + d);
        const k = formatDateKey(dt);
        if (k && !logs[k]?.isPeriod) {
          logBleedingForDate(k, {
            flow: settings.typicalFlowIntensity || 'medium',
            isCycleStart: d === 0,
            isIrregular: false,
          });
        }
      }
      updateSettings({ averagePeriodLength: daysCount });
      const msg = `¡Fin de regla confirmado! Duró ${daysCount} días y se ha actualizado tu ciclo.`;
      setConfirmedEndFeedback(msg);
      toast.success(msg);
    } else {
      const realDuration = Math.max(1, cycleDay - 1);
      updateSettings({ averagePeriodLength: realDuration });
      const msg = `¡Fin de regla confirmado! Registrado con ${realDuration} días de duración.`;
      setConfirmedEndFeedback(msg);
      toast.success(msg);
    }
  };

  let title = hasCycle ? (daysToNext > 0 ? `Quedan ${daysToNext} días para la regla` : 'Tu ciclo actual') : 'Tu primer registro';
  let copy = hasCycle ? '' : 'Anota cuándo empezó tu regla. No necesitas conocer todavía la duración de tu ciclo.';

  if (hasEnoughData && !hasCycle) {
    title = 'Un día de tu historia';
    copy = 'Tus anotaciones se guardan igualmente.';
  } else if (hasCycle) {
    if (isPast) {
      if (isRecorded) {
        title = 'Tuviste la regla este día';
        copy = flowName ? `Flujo ${flowName} registrado` : '';
      } else if (isIrregular) {
        title = 'Sangrado irregular registrado';
        copy = flowName ? `Flujo ${flowName} registrado` : '';
      } else if (day.isPeriod) {
        title = 'Previsión de regla no confirmada';
        copy = 'Había previsión para esta fecha. Confirma si te bajó.';
      } else {
        title = hasAnyAnnotation ? 'Anotaciones de este día' : 'Día registrado';
        copy = '';
      }
    } else if (isFuture) {
      if (isPeriodDay) {
        title = 'Se espera tu regla este día';
        copy = 'Previsión según tus ciclos';
      } else if (day.isOvulationDay) {
        title = 'Día estimado de ovulación';
        copy = 'Máxima fertilidad';
      } else if (day.isFertileWindow) {
        title = daysToOvu > 1
          ? `Ovulación estimada en ${daysToOvu} días`
          : daysToOvu === 1 ? 'Ovulación estimada mañana' : 'Ventana fértil';
        copy = '';
      } else if (daysToNext > 1 && daysToNext <= 5) {
        title = `Tu regla llega en ${daysToNext} días`;
        copy = '';
      } else if (daysToNext === 1) {
        title = 'Tu regla llega mañana';
        copy = 'Prepárate';
      } else {
        title = `Quedarán ${daysToNext} días para la regla`;
        copy = '';
      }
    } else {
      // Hoy
      if (isRecorded) {
        title = 'Estás en tu periodo — ve a tu ritmo';
        copy = flowName ? `Flujo ${flowName} registrado` : '';
      } else if (isPeriodDay) {
        title = 'Hoy es tu fecha estimada de regla';
        copy = 'Confirma o corrige el sangrado de hoy';
      } else if (isJustFinishedPeriod) {
        title = daysToOvu > 0 ? `Ovulación estimada en ${daysToOvu} días` : 'Tu regla ha terminado';
        copy = '';
      } else if (awaitingPeriod) {
        title = elapsedDays === cycleLength ? 'Fecha estimada de regla: hoy' : 'Tu ciclo está tardando un poco más';
        copy = elapsedDays === cycleLength ? 'La fecha es orientativa. Registra cuando empiece.' : 'Normal, cada ciclo es diferente. Registra cuando baje.';
      } else if (day.isOvulationDay) {
        title = 'Hoy es tu día de ovulación';
        copy = 'Máxima fertilidad';
      } else if (day.isFertileWindow) {
        title = daysToOvu > 1
          ? `Ovulación estimada en ${daysToOvu} días`
          : daysToOvu === 1
            ? 'Ovulación estimada mañana'
            : 'Ventana de alta fertilidad';
        copy = '';
      } else if (daysToOvu > 0 && daysToOvu <= 5) {
        title = `Tu ventana fértil empieza en ${daysToOvu} ${daysToOvu === 1 ? 'día' : 'días'}`;
        copy = '';
      } else if (daysToNext > 1 && daysToNext <= 5) {
        title = `Tu regla llega en ${daysToNext} días`;
        copy = '';
      } else if (daysToNext === 1) {
        title = 'Tu regla llega mañana — prepárate';
        copy = '';
      } else if (daysToNext === 0) {
        title = 'Hoy es tu fecha estimada de regla';
        copy = 'Confirma si te ha bajado';
      } else {
        const daysToFertile = daysToOvu - 5;
        if (daysToFertile > 0 && day.phase === 'follicular') {
          title = `Ventana fértil en ${daysToFertile} ${daysToFertile === 1 ? 'día' : 'días'}`;
          copy = '';
        } else {
          title = `${daysToNext} días para tu próxima regla`;
          copy = '';
        }
      }
    }
  }

  const activeDuration = isPeriodDay ? periodLength : cycleLength;
  const activeDay = isPeriodDay ? Math.min(cycleDay, periodLength) : cycleDay;
  const progress = hasCycle && activeDuration > 0 ? Math.min(1, Math.max(0, activeDay / activeDuration)) : 0;
  const circumference = 2 * Math.PI * 55;
  const showRing = hasCycle && (isToday || isFuture);

  // Cuando se muestran los diales visuales gemelos, la cabecera indica el día y fase sin repetir la cuenta atrás
  if (showRing && !isPast) {
    if (isRecorded) {
      title = `Día ${cycleDay} de regla`;
      copy = flowName ? `Flujo ${flowName} registrado` : 'Fase menstrual activa';
    } else if (isPeriodDay) {
      title = `Día ${cycleDay} de regla`;
      copy = 'Previsión de periodo según tu ciclo';
    } else if (awaitingPeriod) {
      title = 'Esperando tu regla';
      copy = 'Tu ciclo se recalcula sin prisas';
    } else {
      title = `Día ${cycleDay} de tu ciclo`;
      copy = day.isFertileWindow
        ? 'Ventana fértil activa'
        : day.isOvulationDay
          ? 'Pico de máxima fertilidad'
          : day.phase === 'luteal'
            ? 'Fase lútea en curso'
            : 'Fase folicular en curso';
    }
  }

  const isLikelyMissedOnePeriod = hasCycle && isToday && elapsedDays > cycleLength + 10 && elapsedDays < cycleLength * 2.5;
  const isAnnotated = Boolean(hasAnyLog);
  const hasFreeHeroSpace = isAnnotated || isFuture || !isToday;

  // 4 fases del ciclo con colores sincronizados al 100% con el calendario superior:
  // 1. Menstruación (Rosa - var(--rose))
  // 2. Folicular (Verde - var(--accent))
  // 3. Ventana Fértil y Ovulación (Naranja / Ámbar dorado - #f59e0b)
  // 4. Lútea (Morado / Lavanda - #8b5cf6)
  const isMenstrualActive = day.isPeriod || (day.phase === 'menstrual' && !day.isFertileWindow);
  const isFertileOvulationActive = !day.isPeriod && (day.isFertileWindow || day.isOvulationDay);
  const isFollicularActive = !day.isPeriod && !day.isFertileWindow && !day.isOvulationDay && day.phase === 'follicular';
  const isLutealActive = !day.isPeriod && !day.isFertileWindow && !day.isOvulationDay && day.phase === 'luteal';

  const phaseQuadrants = [
    {
      id: 'menstrual',
      name: 'Regla',
      color: 'var(--rose)',
      active: isMenstrualActive,
      path: 'M 22.32 91.94 A 58 58 0 0 1 73.94 40.32'
    },
    {
      id: 'follicular',
      name: 'Folicular',
      color: 'var(--accent)',
      active: isFollicularActive,
      path: 'M 86.06 40.32 A 58 58 0 0 1 137.68 91.94'
    },
    {
      id: 'ovulation',
      name: 'Ventana fértil / Ovulación',
      color: '#f59e0b',
      active: isFertileOvulationActive,
      path: 'M 137.68 104.06 A 58 58 0 0 1 86.06 155.68'
    },
    {
      id: 'luteal',
      name: 'Fase Lútea',
      color: '#8b5cf6',
      active: isLutealActive,
      path: 'M 73.94 155.68 A 58 58 0 0 1 22.32 104.06'
    }
  ];

  // ¿Es la ventana fértil / ovulación el siguiente evento relevante?
  // Durante la ventana fértil, fase folicular y ovulación: el Círculo de ovulación es el protagonista
  // (más grande y situado en la posición principal).
  // Una vez pasa la ventana fértil (fase lútea, premenstrual, regla o retraso):
  // cambian de posiciones y la Gota de regla pasa a ser la protagonista (más grande y en posición principal).
  const isFertilePriority = Boolean(
    !day.isPeriod &&
    !awaitingPeriod &&
    (day.isFertileWindow || day.isOvulationDay || (day.phase === 'follicular' && daysToOvu > 0))
  );
  const isPeriodPriority = !isFertilePriority;

  const wheelInfo = (() => {
    if (day.isPeriod || isPeriodDay) {
      return {
        kicker: 'FASE MENSTRUAL',
        kickerColor: 'var(--rose)',
        number: daysToOvu > 0 ? daysToOvu : '—',
        isText: false,
        unit: 'días',
        context: 'próxima ovulación'
      };
    }
    if (day.isOvulationDay || daysToOvu === 0) {
      return {
        kicker: 'VENTANA FÉRTIL',
        kickerColor: '#f59e0b',
        number: 'Hoy',
        isText: true,
        unit: 'pico fértil',
        context: 'máxima probabilidad'
      };
    }
    if (day.isFertileWindow) {
      return {
        kicker: 'VENTANA FÉRTIL',
        kickerColor: '#f59e0b',
        number: daysToOvu > 0 ? daysToOvu : 1,
        isText: false,
        unit: daysToOvu === 1 ? 'día' : 'días',
        context: 'ovulación estimada'
      };
    }
    if (day.phase === 'follicular') {
      return {
        kicker: 'FASE FOLICULAR',
        kickerColor: 'var(--accent)',
        number: daysToOvu > 0 ? daysToOvu : '—',
        isText: false,
        unit: daysToOvu === 1 ? 'día' : 'días',
        context: 'ovulación estimada'
      };
    }
    return {
      kicker: 'FASE LÚTEA',
      kickerColor: '#8b5cf6',
      number: daysToNext,
      isText: false,
      unit: daysToNext === 1 ? 'día' : 'días',
      context: 'para la regla'
    };
  })();

  return <section className={`cycle-summary${hasCycle ? '' : ' is-first-record'}${hasFreeHeroSpace ? ' is-annotated' : ''}`} data-phase={hasCycle && !awaitingPeriod ? day.phase : 'unknown'} aria-labelledby="cycle-title">
    <motion.div
      key={selectedDate}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="cycle-summary-motion"
    >
      <div className={`cycle-summary-top${showRing ? ' has-ring' : ' no-ring'}`}>
        {/* Si no hay anillos (ej. días pasados o sin ciclo), mostramos la cabecera estándar */}
        {!showRing && (
          <div className="cycle-summary-header">
            {hasCycle ? (
              <button
                type="button"
                className={`phase-chip${day.isOvulationDay ? ' is-ovulation' : day.isFertileWindow && !day.isPeriod ? ' is-fertile' : ''}`}
                onClick={onOpenLegend}
              >
                <span className="phase-dot"/>
                {awaitingPeriod
                  ? 'Retraso'
                  : day.isPeriod
                    ? 'Regla'
                    : day.isOvulationDay
                      ? 'Ovulación estimada'
                      : day.isFertileWindow
                        ? 'Ventana Fértil'
                        : day.phase === 'follicular'
                          ? 'Fase Folicular'
                          : 'Fase Lútea'}
                <ChevronDown size={13} aria-hidden="true" style={{ opacity: 0.7 }}/>
              </button>
            ) : null}
            <h2 id="cycle-title" className="cycle-headline">{title}</h2>
            {copy && <p className="cycle-copy">{copy}</p>}
          </div>
        )}

        {/* Visuales: ÚNICAMENTE los dos instrumentos (Gota y Círculo) con jerarquía dinámica */}
        {showRing && (
          <div className="cycle-summary-visuals">
            {/* Elemento 1: Gota de regla / cuenta atrás de regla */}
            <div className={`cycle-ring-wrap ${isPeriodPriority ? 'is-primary' : 'is-secondary'}`}>
              <div
                className={`cycle-ring hero-prominent-ring ${isPeriodPriority ? 'is-primary' : 'is-secondary'}`}
                role="button"
                tabIndex={0}
                onClick={onRecordPeriod}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRecordPeriod();
                  }
                }}
                title="Toca para registrar sangrado o editar tu regla"
                aria-label={
                  isFuture
                    ? isPeriodDay
                      ? `Regla prevista este día (día ${cycleDay} estimado)`
                      : daysToNext === 1
                        ? 'Queda 1 día para la regla estimada'
                        : daysToNext > 0
                          ? `Quedan ${daysToNext} días para la regla estimada`
                          : `Día ${cycleDay} estimado del ciclo`
                    : isPeriodDay
                      ? `Día ${cycleDay} de regla`
                      : daysToNext === 1
                        ? 'Queda 1 día para la regla'
                        : daysToNext > 0
                          ? `Quedan ${daysToNext} días para la regla`
                          : `Día ${cycleDay} del ciclo`
                }
              >
                <svg viewBox="0 0 160 170" aria-hidden="true">
                  <path
                    d="M 80 6 C 58 18 16 56 16 98 A 64 64 0 0 0 144 98 C 144 56 102 18 80 6 Z"
                    fill="none"
                    stroke="var(--border-subtle)"
                    strokeWidth="10"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 80 6 C 58 18 16 56 16 98 A 64 64 0 0 0 144 98 C 144 56 102 18 80 6 Z"
                    fill="none"
                    stroke={
                      hasCycle && daysToNext <= 5 && !day.isPeriod
                        ? 'var(--rose)'
                        : hasCycle && day.isOvulationDay
                          ? '#2563eb'
                          : hasCycle && day.isFertileWindow && !day.isPeriod
                            ? '#d97706'
                            : 'var(--phase-ink)'
                    }
                    strokeWidth="10"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray="100"
                    strokeDashoffset={100 * (1 - Math.max(0, Math.min(1, progress)))}
                    style={{ transition: 'stroke 0.4s ease' }}
                  />
                </svg>
                <span className="cycle-ring-label">
                  {isFuture ? (
                    isPeriodDay ? (
                      <>
                        <span>REGLA</span>
                        <strong className="cycle-ring-day-number is-text">Prevista</strong>
                        <span>este día</span>
                      </>
                    ) : daysToNext === 1 ? (
                      <>
                        <span>QUEDA</span>
                        <strong className="cycle-ring-day-number">1</strong>
                        <span>día</span>
                        <span className="cycle-ring-context">para la regla</span>
                      </>
                    ) : daysToNext > 1 ? (
                      <>
                        <span>QUEDAN</span>
                        <strong className="cycle-ring-day-number">{daysToNext}</strong>
                        <span>días</span>
                        <span className="cycle-ring-context">para la regla</span>
                      </>
                    ) : (
                      <>
                        <span>DÍA</span>
                        <strong className="cycle-ring-day-number">{cycleDay}</strong>
                        <span>estimado</span>
                      </>
                    )
                  ) : isPeriodDay ? (
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
                      <span className="cycle-ring-context">de retraso</span>
                    </>
                  ) : daysToNext === 1 ? (
                    <>
                      <span>QUEDA</span>
                      <strong className="cycle-ring-day-number">1</strong>
                      <span>día</span>
                      <span className="cycle-ring-context">para la regla</span>
                    </>
                  ) : daysToNext > 1 ? (
                    <>
                      <span>QUEDAN</span>
                      <strong className="cycle-ring-day-number">{daysToNext}</strong>
                      <span>días</span>
                      <span className="cycle-ring-context">para la regla</span>
                    </>
                  ) : (
                    <>
                      <span>PREVISIÓN</span>
                      <strong className="cycle-ring-day-number is-text">Hoy</strong>
                      <span>de regla</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Elemento 2: Círculo dividido para las fases del ciclo */}
            <div className={`cycle-ring-wrap ${isFertilePriority ? 'is-primary' : 'is-secondary'}`}>
              <div
                className={`cycle-ring cycle-phase-wheel hero-prominent-ring ${isFertilePriority ? 'is-primary' : 'is-secondary'}`}
                role="button"
                tabIndex={0}
                onClick={onOpenLegend}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenLegend();
                  }
                }}
                title="Toca para ver la leyenda de fases del ciclo"
                aria-label={`Rueda de 4 fases del ciclo. Fase activa: ${day.phase}. ${wheelInfo.kicker} ${wheelInfo.number} ${wheelInfo.unit}`}
              >
                <svg viewBox="0 0 160 170" aria-hidden="true">
                  {/* Pista circular guía idéntica a la gota */}
                  <circle
                    cx="80"
                    cy="98"
                    r="58"
                    fill="none"
                    stroke="var(--border-subtle)"
                    strokeWidth="10"
                    strokeLinejoin="round"
                  />

                  {/* 4 cuadrantes correspondientes a cada fase del calendario */}
                  {phaseQuadrants.map(q => (
                    <path
                      key={q.id}
                      d={q.path}
                      fill="none"
                      stroke={q.color}
                      strokeWidth={q.active ? 10 : 6}
                      strokeLinecap="round"
                      opacity={q.active ? 1 : 0.22}
                      style={{
                        transition: 'stroke-width 0.35s ease, opacity 0.35s ease'
                      }}
                    />
                  ))}
                </svg>

                {/* Texto central con la misma familia tipográfica que la gota */}
                <span className="cycle-ring-label">
                  <span style={wheelInfo.kickerColor ? { color: wheelInfo.kickerColor } : undefined}>
                    {wheelInfo.kicker}
                  </span>
                  <strong className={`cycle-ring-day-number${wheelInfo.isText ? ' is-text' : ''}`}>{wheelInfo.number}</strong>
                  <span>{wheelInfo.unit}</span>
                  <span className="cycle-ring-context">{wheelInfo.context}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Acciones contextuales centradas debajo de los diales cuando son requeridas */}
        {showRing && ((isToday && hasCycle && (isRecorded || awaitingPeriod || day.isPeriod || daysToNext <= 4)) || isFuture) && (
          <div className="cycle-summary-bottom-actions">
            {isToday && hasCycle && (
              <div className="hero-quick-actions">
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
                      Hoy ha terminado mi regla
                    </button>
                  </>
                ) : awaitingPeriod ? (
                  <>
                    <button
                      type="button"
                      className="aura-button sm primary"
                      onClick={onRecordPeriod}
                      style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Droplets size={14} />
                      Me ha bajado hoy la regla
                    </button>
                    <button
                      type="button"
                      className="aura-button sm"
                      onClick={() => {
                        setConfirmedEndFeedback('Anotado retraso: el ciclo se recalcula sin prisas.');
                      }}
                      style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Clock size={14} />
                      Se me está retrasando la regla
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
                      {cycleDay > 1 ? 'Sigo con la regla' : 'Me ha bajado la regla'}
                    </button>
                    <button
                      type="button"
                      className="aura-button sm"
                      onClick={
                        cycleDay > 1
                          ? handleConfirmPeriodEndToday
                          : () => {
                              denyPeriodOnDate(todayDate);
                              setConfirmedEndFeedback('Entendido: previsión retirada. Se ajustará si se está retrasando.');
                            }
                      }
                      style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {cycleDay > 1 ? (
                        <>
                          <Check size={14} style={{ color: 'var(--accent)' }} />
                          Ya se me ha terminado
                        </>
                      ) : (
                        <>
                          <Clock size={14} />
                          Se me está retrasando la regla
                        </>
                      )}
                    </button>
                  </>
                ) : daysToNext <= 4 ? (
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={onRecordPeriod}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Droplets size={14} style={{ color: 'var(--rose)' }} />
                    Se me ha adelantado la regla
                  </button>
                ) : null}
              </div>
            )}

            {isFuture && (
              <div className="hero-quick-actions">
                <button
                  type="button"
                  className="aura-button sm"
                  onClick={() => setSelectedDate(todayDate)}
                  style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <RotateCcw size={13} />
                  Volver a hoy
                </button>
              </div>
            )}
          </div>
        )}

        {confirmedEndFeedback && (
          <p className="confirmed-feedback-msg" style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={14} /> {confirmedEndFeedback}
          </p>
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
                {/* Mejora 6: doble confirmación antes de borrar */}
                {confirmDeletePending ? (
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={() => {
                      const start = cycleStats.lastVerifiedPeriodStart;
                      const yesterday = parseDateKey(selectedDate);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const yesterdayStr = formatDateKey(yesterday);
                      if (start === yesterdayStr && logs[yesterdayStr]?.isPeriod) {
                        logBleedingForDate(yesterdayStr, { flow: 'spotting', isCycleStart: false, isIrregular: true });
                        toast.success('El sangrado de ayer se ha cambiado a manchado irregular al durar solo 1 día.');
                      } else {
                        toast.success('Registro eliminado');
                      }
                      denyPeriodOnDate(selectedDate);
                      setConfirmDeletePending(false);
                      try { navigator.vibrate?.([20, 40, 20]); } catch {}
                    }}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gold-soft)', color: 'var(--gold)', borderColor: 'var(--gold)' }}
                    title="Toca de nuevo para confirmar el borrado"
                  >
                    <AlertTriangle size={14} />
                    ¿Segura? Confirmar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={() => setConfirmDeletePending(true)}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Quitar registro de regla para esta fecha"
                  >
                    <X size={14} />
                    No tuve regla este día
                  </button>
                )}
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
                  Tuve regla este día
                </button>
                {confirmDeletePending ? (
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={() => {
                      const start = cycleStats.lastVerifiedPeriodStart;
                      const yesterday = parseDateKey(selectedDate);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const yesterdayStr = formatDateKey(yesterday);
                      if (start === yesterdayStr && logs[yesterdayStr]?.isPeriod) {
                        logBleedingForDate(yesterdayStr, { flow: 'spotting', isCycleStart: false, isIrregular: true });
                        toast.success('El sangrado de ayer se ha cambiado a manchado irregular al durar solo 1 día.');
                      }
                      denyPeriodOnDate(selectedDate);
                      setConfirmDeletePending(false);
                      try { navigator.vibrate?.([20, 40, 20]); } catch {}
                    }}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gold-soft)', color: 'var(--gold)', borderColor: 'var(--gold)' }}
                  >
                    <AlertTriangle size={14} />
                    ¿Segura? Confirmar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="aura-button sm"
                    onClick={() => setConfirmDeletePending(true)}
                    style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Check size={14} />
                    No tuve regla
                  </button>
                )}
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

        {/* En días pasados sin anillo: panel compacto de anotaciones y síntomas */}
        {!showRing && isPast && (
          <div className="hero-side-panel is-past">
            <div className="hero-panel-header">
              <ClipboardList size={15} />
              <span>Anotaciones</span>
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
                {notes && <p className="hero-notes-preview">"{notes}"</p>}
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
              <div className="hero-panel-empty past-empty">
                <p className="hero-empty-text">
                  {daysAgo <= 3
                    ? `${daysAgoLabel}: sin notas ni síntomas.`
                    : 'Sin notas ni síntomas en esta fecha.'}
                </p>
                <div className="hero-past-actions">
                  {/* Solo mostrar el botón de Regla si no hay regla ya registrada */}
                  {!isRecorded && !isIrregular && (
                    <button
                      type="button"
                      className="aura-button sm hero-add-symptom-btn"
                      onClick={onRecordPeriod}
                      title="Anotar regla en este día"
                    >
                      <Droplets size={12} style={{ color: 'var(--rose)' }} />
                      Regla
                    </button>
                  )}
                  <button
                    type="button"
                    className="aura-button sm hero-add-symptom-btn"
                    onClick={onOpenDailyModal}
                    title="Anotar síntomas o notas"
                  >
                    <Plus size={12} />
                    Síntomas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QuickLog buttons moved up for visibility */}
      {children && (
        <div className="hero-integrated-record">
          {children}
        </div>
      )}

      {/* Banner de recuperacin de ciclo perdido (1 mes) */}
      {isLikelyMissedOnePeriod && (
        <div className="past-catchup-banner" style={{ background: 'var(--gold-soft)', borderColor: 'var(--gold)', color: 'var(--gold)' }} role="region" aria-label="Aviso de regla olvidada">
          <div className="past-catchup-body">
            <div className="past-catchup-badge" style={{ color: 'var(--gold)' }}>
              <Clock size={13} aria-hidden="true" />
              <span>POSIBLE REGLA OLVIDADA</span>
            </div>
            <p className="past-catchup-title" style={{ color: 'var(--gold)' }}>¿Te bajó la regla el mes pasado?</p>
            <p className="past-catchup-sub" style={{ opacity: 0.9 }}>
              Hace más de {cycleLength + 10} días de tu último registro de periodo.
            </p>
          </div>
          <div className="past-catchup-actions">
            <button
              type="button"
              className="aura-button sm primary"
              style={{ background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' }}
              onClick={onOpenRecoveryModal}
            >
              Completar mes pasado
            </button>
          </div>
        </div>
      )}

      {/* Aviso para HOY si ayer quedó sin registrar (unificado con la tarjeta naranja) */}
      {isToday && hasCycle && !yesterdayHasLog && (hasAnyAnnotation || isRecorded || isIrregular) && (
        <div className="past-catchup-banner" role="region" aria-label="Aviso de registro pasado">
          <div className="past-catchup-body">
            <div className="past-catchup-badge">
              <Clock size={13} aria-hidden="true" />
              <span>AYER SIN REGISTRAR</span>
            </div>
            <p className="past-catchup-title">¿Se te olvidó apuntar ayer?</p>
            <p className="past-catchup-sub">
              Aún puedes añadir si tuviste la regla o cómo te encontrabas para que tus previsiones no pierdan precisión.
            </p>
          </div>
          <div className="past-catchup-actions">
            <button
              type="button"
              className="aura-button sm primary"
              onClick={() => {
                setSelectedDate(yesterdayKey);
                setTimeout(onRecordPeriod, 50);
              }}
            >
              <Droplets size={14} />
              Anotar regla
            </button>
            <button
              type="button"
              className="aura-button sm"
              onClick={() => {
                setSelectedDate(yesterdayKey);
                setTimeout(onOpenDailyModal, 50);
              }}
            >
              <Plus size={14} />
              Anotar síntomas
            </button>
          </div>
        </div>
      )}

      {/* Banner visual para DÍAS PASADOS no registrados */}
      {isPast && !hasAnyLog && (
        <div className="past-catchup-banner" role="region" aria-label="Aviso de registro pasado">
          <div className="past-catchup-body">
            <div className="past-catchup-badge">
              <Clock size={13} aria-hidden="true" />
              <span>{daysAgo <= 3 ? `${daysAgoLabel} sin registrar` : 'Día pasado sin registros'}</span>
            </div>
            <p className="past-catchup-title">
              {daysAgo <= 3
                ? `¿Se te olvidó apuntar ${daysAgo === 1 ? 'ayer' : daysAgoLabel.toLowerCase()}?`
                : '¿Tuviste regla o sensaciones este día?'}
            </p>
            <p className="past-catchup-sub">
              Aún puedes añadir si tuviste la regla o cómo te encontrabas para que tus previsiones no pierdan precisión.
            </p>
          </div>
          <div className="past-catchup-actions">
            <button
              type="button"
              className="aura-button sm primary"
              onClick={onRecordPeriod}
            >
              <Droplets size={14} />
              Anotar regla
            </button>
            <button
              type="button"
              className="aura-button sm"
              onClick={onOpenDailyModal}
            >
              <Plus size={14} />
              Anotar síntomas
            </button>
          </div>
        </div>
      )}

      {!hasCycle && (
        <div className="first-record-empty-state">
          <div className="first-record-emoji" aria-hidden="true">🌸</div>
          <p className="first-record-headline">Aquí empieza tu historia</p>
          <p className="first-record-sub">
            Tu diario es solo tuyo. Empieza anotando cuándo fue tu última regla y el resto irá solo.
          </p>
          <button type="button" className="aura-button primary first-record-button" onClick={onRecordPeriod}>
            Registrar mi primera regla <ArrowRight size={17}/>
          </button>
        </div>
      )}
    </motion.div>
  </section>;
}

