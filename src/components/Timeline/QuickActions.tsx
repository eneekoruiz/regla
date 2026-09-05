import React, { useState } from 'react';
import { useCycle } from '../../hooks/useCycle';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplet, Check, X, Heart, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { hapticSelect, hapticSuccess, hapticTick } from '../../utils/haptics';
import type { FlowIntensity } from '../../types/cycle';

function formatFriendlyDate(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'hoy';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yStr) return 'ayer';

  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  return `${dayNames[dateObj.getDay()]} ${d} de ${monthNames[dateObj.getMonth()]}`;
}

function getFuturePredictionInsight(dayInfo: any, _friendlyDate: string) {
  const { dayOfCycle, phase, isPeriod, isOvulationDay, isFertileWindow } = dayInfo;

  if (isPeriod) {
    if (dayOfCycle <= 2) {
      return {
        title: 'Inicio de regla previsto',
        text: 'Días de flujo más abundante y mayor sensibilidad física. Prioriza descanso y calor suave.',
        badge: `Día ${dayOfCycle} · Flujo Alto`,
        badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-500/20'
      };
    } else if (dayOfCycle <= 4) {
      return {
        title: 'Regla en curso',
        text: 'El flujo empezará a remitir paulatinamente y tu energía comenzará a estabilizarse.',
        badge: `Día ${dayOfCycle} · Moderado`,
        badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-500/20'
      };
    } else {
      return {
        title: 'Cierre de regla',
        text: 'Manchado liviano y transición progresiva hacia una fase de mayor dinamismo.',
        badge: `Día ${dayOfCycle} · Manchado`,
        badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      };
    }
  }

  if (isOvulationDay) {
    return {
      title: 'Pico de ovulación',
      text: 'Máxima fertilidad y estrógenos en su punto alto. Gran vitalidad física.',
      badge: 'Ovulación',
      badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    };
  }

  if (isFertileWindow) {
    return {
      title: 'Ventana fértil',
      text: 'Tu cuerpo se prepara para la ovulación con energía ascendente.',
      badge: 'Fértil',
      badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    };
  }

  if (phase === 'luteal') {
    return {
      title: 'Fase lútea',
      text: 'Mayor progesterona e introspección. Ideal para desacelerar y cenar ligero.',
      badge: 'Fase Lútea',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
    };
  }

  return {
    title: 'Fase folicular',
    text: 'Fuerza física, creatividad y energía renovada.',
    badge: 'Folicular',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  };
}

export const QuickActions: React.FC<{
  onOpenLogSheet: () => void;
}> = () => {
  const {
    currentDayInfo,
    logs,
    selectedDate,
    todayDate,
    startPeriodOnDate,
    togglePeriodForDate,
    setPeriodFlowForDate,
    toggleSpottingForDate,
    denyPeriodOnDate
  } = useCycle();

  const [, setDismissedPredictionDates] = useState<Record<string, boolean>>({});
  const [pendingFlow, setPendingFlow] = useState<FlowIntensity | null>(null);
  const [isEditingFlow, setIsEditingFlow] = useState(false);
  const [showPastConfirmModal, setShowPastConfirmModal] = useState(false);

  const isToday = selectedDate === todayDate;
  const isFuture = selectedDate > todayDate;
  const isPast = selectedDate < todayDate;

  const isPeriodConfirmed = !!logs[selectedDate]?.isPeriod;
  const currentFlow = currentDayInfo.flow || (isPeriodConfirmed ? 'medium' : undefined);
  const hasSpotting = logs[selectedDate]?.symptoms.some(s => s.id === 'spotting_light');

  const friendlyDate = formatFriendlyDate(selectedDate, todayDate);
  const futureInsight = getFuturePredictionInsight(currentDayInfo, friendlyDate);

  const FLOW_NAMES: Record<FlowIntensity, { title: string; emoji: string }> = {
    spotting: { title: 'Manchado', emoji: '💧' },
    light: { title: 'Ligero', emoji: '🩸' },
    medium: { title: 'Medio', emoji: '🩸🩸' },
    heavy: { title: 'Abundante', emoji: '🩸🩸🩸' },
    very_heavy: { title: 'Excesivo', emoji: '⚠️' }
  };

  const handleInitiateFlowSelect = (flow: FlowIntensity) => {
    hapticSelect();
    setPendingFlow(flow);
  };

  const handleConfirmRegistration = () => {
    if (!pendingFlow) return;
    hapticSuccess();
    if (!isPeriodConfirmed) {
      startPeriodOnDate(selectedDate);
    }
    setPeriodFlowForDate(selectedDate, pendingFlow);
    setPendingFlow(null);
    setIsEditingFlow(false);
  };

  const handleDenyPeriod = () => {
    hapticTick();
    setDismissedPredictionDates(prev => ({ ...prev, [selectedDate]: true }));
    denyPeriodOnDate(selectedDate);
  };

  const handleToggleSpotting = () => {
    hapticSelect();
    toggleSpottingForDate(selectedDate);
  };

  const handleRemovePeriod = () => {
    hapticTick();
    togglePeriodForDate(selectedDate);
    setIsEditingFlow(false);
  };

  const handleOpenPastEdit = () => {
    hapticTick();
    setShowPastConfirmModal(true);
  };

  const handleConfirmPastEdit = () => {
    hapticSelect();
    setShowPastConfirmModal(false);
    setIsEditingFlow(true);
  };

  const FLOW_OPTIONS: { id: FlowIntensity; label: string; title: string }[] = [
    { id: 'spotting', label: '💧', title: 'Manchado' },
    { id: 'light', label: '🩸', title: 'Ligero' },
    { id: 'medium', label: '🩸🩸', title: 'Medio' },
    { id: 'heavy', label: '🩸🩸🩸', title: 'Abundante' },
    { id: 'very_heavy', label: '⚠️', title: 'Excesivo' }
  ];

  return (
    <div className="w-full px-5 my-1 flex flex-col items-center select-none">
      <AnimatePresence mode="wait">
        {/* ESCENARIO 1: DÍA FUTURO (Predicción rica según día de ciclo) */}
        {isFuture ? (
          <motion.div
            key={`future-${selectedDate}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 shadow-2xs flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 text-base">
              💧
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[11.5px] font-bold text-[var(--text-primary)] truncate">
                  {futureInsight.title}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${futureInsight.badgeColor} flex-shrink-0`}>
                  {futureInsight.badge}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                {futureInsight.text}
              </p>
            </div>
          </motion.div>
        ) : showPastConfirmModal ? (
          /* ESCENARIO 2: MODAL CONFIRMACIÓN EDICIÓN DÍA PASADO */
          <motion.div
            key={`past-confirm-${selectedDate}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-[var(--bg-card)] border border-amber-500/30 rounded-2xl p-3.5 shadow-sm flex flex-col gap-2.5"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Modificar día pasado ({friendlyDate})</span>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              ¿Estás segura de que deseas modificar el historial de un día pasado ({friendlyDate})?
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleConfirmPastEdit}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Sí, modificar
              </button>

              <button
                onClick={() => setShowPastConfirmModal(false)}
                className="py-2 px-3 rounded-xl bg-[var(--bg-pill)] text-[var(--text-tertiary)] font-semibold text-xs border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        ) : pendingFlow ? (
          /* ESCENARIO 3: CONFIRMACIÓN DE REGISTRO DE FLUJO */
          <motion.div
            key={`pending-flow-${selectedDate}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-[var(--bg-card)] border border-rose-500/30 rounded-2xl p-3.5 shadow-sm flex flex-col gap-2.5"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Confirmar registro ({isToday ? 'Hoy' : friendlyDate})</span>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              ¿Confirmas que {isToday ? 'hoy' : `el ${friendlyDate}`} has tenido la regla con un flujo <strong className="text-[var(--text-primary)] font-bold">{FLOW_NAMES[pendingFlow].title} {FLOW_NAMES[pendingFlow].emoji}</strong>?
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleConfirmRegistration}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar y guardar</span>
              </button>

              <button
                onClick={() => setPendingFlow(null)}
                className="py-2 px-3 rounded-xl bg-[var(--bg-pill)] text-[var(--text-tertiary)] font-semibold text-xs border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        ) : isPeriodConfirmed && !isEditingFlow ? (
          /* ESCENARIO 4: REGISTRO COMPLETADO (Hoy vs Pasado) */
          <motion.div
            key={`recorded-${selectedDate}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                  {isToday
                    ? `Ya has registrado tu regla hoy (${currentFlow ? FLOW_NAMES[currentFlow].title : 'Registrada'})`
                    : `Regla registrada el ${friendlyDate} (${currentFlow ? FLOW_NAMES[currentFlow].title : 'Registrada'})`}
                </p>
                <p className="text-[10.5px] text-[var(--text-tertiary)] font-medium leading-snug mt-0.5">
                  {isToday ? 'Tómate un respiro y cuídate mucho. ✨' : 'Historial guardado correctamente.'}
                </p>
              </div>
            </div>

            <button
              onClick={isToday ? () => setIsEditingFlow(true) : handleOpenPastEdit}
              className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 transition-colors flex-shrink-0 cursor-pointer"
            >
              Modificar
            </button>
          </motion.div>
        ) : isEditingFlow ? (
          /* ESCENARIO 5: SELECTOR DE FLUJO EN EDICIÓN */
          <motion.div
            key={`flow-selector-${selectedDate}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 shadow-xs flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <Droplet className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>Intensidad ({isToday ? 'Hoy' : friendlyDate})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRemovePeriod}
                  className="text-[10px] font-semibold text-[var(--text-tertiary)] hover:text-rose-500 transition-colors cursor-pointer"
                >
                  Quitar regla
                </button>
                <button
                  onClick={() => setIsEditingFlow(false)}
                  className="text-[10px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {FLOW_OPTIONS.map((item) => {
                const isActive = currentFlow === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleInitiateFlowSelect(item.id)}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 active:scale-95 ${
                      isActive
                        ? 'bg-rose-500 text-white shadow-xs scale-[1.02]'
                        : 'bg-[var(--bg-pill)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <span className="text-xs leading-none">{item.label}</span>
                    <span className="text-[8px] truncate max-w-full">{item.title}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : isPast ? (
          /* ESCENARIO 6: DÍA PASADO SIN REGISTRO PREVIO */
          <motion.div
            key={`past-unlogged-${selectedDate}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-500/10 text-slate-500 flex items-center justify-center flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                  Sin registro ({friendlyDate})
                </p>
                <p className="text-[10.5px] text-[var(--text-tertiary)] font-medium leading-snug">
                  ¿Olvidaste anotar tu regla ese día?
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenPastEdit}
              className="text-[10px] font-semibold text-[var(--text-primary)] hover:text-rose-500 px-2.5 py-1 rounded-xl bg-[var(--bg-pill)] border border-[var(--border-subtle)] transition-colors flex-shrink-0 cursor-pointer"
            >
              + Añadir
            </button>
          </motion.div>
        ) : (
          /* ESCENARIO 7: HOY SIN REGISTRAR AÚN */
          <motion.div
            key="unconfirmed-prompt-today"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3 shadow-xs flex flex-col items-center gap-2.5"
          >
            <p className="text-xs font-bold text-[var(--text-primary)]">
              ¿Te ha bajado la regla hoy?
            </p>

            <div className="flex w-full gap-2">
              <button
                onClick={() => handleInitiateFlowSelect('medium')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Sí, registrar</span>
              </button>

              <button
                onClick={handleToggleSpotting}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-bold text-xs border transition-all cursor-pointer active:scale-95 ${
                  hasSpotting
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-[var(--bg-pill)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card)]'
                }`}
              >
                <Droplet className="w-3.5 h-3.5" />
                <span>{hasSpotting ? 'Manchado ✓' : 'Manchado'}</span>
              </button>

              <button
                onClick={handleDenyPeriod}
                className="py-2 px-3 rounded-xl bg-[var(--bg-pill)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-semibold text-xs border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
