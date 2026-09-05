import { useState } from 'react';
import { Check } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import type { CervicalMucusType } from '../../types/cycle';
import { ModalFrame } from './ModalFrame';
import { modalChoice, modalField, modalPrimaryButton, modalSecondaryButton, modalSelected, modalUnselected } from './modalStyles';

const mucusOptions: { type: CervicalMucusType; label: string; desc: string }[] = [
  { type: 'dry', label: 'Seco', desc: 'Sin humedad visible.' }, { type: 'sticky', label: 'Pegajoso', desc: 'Denso o pastoso.' },
  { type: 'creamy', label: 'Cremoso', desc: 'Blanquecino, similar a una loción.' }, { type: 'egg_white', label: 'Clara de huevo', desc: 'Transparente y elástico.' }
];
export function SymptothermalModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { selectedDate, logs, logSymptothermalForDate } = useCycle();
  const log = logs[selectedDate];
  const [mucus, setMucus] = useState<CervicalMucusType | undefined>(log?.cervicalMucus);
  const [temperature, setTemperature] = useState(log?.bbt?.toString() ?? '');
  const [error, setError] = useState('');
  const save = () => {
    const value = temperature.trim() === '' ? undefined : Number(temperature.replace(',', '.'));
    if (value !== undefined && (!Number.isFinite(value) || value < 30 || value > 45)) { setError('Introduce una temperatura entre 30 y 45 °C o deja el campo vacío.'); return; }
    try { logSymptothermalForDate(selectedDate, { cervicalMucus: mucus, bbt: value }); onClose(); }
    catch { setError('No se ha guardado el registro. Vuelve a intentarlo.'); }
  };
  return <ModalFrame isOpen={isOpen} onClose={onClose} title="Registro sintotérmico" description={new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { dateStyle: 'long' })}
    footer={<><button type="button" onClick={onClose} className={modalSecondaryButton}>Cancelar</button><button type="button" onClick={save} className={modalPrimaryButton}><Check size={17} aria-hidden="true" /> Guardar registro</button></>}>
    <fieldset><legend className="mb-2 text-sm font-semibold">Moco cervical</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{mucusOptions.map(option => <button key={option.type} type="button" aria-pressed={mucus === option.type} onClick={() => setMucus(mucus === option.type ? undefined : option.type)} className={`${modalChoice} ${mucus === option.type ? modalSelected : modalUnselected}`}>
        <span className="block font-semibold">{option.label}</span><span className="mt-1 block text-sm">{option.desc}</span>
      </button>)}</div>
    </fieldset>
    <label className="block space-y-2 text-sm font-semibold">Temperatura basal (°C)<input type="text" inputMode="decimal" value={temperature} onChange={event => { setTemperature(event.target.value); setError(''); }} placeholder="Sin registrar" aria-invalid={Boolean(error)} aria-describedby={error ? 'temperature-error' : undefined} className={modalField} /></label>
    <p className="text-sm text-[var(--text-secondary)]">Estas observaciones forman parte de tu registro personal. No confirman por sí solas la ovulación.</p>
    {error && <p id="temperature-error" role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
  </ModalFrame>;
}
