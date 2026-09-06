import { Pill, Thermometer } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { CycleStatusCard } from '../Cards/CycleStatusCard';
import { NaturalInputBar } from '../Input/NaturalInputBar';
import { ModalFrame } from './ModalFrame';
import { modalSecondaryButton } from './modalStyles';

export function DailyLogBottomSheet({ isOpen, onClose, onOpenSymptothermal, onOpenMedications }: { isOpen: boolean; onClose: () => void; onOpenSymptothermal?: () => void; onOpenMedications?: () => void }) {
  const { selectedDate, todayDate } = useCycle();
  const isFuture = selectedDate > todayDate;

  return <ModalFrame isOpen={isOpen} onClose={onClose} title="Síntomas y bienestar" description={new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { dateStyle: 'long' })}>
    <CycleStatusCard />
    {isFuture ? (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card-inner)] p-4 text-center my-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Este día todavía no ha llegado</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
          No es posible registrar síntomas ni notas de una fecha futura. Podrás completar tu diario cuando llegue este día.
        </p>
      </div>
    ) : (
      <>
        <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
          {onOpenSymptothermal && <button type="button" onClick={onOpenSymptothermal} className={modalSecondaryButton}><Thermometer size={18} aria-hidden="true" />Sintotérmico</button>}
          {onOpenMedications && <button type="button" onClick={onOpenMedications} className={modalSecondaryButton}><Pill size={18} aria-hidden="true" />Medicación</button>}
        </div>
        <NaturalInputBar />
      </>
    )}
  </ModalFrame>;
}
