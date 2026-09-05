import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Leaf, MessageCircle } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { generateDailyWellnessCarousel } from '../../services/wellnessAgent';

export function WellnessTipCard({ onOpenChat }: { onOpenChat?: (message?: string) => void }) {
  const { currentDayInfo, selectedDate, settings, hasEnoughData } = useCycle();
  const [activeIndex, setActiveIndex] = useState(0);
  const hasCycle = hasEnoughData && currentDayInfo.dayOfCycle > 0;
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
  const index = Math.min(activeIndex, Math.max(0, cards.length - 1));
  const card = cards[index];
  if (!card) return null;
  return <section className="wellness-section" aria-labelledby="wellness-title">
    <div className="section-heading"><h2 id="wellness-title">Un momento para ti</h2><div className="wellness-controls">
      <button type="button" className="aura-icon-button" aria-label="Consejo anterior" title="Consejo anterior" disabled={index === 0} onClick={() => setActiveIndex(index - 1)}><ChevronLeft size={18}/></button>
      <span className="wellness-count">{index + 1}/{cards.length}</span>
      <button type="button" className="aura-icon-button" aria-label="Siguiente consejo" title="Siguiente consejo" disabled={index === cards.length - 1} onClick={() => setActiveIndex(index + 1)}><ChevronRight size={18}/></button>
    </div></div>
    <article className="advice-card" aria-live="polite" aria-atomic="true">
      <div className="advice-category"><Leaf size={18}/>{card.categoryTitle || card.category}</div>
      <h3>{card.headline}</h3><p>{card.advice}</p>
      {card.focusTip && <p className="advice-tip">{card.focusTip}</p>}
      {onOpenChat && <button type="button" className="text-action" onClick={() => onOpenChat(`Cuéntame más sobre ${card.categoryTitle?.toLowerCase() || 'este consejo'}: ${card.headline}`)}><MessageCircle size={16}/>Consultar con Confidente</button>}
    </article>
  </section>;
}
