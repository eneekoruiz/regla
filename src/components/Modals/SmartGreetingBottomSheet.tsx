import { useState } from 'react';
import { Check } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { KNOWN_SYMPTOMS } from '../../utils/nlpParser';
import type { SymptomItem } from '../../types/cycle';
import { ModalFrame } from './ModalFrame';
import { modalChoice, modalPrimaryButton, modalSecondaryButton, modalSelected, modalUnselected } from './modalStyles';

const QUICK_IDS = ['cramps_mild', 'backache', 'headache', 'bloating', 'cravings', 'fatigue', 'high_energy', 'good_mood', 'mood_swings', 'peaceful'];
export function SmartGreetingBottomSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { todayDate, logs, logMultipleSymptoms, logBleedingForDate } = useCycle();
  const [selected, setSelected] = useState<string[]>([]);
  const [bleeding, setBleeding] = useState<'none' | 'spotting' | 'medium'>('none');
  const [cycleStart, setCycleStart] = useState(Boolean(logs[todayDate]?.isCycleStart));
  const [error, setError] = useState('');
  const dismiss = () => { try { localStorage.setItem('regla_greeted_' + todayDate, 'true'); } catch { /* Dismissal remains available when storage is blocked. */ } onClose(); };
  const save = (well = false) => {
    try {
      if (bleeding !== 'none') logBleedingForDate(todayDate, { flow: bleeding, isCycleStart: bleeding === 'medium' && cycleStart, isIrregular: bleeding === 'spotting' });
      const symptoms: SymptomItem[] = KNOWN_SYMPTOMS.filter(item => selected.includes(item.id));
      if (well) symptoms.push({ id: 'feeling_great', name: 'Me siento bien', category: 'general', emoji: '' });
      if (symptoms.length) logMultipleSymptoms(todayDate, symptoms);
      dismiss();
    } catch { setError('No se ha guardado el registro. Vuelve a intentarlo.'); }
  };
  return <ModalFrame isOpen={isOpen} onClose={dismiss} title="¿Cómo te encuentras hoy?"
    footer={<><button type="button" onClick={() => save(true)} className={modalSecondaryButton}>Me siento bien</button><button type="button" disabled={!selected.length && bleeding === 'none'} onClick={() => save()} className={modalPrimaryButton}><Check size={17} aria-hidden="true" />Guardar</button></>}>
    <fieldset><legend className="mb-2 text-sm font-semibold">Sangrado</legend><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{([['none', 'Sin registrar'], ['spotting', 'Manchado'], ['medium', 'Regla']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={bleeding === value} onClick={() => setBleeding(value)} className={`${modalChoice} ${bleeding === value ? modalSelected : modalUnselected}`}>{label}</button>)}</div></fieldset>
    {bleeding === 'medium' && <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={cycleStart} onChange={event => setCycleStart(event.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />Es el primer día de un nuevo ciclo</label>}
    <div className="grid grid-cols-2 gap-2">{KNOWN_SYMPTOMS.filter(item => QUICK_IDS.includes(item.id)).map(item => <button key={item.id} type="button" aria-pressed={selected.includes(item.id)} onClick={() => setSelected(values => values.includes(item.id) ? values.filter(id => id !== item.id) : [...values, item.id])} className={`${modalChoice} ${selected.includes(item.id) ? modalSelected : modalUnselected}`}>{item.name}</button>)}</div>
    {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
  </ModalFrame>;
}
