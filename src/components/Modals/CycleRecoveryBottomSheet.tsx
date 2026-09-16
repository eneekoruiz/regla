import { useState } from 'react';
import { Heart } from 'lucide-react';
import { ModalFrame } from './ModalFrame';
import type { CycleRecovery } from '../../services/predictiveEngine';
import { parseDateKey } from '../../utils/dateKey';

interface Props {
  recovery: CycleRecovery;
  today: string;
  onConfirm: (start: string, end: string) => void;
  onSkip: () => void;
}

export function CycleRecoveryBottomSheet({ recovery, today, onConfirm, onSkip }: Props) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(recovery.startDate);
  const [end, setEnd] = useState(recovery.endDate);
  const [error, setError] = useState('');
  const label = (date: string) => parseDateKey(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const confirm = () => {
    setError('');
    try {
      if (start <= recovery.anchor) throw new Error('El inicio debe ser posterior a tu última regla registrada.');
      onConfirm(start, end);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se han guardado las fechas. Inténtalo de nuevo.'); }
  };
  return <ModalFrame isOpen onClose={onSkip} title="Volvamos a tu ritmo" className="recovery-dialog">
    <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Heart size={21} aria-hidden="true"/><span className="text-sm">Tu historia, a tu ritmo</span></div>
    <p className="text-base leading-relaxed">Parece que no nos hemos visto en un tiempo. Para que tus predicciones sigan siendo mágicas, ¿tuviste la regla más o menos entre el <strong>{label(recovery.startDate)}</strong> y el <strong>{label(recovery.endDate)}</strong>?</p>
    <p className="text-sm text-[var(--text-secondary)]">Son fechas orientativas. Solo guardaremos lo que tú confirmes.</p>
    {editing && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-sm">Inicio de la regla<input className="date-picker mt-1 min-h-11 w-full" type="date" aria-label="Inicio de la regla" value={start} min={recovery.anchor} max={today} onChange={event => setStart(event.target.value)}/></label>
      <label className="text-sm">Final de la regla<input className="date-picker mt-1 min-h-11 w-full" type="date" aria-label="Final de la regla" value={end} min={start} max={today} onChange={event => setEnd(event.target.value)}/></label>
    </div>}
    {error && <p role="alert" className="text-sm text-[var(--text-primary)]">{error}</p>}
    <div className="flex flex-col gap-2">
      <button type="button" className="aura-button primary w-full" onClick={confirm}>{editing ? 'Guardar fechas' : 'Sí, esas fechas'}</button>
      {!editing && <button type="button" className="aura-button w-full" onClick={() => setEditing(true)}>Fue un poco antes/después</button>}
      <button type="button" className="text-action min-h-11 justify-center" onClick={onSkip}>Saltar</button>
    </div>
  </ModalFrame>;
}
