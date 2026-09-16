import { useState } from 'react';
import { useCycle } from '../../hooks/useCycle';
import type { CyclePhase } from '../../types/cycle';
import { getCareGuide, GUIDE_PHASES } from '../../services/careGuide';
import { BIOLOGICAL_LABELS } from '../../services/biologicalMachine';
import { ModalFrame } from './ModalFrame';
import { modalChoice, modalSelected, modalUnselected } from './modalStyles';
export function CycleSyncingModal({ isOpen, onClose, initialPhase }: { isOpen: boolean; onClose: () => void; initialPhase?: CyclePhase }) {
  const { currentDayInfo } = useCycle();
  const [phase, setPhase] = useState<CyclePhase>(initialPhase || currentDayInfo.phase);
  const guide = getCareGuide(phase);
  return <ModalFrame isOpen={isOpen} onClose={onClose} title="Guía de fases">
    <div className="grid grid-cols-2 gap-2" aria-label="Fases del ciclo">{GUIDE_PHASES.map(value => <button type="button" key={value} aria-pressed={phase === value} onClick={() => setPhase(value)} className={modalChoice + ' ' + (phase === value ? modalSelected : modalUnselected)}>{BIOLOGICAL_LABELS[value]}</button>)}</div>
    <h3 className="font-semibold">{guide.title}</h3><p>{guide.description}</p>
    {guide.sections.map(section => <section key={section.title}><h3 className="mb-2 font-semibold">{section.title}</h3><ul className="list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">{section.items.map(item => <li key={item}>{item}</li>)}</ul></section>)}
    <a className="text-action" href="https://www.nhs.uk/symptoms/period-pain/" target="_blank" rel="noreferrer">Fuente: NHS · Dolor menstrual</a>
  </ModalFrame>;
}
