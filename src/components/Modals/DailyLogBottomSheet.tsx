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
    logSymptom,
    removeSymptom
  } = useCycle();
  const toast = useToast();
  const isFuture = selectedDate > todayDate;
  const log = logs[selectedDate];

  const isCalmDay = day.symptoms.some(s => s.id === 'calm_day');

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
      toast.success('Síntomas y notas guardados');
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
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card-inner)] p-3">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">¿Todo en calma hoy?</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Marca este día como normal si no tienes molestias ni síntomas a destacar.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleCalmDay}
              className={`aura-button sm ${isCalmDay ? 'primary' : ''}`}
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            >
              <Sparkles size={13} aria-hidden="true" />
              {isCalmDay ? 'Tranquilo' : 'Día normal'}
            </button>
          </div>

          {/* SECCIÓN 2: Síntomas y sensaciones */}
          <div className="pt-2">
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
