import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import type { MedicationItem } from '../../types/cycle';
import { ModalFrame } from './ModalFrame';
import { modalField, modalPrimaryButton, modalSecondaryButton } from './modalStyles';

export function MedicationTrackerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { selectedDate, logs, logMedicationsForDate } = useCycle();
  const [medications, setMedications] = useState<MedicationItem[]>(() => logs[selectedDate]?.medications?.map(item => ({ ...item })) || []);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<MedicationItem['type']>('medication');
  const [error, setError] = useState('');
  const add = () => {
    if (!name.trim()) { setError('Escribe el nombre del medicamento.'); return; }
    if (medications.some(item => item.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase() && item.time === (time || undefined))) {
      setError('Esta toma ya está en la lista. Puedes registrar otra hora.'); return;
    }
    setMedications(items => [...items, { id: crypto.randomUUID(), name: name.trim(), dose: dose.trim() || undefined, time: time || undefined, type, taken: false }]);
    setName(''); setDose(''); setTime(''); setError('');
  };
  const save = () => {
    if (name.trim() || dose.trim() || time) { setError('Añade la toma pendiente antes de guardar.'); return; }
    try { logMedicationsForDate(selectedDate, medications); onClose(); }
    catch { setError('No se han guardado las tomas. Vuelve a intentarlo.'); }
  };
  return <ModalFrame isOpen={isOpen} onClose={onClose} title="Medicación" description={new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { dateStyle: 'long' })}
    footer={<><button type="button" onClick={onClose} className={modalSecondaryButton}>Cancelar</button><button type="button" onClick={save} className={modalPrimaryButton}><Check size={17} aria-hidden="true" /> Guardar tomas</button></>}>
    <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">{medications.length ? `${medications.filter(item => item.taken).length} de ${medications.length} tomas registradas` : 'No hay medicación registrada para esta fecha.'}</p>
    <ul className="divide-y divide-[var(--border-subtle)]">{medications.map(item => <li key={item.id} className="flex items-center gap-2 py-2">
      <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-sm">
        <input type="checkbox" checked={item.taken} className="h-5 w-5 shrink-0 accent-[var(--accent)]" onChange={() => setMedications(items => items.map(medication => medication.id === item.id ? { ...medication, taken: !medication.taken } : medication))} />
        <span className="min-w-0 break-words"><span className="block font-semibold">{item.name}</span><span className="block text-[var(--text-secondary)]">{[item.dose, item.time].filter(Boolean).join(' · ')}</span></span>
      </label>
      <button type="button" className="aura-icon-button h-11 w-11 shrink-0" aria-label={`Eliminar ${item.name}`} onClick={() => setMedications(items => items.filter(medication => medication.id !== item.id))}><Trash2 size={18} aria-hidden="true" /></button>
    </li>)}</ul>
    <fieldset className="space-y-3 border-t border-[var(--border-subtle)] pt-4"><legend className="pr-2 text-sm font-semibold">Añadir una toma</legend>
      <label className="block space-y-1 text-sm">Nombre<input value={name} onChange={event => setName(event.target.value)} maxLength={120} className={modalField} /></label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">Dosis (opcional)<input value={dose} onChange={event => setDose(event.target.value)} maxLength={80} className={modalField} /></label>
        <label className="block space-y-1 text-sm">Hora (opcional)<input type="time" value={time} onChange={event => setTime(event.target.value)} className={modalField} /></label>
      </div>
      <label className="block space-y-1 text-sm">Tipo<select value={type} onChange={event => setType(event.target.value as MedicationItem['type'])} className={modalField}><option value="medication">Medicación</option><option value="pill">Anticonceptivo</option><option value="supplement">Suplemento</option></select></label>
      <button type="button" onClick={add} className={modalSecondaryButton}><Plus size={17} aria-hidden="true" /> Añadir toma</button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
  </ModalFrame>;
}
