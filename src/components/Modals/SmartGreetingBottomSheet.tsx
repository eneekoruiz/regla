import { useState } from 'react';
import { ArrowRight, Heart, Minus, Smile } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { ModalFrame } from './ModalFrame';
import type { SymptomItem } from '../../types/cycle';

const choices: { label: string; icon: typeof Heart; symptom: SymptomItem }[] = [
  { label: 'Me siento bien', icon: Smile, symptom: { id: 'feeling_great', name: 'Me siento bien', category: 'general', emoji: '' } },
  { label: 'Tengo molestias', icon: Heart, symptom: { id: 'general_discomfort', name: 'Molestias', category: 'general', emoji: '' } },
];
export function SmartGreetingBottomSheet({ isOpen, onClose, onOpenFull }: { isOpen: boolean; onClose: () => void; onOpenFull: () => void }) {
  const { todayDate, logMultipleSymptoms } = useCycle();
  const [error, setError] = useState('');
  const save = (symptom: SymptomItem) => {
    try { logMultipleSymptoms(todayDate, [symptom]); onClose(); }
    catch { setError('No se ha guardado. Comprueba el almacenamiento y vuelve a intentarlo.'); }
  };
  return <ModalFrame isOpen={isOpen} onClose={onClose} className="greeting-sheet" title="Hola, ¿has notado algún síntoma menstrual hoy?" description="Un momento para ti. Puedes dejarlo para después.">
    <div className="greeting-choices">{choices.map(({ label, icon: Icon, symptom }) => <button className="greeting-choice" type="button" key={label} onClick={() => save(symptom)}><Icon size={22}/>{label}</button>)}<button className="greeting-choice" type="button" onClick={onClose}><Minus size={22}/>Ahora no</button></div>
    <button type="button" className="text-action" onClick={onOpenFull}>Abrir registro completo<ArrowRight size={16}/></button>
    {error && <p role="alert">{error}</p>}
  </ModalFrame>;
}
