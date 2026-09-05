import { Plus, X, Check } from 'lucide-react';
import type { SymptomItem } from '../../types/cycle';
import { KNOWN_SYMPTOMS } from '../../utils/nlpParser';
import { modalChoice, modalSelected, modalUnselected } from '../Modals/modalStyles';

interface SymptomChipsProps {
  symptoms: SymptomItem[];
  onToggleSymptom?: (symptom: SymptomItem) => void;
  onRemove: (id: string) => void;
  onOpenPicker: () => void;
}
const COMMON_IDS = ['cramps_mild', 'cramps', 'fatigue', 'high_energy', 'cravings', 'low_mood', 'bloating', 'headache'];
export function SymptomChips({ symptoms, onToggleSymptom, onRemove, onOpenPicker }: SymptomChipsProps) {
  const selected = new Set(symptoms.map(symptom => symptom.id));
  const common = KNOWN_SYMPTOMS.filter(symptom => COMMON_IDS.includes(symptom.id));
  return <div className="space-y-3">
    {symptoms.length > 0 && <div className="flex flex-wrap gap-2">{symptoms.map(symptom => <button type="button" key={symptom.id} aria-label={`Eliminar ${symptom.name}`} onClick={() => onRemove(symptom.id)} className={`flex items-center gap-2 ${modalChoice} ${modalSelected}`}><span>{symptom.name}</span><X size={16} className="shrink-0" aria-hidden="true" /></button>)}</div>}
    {onToggleSymptom && <div className="flex flex-wrap gap-2">{common.map(symptom => <button type="button" key={symptom.id} aria-pressed={selected.has(symptom.id)} onClick={() => selected.has(symptom.id) ? onRemove(symptom.id) : onToggleSymptom(symptom)} className={`flex items-center gap-2 ${modalChoice} ${selected.has(symptom.id) ? modalSelected : modalUnselected}`}>{symptom.name}{selected.has(symptom.id) && <Check size={16} className="shrink-0" aria-hidden="true" />}</button>)}</div>}
    <button type="button" onClick={onOpenPicker} className={`flex items-center gap-2 ${modalChoice} ${modalUnselected}`}><Plus size={18} aria-hidden="true" />Todos los síntomas</button>
  </div>;
}
