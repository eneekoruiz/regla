import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Droplets, Pill, Sparkles, Thermometer } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { useToast } from '../../context/toast';
import { CycleStatusCard } from '../Cards/CycleStatusCard';
import { NaturalInputBar } from '../Input/NaturalInputBar';
import { ModalFrame } from './ModalFrame';
import { modalChoice, modalPrimaryButton, modalSecondaryButton, modalUnselected } from './modalStyles';
import type { FlowIntensity } from '../../types/cycle';

export function DailyLogBottomSheet({
  isOpen,
  onClose,
  onOpenSymptothermal,
  onOpenMedications
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenSymptothermal?: () => void;
  onOpenMedications?: () => void;
}) {
  const {
    selectedDate,
    todayDate,
    currentDayInfo: day,
    logs,
    settings,
    logBleedingForDate,
    denyPeriodOnDate,
    logSymptom,
    removeSymptom
  } = useCycle();
  const toast = useToast();
  const isFuture = selectedDate > todayDate;
  const log = logs[selectedDate];

  const existingBleeding = Boolean(log?.isPeriod || log?.isIrregularBleeding);
  const initialChoice: 'none' | 'period' | 'irregular' = log?.isPeriod
    ? 'period'
    : log?.isIrregularBleeding
      ? 'irregular'
      : 'none';

  const [bleedingChoice, setBleedingChoice] = useState<'none' | 'period' | 'irregular'>(initialChoice);
  const [flow, setFlow] = useState<FlowIntensity>(log?.flow || settings.typicalFlowIntensity || 'medium');
  const [isCycleStart, setIsCycleStart] = useState<boolean>(
    Boolean(log?.isCycleStart || settings.lastPeriodStartDate === selectedDate)
  );

  // Sincronizar estado cuando se abre para una nueva fecha
  useEffect(() => {
    if (isOpen) {
      const currentLog = logs[selectedDate];
      setBleedingChoice(
        currentLog?.isPeriod ? 'period' : currentLog?.isIrregularBleeding ? 'irregular' : 'none'
      );
      setFlow(currentLog?.flow || settings.typicalFlowIntensity || 'medium');
      setIsCycleStart(Boolean(currentLog?.isCycleStart || settings.lastPeriodStartDate === selectedDate));
    }
  }, [isOpen, selectedDate, logs, settings]);

  const isCalmDay = day.symptoms.some(s => s.id === 'calm_day');
  const isApproachingOrPeriod = day.isPeriod || day.dayOfCycle === 1;

  const handleToggleCalmDay = () => {
    if (isCalmDay) {
      removeSymptom(selectedDate, 'calm_day');
    } else {
      logSymptom(selectedDate, {
        id: 'calm_day',
        name: 'Día normal sin molestias',
        category: 'general',
        emoji: '✨'
      });
    }
  };

  const handleSaveAndClose = () => {
    try {
      if (bleedingChoice === 'period') {
        logBleedingForDate(selectedDate, {
          flow: flow === 'spotting' ? 'light' : flow,
          isCycleStart,
          isIrregular: false
        });
        toast.success(isCycleStart ? 'Inicio de ciclo y síntomas guardados' : 'Regla y síntomas guardados');
      } else if (bleedingChoice === 'irregular') {
        logBleedingForDate(selectedDate, {
          flow: flow || 'spotting',
          isCycleStart: false,
          isIrregular: true
        });
        toast.success('Sangrado irregular y síntomas guardados');
      } else {
        // 'none' - sin sangrado
        if (existingBleeding) {
          denyPeriodOnDate(selectedDate);
        }
        // Si no hay ningún síntoma y el usuario dejó sin sangrado, registrar día normal
        if (isCalmDay || day.symptoms.length === 0) {
          if (!day.symptoms.some(s => s.id === 'calm_day')) {
            logSymptom(selectedDate, {
              id: 'calm_day',
              name: 'Día normal sin molestias',
              category: 'general',
              emoji: '✨'
            });
          }
        }
        toast.success('Día registrado como normal sin sangrado');
      }
      onClose();
    } catch {
      toast.error('No se pudo guardar el registro');
    }
  };

  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dateDesc = isNaN(dateObj.getTime())
    ? selectedDate
    : dateObj.toLocaleDateString('es-ES', { dateStyle: 'long' });

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Registro diario"
      description={dateDesc}
      footer={
        <button type="button" onClick={handleSaveAndClose} className={modalPrimaryButton}>
          <Check size={17} aria-hidden="true" />
          Listo
        </button>
      }
    >
      {isFuture ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card-inner)] p-4 text-center my-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Este día todavía no ha llegado</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            No es posible registrar síntomas ni notas de una fecha futura. Podrás completar tu diario cuando llegue este día.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SECCIÓN 1: ¿Has tenido sangrado hoy? */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              ¿Has tenido sangrado hoy?
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {/* Opción 1: Sin sangrado */}
              <button
                type="button"
                aria-pressed={bleedingChoice === 'none'}
                onClick={() => setBleedingChoice('none')}
                className={`${modalChoice} flex flex-col items-center justify-center text-center gap-1 py-2.5 ${
                  bleedingChoice === 'none'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-xs'
                    : modalUnselected
                }`}
              >
                <CheckCircle2 size={18} aria-hidden="true" />
                <span className="text-xs font-semibold">Sin sangrado</span>
                <span className="text-[10.5px] opacity-75">Día normal</span>
              </button>

              {/* Opción 2: Regla / Adelantada */}
              <button
                type="button"
                aria-pressed={bleedingChoice === 'period'}
                onClick={() => {
                  setBleedingChoice('period');
                  if (isCalmDay) removeSymptom(selectedDate, 'calm_day');
                }}
                className={`${modalChoice} flex flex-col items-center justify-center text-center gap-1 py-2.5 ${
                  bleedingChoice === 'period'
                    ? 'border-[var(--rose)] bg-[var(--rose-soft)] text-[var(--rose)] font-semibold shadow-xs'
                    : modalUnselected
                }`}
              >
                <Droplets size={18} aria-hidden="true" />
                <span className="text-xs font-semibold">
                  {isApproachingOrPeriod ? 'Tengo la regla' : 'Se me adelantó'}
                </span>
                <span className="text-[10.5px] opacity-75">Regla menstrual</span>
              </button>

              {/* Opción 3: Sangrado irregular */}
              <button
                type="button"
                aria-pressed={bleedingChoice === 'irregular'}
                onClick={() => {
                  setBleedingChoice('irregular');
                  if (isCalmDay) removeSymptom(selectedDate, 'calm_day');
                }}
                className={`${modalChoice} flex flex-col items-center justify-center text-center gap-1 py-2.5 ${
                  bleedingChoice === 'irregular'
                    ? 'border-[#d97706] bg-[#fef3c7] text-[#b45309] dark:bg-[#78350f]/30 dark:text-[#fcd34d] font-semibold shadow-xs'
                    : modalUnselected
                }`}
              >
                <Droplets size={18} aria-hidden="true" />
                <span className="text-xs font-semibold">Sangrado irregular</span>
                <span className="text-[10.5px] opacity-75">Manchado / leve</span>
              </button>
            </div>
          </fieldset>

          {/* Opciones contextuales según el tipo de sangrado */}
          {bleedingChoice === 'period' && (
            <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-inner)] p-3">
              <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCycleStart}
                  onChange={e => setIsCycleStart(e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--rose)] cursor-pointer"
                />
                <span>Es el primer día de un nuevo ciclo (inicio de regla)</span>
              </label>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Intensidad del flujo:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['light', 'medium', 'heavy', 'very_heavy'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      aria-pressed={flow === lvl}
                      onClick={() => setFlow(lvl)}
                      className={`${modalChoice} py-1.5 text-center text-xs ${
                        flow === lvl
                          ? 'border-[var(--rose)] bg-[var(--rose-soft)] text-[var(--rose)] font-semibold'
                          : modalUnselected
                      }`}
                    >
                      {lvl === 'light' ? 'Ligero' : lvl === 'medium' ? 'Medio' : lvl === 'heavy' ? 'Abundante' : 'Muy abundante'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {bleedingChoice === 'irregular' && (
            <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-inner)] p-3">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                💧 El sangrado irregular o manchado se registra como observación y no iniciará un nuevo ciclo.
              </p>
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Intensidad:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['spotting', 'light', 'medium'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      aria-pressed={flow === lvl}
                      onClick={() => setFlow(lvl)}
                      className={`${modalChoice} py-1.5 text-center text-xs ${
                        flow === lvl
                          ? 'border-[#d97706] bg-[#fef3c7] text-[#b45309] dark:bg-[#78350f]/30 dark:text-[#fcd34d] font-semibold'
                          : modalUnselected
                      }`}
                    >
                      {lvl === 'spotting' ? 'Manchado' : lvl === 'light' ? 'Ligero' : 'Medio'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {bleedingChoice === 'none' && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-inner)] p-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">¿Todo en calma hoy?</p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Puedes registrar el día como normal o añadir sensaciones abajo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleCalmDay}
                className={`aura-button sm ${isCalmDay ? 'primary' : ''}`}
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
              >
                <Sparkles size={13} aria-hidden="true" />
                {isCalmDay ? 'Día tranquilo marcado' : 'Día normal sin dolor'}
              </button>
            </div>
          )}

          {/* SECCIÓN 2: Síntomas y sensaciones */}
          <div className="border-t border-[var(--border-subtle)] pt-3">
            <CycleStatusCard />
          </div>

          {/* SECCIÓN 3: Opciones complementarias */}
          <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
            {onOpenSymptothermal && (
              <button type="button" onClick={onOpenSymptothermal} className={modalSecondaryButton}>
                <Thermometer size={18} aria-hidden="true" />
                Temperatura y moco
              </button>
            )}
            {onOpenMedications && (
              <button type="button" onClick={onOpenMedications} className={modalSecondaryButton}>
                <Pill size={18} aria-hidden="true" />
                Medicación
              </button>
            )}
          </div>

          {/* SECCIÓN 4: Entrada libre de notas */}
          <NaturalInputBar />
        </div>
      )}
    </ModalFrame>
  );
}
