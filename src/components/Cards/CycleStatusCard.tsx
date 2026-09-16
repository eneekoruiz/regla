import { useMemo, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { KNOWN_SYMPTOMS } from '../../utils/nlpParser';
import { rankSymptoms } from '../../services/symptomPreferences';
import type { SymptomCategory, SymptomItem } from '../../types/cycle';
import { modalChoice, modalSelected, modalUnselected } from '../Modals/modalStyles';

const categories: { id: SymptomCategory; label: string }[] = [
  { id: 'flow', label: 'Flujo' }, { id: 'mood', label: 'Ánimo' }, { id: 'pain', label: 'Dolor' }, { id: 'energy', label: 'Energía' },
  { id: 'digestion', label: 'Digestión' }, { id: 'sleep', label: 'Sueño' }, { id: 'skin', label: 'Piel' }, { id: 'mucus', label: 'Moco cervical' },
  { id: 'cravings', label: 'Apetito' }, { id: 'libido', label: 'Deseo' }, { id: 'contraception', label: 'Anticoncepción' }, { id: 'ovulation_test', label: 'Test de ovulación' }, { id: 'general', label: 'General' },
];
export function CycleStatusCard() {
  const { currentDayInfo, selectedDate, logs, logSymptom, removeSymptom } = useCycle();
  const [category, setCategory] = useState<SymptomCategory>('flow');
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const ranked = useMemo(() => rankSymptoms(KNOWN_SYMPTOMS, logs), [logs]);
  const selected = new Set(currentDayInfo.symptoms.map(s => s.id));
  const toggle = (symptom: SymptomItem) => { try { if (selected.has(symptom.id)) removeSymptom(selectedDate, symptom.id); else logSymptom(selectedDate, symptom); setError(''); } catch { setError('No se ha guardado el cambio. Revisa el almacenamiento.'); } };
  return <section className="symptom-discovery" aria-label="Síntomas del día">
    <p className="text-sm text-[var(--text-secondary)]">Toca para guardar. Tus opciones habituales aparecen primero.</p>
    {currentDayInfo.symptoms.length > 0 && <div className="symptom-selection">{currentDayInfo.symptoms.map(symptom => <button key={symptom.id} type="button" aria-label={'Eliminar ' + symptom.name} className={modalChoice + ' ' + modalSelected} onClick={() => toggle(symptom)}>{symptom.name}<X size={14}/></button>)}</div>}
    <div className="symptom-categories" role="group" aria-label="Categorías de síntomas">{categories.slice(0, expanded ? undefined : 4).map(item => <button type="button" key={item.id} className={modalChoice + ' ' + (category === item.id ? modalSelected : modalUnselected)} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
    <button type="button" className="text-action" aria-expanded={expanded} onClick={() => { setExpanded(!expanded); if (expanded) setCategory('flow'); }}>{expanded ? 'Menos opciones' : 'Más opciones'}<ChevronDown size={15}/></button>
    <div className="symptom-options">{ranked.filter(item => item.category === category).map(symptom => <button type="button" key={symptom.id} aria-pressed={selected.has(symptom.id)} className={modalChoice + ' ' + (selected.has(symptom.id) ? modalSelected : modalUnselected)} onClick={() => toggle(symptom)}>{symptom.name}{selected.has(symptom.id) && <Check size={15}/>}</button>)}</div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
