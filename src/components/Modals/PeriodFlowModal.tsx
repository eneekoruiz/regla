import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import type { FlowIntensity } from '../../types/cycle';
import { ModalFrame } from './ModalFrame';
import { modalChoice, modalSecondaryButton, modalUnselected } from './modalStyles';

const FLOW_LEVELS: { id: FlowIntensity; label: string }[] = [
  { id: 'spotting', label: 'Manchado' }, { id: 'light', label: 'Ligero' }, { id: 'medium', label: 'Medio' },
  { id: 'heavy', label: 'Abundante' }, { id: 'very_heavy', label: 'Muy abundante' }
];
export function PeriodFlowModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { selectedDate, logBleedingForDate, denyPeriodOnDate, logs, settings } = useCycle();
  const log = logs[selectedDate];
  const existing = Boolean(log?.isPeriod || log?.isIrregularBleeding);
  const [hasBleeding, setHasBleeding] = useState(existing);
  const [bleedingType, setBleedingType] = useState<'period' | 'irregular'>(log?.isIrregularBleeding ? 'irregular' : 'period');
  const [flow, setFlow] = useState<FlowIntensity>(log?.flow || settings.typicalFlowIntensity || 'medium');
  const [isCycleStart, setIsCycleStart] = useState(Boolean(log?.isCycleStart || settings.lastPeriodStartDate === selectedDate));
  const [error, setError] = useState('');
  const selected = 'border-[var(--rose)] bg-[var(--rose-soft)] text-[var(--rose)]';
  const save = (remove = false) => {
    try {
      if (hasBleeding && !remove) logBleedingForDate(selectedDate, { flow, isCycleStart: bleedingType === 'period' && isCycleStart, isIrregular: bleedingType === 'irregular' });
      else denyPeriodOnDate(selectedDate);
      onClose();
    } catch { setError('No se ha guardado el registro. Vuelve a intentarlo.'); }
  };
  return <ModalFrame isOpen={isOpen} onClose={onClose} title="Registro de sangrado" description={new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { dateStyle: 'long' })}
    footer={<>
      {existing && <button type="button" onClick={() => save(true)} className={modalSecondaryButton}><Trash2 size={17} aria-hidden="true" /> Quitar</button>}
      <button type="button" onClick={() => save()} className="aura-button rose min-w-0"><Check size={17} aria-hidden="true" /> Guardar registro</button>
    </>}>
    <fieldset><legend className="mb-2 text-sm font-semibold">¿Hubo sangrado?</legend>
      <div className="grid grid-cols-2 gap-2">{[true, false].map(value => <button key={String(value)} type="button" aria-pressed={hasBleeding === value} onClick={() => setHasBleeding(value)} className={`${modalChoice} ${hasBleeding === value ? selected : modalUnselected}`}>{value ? 'Sí, hubo sangrado' : 'Sin sangrado'}</button>)}</div>
    </fieldset>
    {hasBleeding && <>
      <fieldset><legend className="mb-2 text-sm font-semibold">Tipo de sangrado</legend>
        <div className="grid grid-cols-2 gap-2">{(['period', 'irregular'] as const).map(value => <button key={value} type="button" aria-pressed={bleedingType === value} onClick={() => setBleedingType(value)} className={`${modalChoice} ${bleedingType === value ? selected : modalUnselected}`}>{value === 'period' ? 'Regla menstrual' : 'Sangrado irregular'}</button>)}</div>
      </fieldset>
      {bleedingType === 'period' ? <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={isCycleStart} onChange={event => setIsCycleStart(event.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--rose)]" />Es el primer día de un nuevo ciclo</label>
        : <p className="text-sm text-[var(--text-secondary)]">El sangrado irregular no iniciará un nuevo ciclo.</p>}
      <fieldset><legend className="mb-2 text-sm font-semibold">Intensidad del flujo</legend>
        <div className="grid grid-cols-2 gap-2">{FLOW_LEVELS.map(item => <button key={item.id} type="button" aria-pressed={flow === item.id} onClick={() => setFlow(item.id)} className={`${modalChoice} ${flow === item.id ? selected : modalUnselected}`}>{item.label}</button>)}</div>
      </fieldset>
    </>}
    {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
  </ModalFrame>;
}
