import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { KNOWN_SYMPTOMS } from '../../utils/nlpParser';
import type { SymptomItem, SymptomCategory } from '../../types/cycle';
import { ModalFrame } from './ModalFrame';
import { modalChoice, modalField, modalPrimaryButton, modalSelected, modalUnselected } from './modalStyles';

const groups: { id: string; label: string; categories: SymptomCategory[] }[] = [
  { id: 'all', label: 'Todos', categories: [] },
  { id: 'physical', label: 'Cuerpo', categories: ['pain', 'digestion', 'skin', 'sleep', 'flow'] },
  { id: 'mood', label: 'Ánimo', categories: ['mood', 'energy', 'cravings', 'general'] },
  { id: 'intimacy', label: 'Intimidad', categories: ['intimacy', 'contraception', 'ovulation_test', 'mucus', 'libido'] }
];
export function SymptomPickerModal({ isOpen, onClose, currentSymptoms, onToggleSymptom }: { isOpen: boolean; onClose: () => void; currentSymptoms: SymptomItem[]; onToggleSymptom: (symptom: SymptomItem) => void }) {
  const [group, setGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const selected = new Set(currentSymptoms.map(symptom => symptom.id));
  const categories = groups.find(item => item.id === group)?.categories || [];
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const filtered = KNOWN_SYMPTOMS.filter(item => (!categories.length || categories.includes(item.category)) && normalize(item.name).includes(normalize(search.trim())));
  return <ModalFrame isOpen={isOpen} onClose={onClose} title="Síntomas y sensaciones" description={`${currentSymptoms.length} registrados`}
    footer={<button type="button" onClick={onClose} className={modalPrimaryButton}><Check size={17} aria-hidden="true" /> Listo</button>}>
    <label className="block space-y-2 text-sm font-semibold"><span className="flex items-center gap-2"><Search size={16} aria-hidden="true" />Buscar síntomas</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} className={modalField} /></label>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Categorías">{groups.map(item => <button key={item.id} type="button" aria-pressed={group === item.id} onClick={() => setGroup(item.id)} className={`${modalChoice} ${group === item.id ? modalSelected : modalUnselected}`}>{item.label}</button>)}</div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{filtered.map(item => <button key={item.id} type="button" aria-pressed={selected.has(item.id)} onClick={() => {
      try { onToggleSymptom({ id: item.id, name: item.name, category: item.category, emoji: item.emoji, severity: 'moderate' }); setError(''); }
      catch { setError('No se ha guardado el síntoma. Vuelve a intentarlo.'); }
    }} className={`flex items-center justify-between gap-2 ${modalChoice} ${selected.has(item.id) ? modalSelected : modalUnselected}`}><span>{item.name}</span>{selected.has(item.id) && <Check size={18} className="shrink-0" aria-hidden="true" />}</button>)}</div>
    {filtered.length === 0 && <p role="status" className="text-sm text-[var(--text-secondary)]">No hay síntomas con ese nombre.</p>}
    {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
  </ModalFrame>;
}
