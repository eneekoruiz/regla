import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import type { IntimacyLog } from '../../types/cycle';
import { ModalFrame } from './ModalFrame';
import { modalChoice, modalField, modalPrimaryButton, modalSecondaryButton, modalSelected, modalUnselected } from './modalStyles';

export function IntimacyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { selectedDate, logs, logIntimacyForDate } = useCycle();
  const existing = logs[selectedDate]?.intimacyLog;
  const [activity, setActivity] = useState<IntimacyLog['activity']>(existing?.activity || 'none');
  const [hadEmergencyPill, setHadEmergencyPill] = useState(Boolean(existing?.hadEmergencyPill));
  const [hadOrgasm, setHadOrgasm] = useState(Boolean(existing?.hadOrgasm));
  const [hadPain, setHadPain] = useState(Boolean(existing?.hadPain));
  const [libido, setLibido] = useState<IntimacyLog['libido']>(existing?.libido || 'normal');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [error, setError] = useState('');
  const save = (remove = false) => {
    try {
      logIntimacyForDate(selectedDate, remove ? null : { activity, hadEmergencyPill, hadOrgasm, hadPain, libido, notes: notes.trim() || undefined });
      onClose();
    } catch { setError('No se ha guardado el registro. Vuelve a intentarlo.'); }
  };
  return <ModalFrame isOpen={isOpen} onClose={onClose} title="Intimidad" description={new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { dateStyle: 'long' })}
    footer={<>
      {existing && <button type="button" onClick={() => save(true)} className={modalSecondaryButton}><Trash2 size={17} aria-hidden="true" /> Quitar</button>}
      <button type="button" onClick={() => save()} className={modalPrimaryButton}><Check size={17} aria-hidden="true" /> Guardar registro</button>
    </>}>
    <fieldset><legend className="mb-2 text-sm font-semibold">Actividad</legend>
      <div className="grid grid-cols-2 gap-2">{([['none', 'Sin actividad'], ['protected', 'Con protección'], ['unprotected', 'Sin protección'], ['masturbation', 'Autoerotismo'], ['other', 'Otra actividad']] as const).map(([value, label]) =>
        <button type="button" key={value} aria-pressed={activity === value} onClick={() => setActivity(value)} className={`${modalChoice} ${activity === value ? modalSelected : modalUnselected}`}>{label}</button>)}</div>
    </fieldset>
    <div className="space-y-1">
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={hadEmergencyPill} onChange={event => setHadEmergencyPill(event.target.checked)} />Anticoncepción de urgencia</label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={hadOrgasm} onChange={event => setHadOrgasm(event.target.checked)} />Con orgasmo</label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={hadPain} onChange={event => setHadPain(event.target.checked)} />Con dolor</label>
    </div>
    <fieldset><legend className="mb-2 text-sm font-semibold">Deseo sexual</legend>
      <div className="grid grid-cols-3 gap-2">{([['low', 'Bajo'], ['normal', 'Habitual'], ['high', 'Alto']] as const).map(([value, label]) =>
        <button type="button" key={value} aria-pressed={libido === value} onClick={() => setLibido(value)} className={`${modalChoice} ${libido === value ? modalSelected : modalUnselected}`}>{label}</button>)}</div>
    </fieldset>
    <label className="block space-y-2 text-sm font-semibold">Notas<textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={4000} rows={3} className={modalField} /></label>
    {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
  </ModalFrame>;
}
