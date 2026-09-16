import { useMemo, useState } from 'react';
import { Leaf, MessageCircle } from 'lucide-react';
import { ModalFrame } from '../Modals/ModalFrame';
import { useCycle } from '../../hooks/useCycle';
import { generateDailyWellnessCarousel } from '../../services/wellnessAgent';

export function WellnessTipCard({ onOpenChat }: { onOpenChat?: (message?: string) => void }) {
  const { currentDayInfo, selectedDate, settings, hasEnoughData } = useCycle();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const hasCycle = hasEnoughData && currentDayInfo.dayOfCycle > 0 && currentDayInfo.phase !== 'unknown';
  const cards = useMemo(() => hasCycle ? generateDailyWellnessCarousel({
    date: selectedDate, dayOfCycle: currentDayInfo.dayOfCycle, phase: currentDayInfo.phase,
    isPeriod: currentDayInfo.isPeriod, isOvulationDay: currentDayInfo.isOvulationDay,
    isFertileWindow: currentDayInfo.isFertileWindow, symptoms: currentDayInfo.symptoms,
    worstDayOfPeriod: settings.worstDayOfPeriod, hasPCOS: settings.hasPCOS || settings.cycleProfile?.regularity === 'pcos',
    birthControl: settings.cycleProfile?.birthControl, stressLevel: settings.lifestyleProfile?.stressLevel,
    activityLevel: settings.lifestyleProfile?.activityLevel,
  }) : [
    { id: 'start', categoryTitle: 'Tu diario', category: 'diario', headline: 'Cada observación cuenta', advice: 'No necesitas completar todo a la vez. Puedes empezar con una nota sobre cómo te sientes y añadir más cuando te apetezca.', focusTip: 'Tu diario parte de lo que tú registras.' },
    { id: 'privacy', categoryTitle: 'Tu espacio', category: 'privacidad', headline: 'Tu historia, contigo', advice: 'Los registros se guardan en este dispositivo. Puedes exportar una copia desde Ajustes para conservarlos o trasladarlos.', focusTip: 'El diario también está disponible sin conexión.' },
    { id: 'patterns', categoryTitle: 'Autoconocimiento', category: 'bienestar', headline: 'Mira lo que cambia', advice: 'Anotar el descanso, las sensaciones y las fechas del periodo puede ayudarte a preparar tus próximas consultas.', focusTip: 'No hace falta tener un ciclo regular para llevar un diario.' },
  ], [currentDayInfo, selectedDate, settings, hasCycle]);
  const index = Math.min(activeIndex ?? 0, Math.max(0, cards.length - 1));
  const card = cards[index];
  if (!card) return null;
  return <section className="wellness-section" aria-labelledby="wellness-title">
    <button type="button" className="compact-care aura-button" onClick={() => setActiveIndex(0)}><Leaf size={18}/>Mis consejos de hoy</button>
    <div className="section-heading"><h2 id="wellness-title">Mis consejos de hoy</h2><span className="wellness-count">Pequeños cuidados</span></div>
    <div className="tip-thumbnails">{cards.slice(0, 3).map((tip, i) => <button type="button" className="tip-thumbnail" key={tip.id} onClick={() => setActiveIndex(i)}><span className="tip-illustration" aria-hidden="true"><Leaf size={28} strokeWidth={1.3}/><span/></span><span className="tip-category">{tip.categoryTitle || tip.category}</span><strong>{tip.headline}</strong></button>)}</div>
    {activeIndex !== null && <ModalFrame isOpen onClose={() => setActiveIndex(null)} title={card.headline} description={card.categoryTitle || card.category}>
      <div className="care-tabs" role="group" aria-label="Consejos de hoy">{cards.slice(0, 3).map((tip, i) => <button type="button" className="aura-button" aria-pressed={i === index} key={tip.id} onClick={() => setActiveIndex(i)}>{tip.categoryTitle || tip.category}</button>)}</div>
      <p className="tip-body">{card.advice}</p>{card.focusTip && <p className="advice-tip">{card.focusTip}</p>}
      {onOpenChat && <button type="button" className="text-action" onClick={() => { setActiveIndex(null); onOpenChat('Cuéntame más sobre ' + (card.categoryTitle || card.headline)); }}><MessageCircle size={16}/>Consultar con Confidente</button>}
    </ModalFrame>}
  </section>;
}
