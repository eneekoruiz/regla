import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Leaf, MessageCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCycle } from '../../hooks/useCycle';
import { generateDailyWellnessCarousel, detectRecurringSymptomPattern } from '../../services/wellnessAgent';

export function WellnessTipCard({ onOpenChat }: { onOpenChat?: (message?: string) => void }) {
  const { currentDayInfo, selectedDate, settings, hasEnoughData, logs, todayDate, cycleStats } = useCycle();
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  // Mejora 10: banner de patrón recurrente
  const [patternDismissed, setPatternDismissed] = useState(false);

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

  // Mejora 10: detectar síntoma recurrente solo en hoy
  const recurringPattern = useMemo(() => {
    if (!hasCycle || selectedDate !== todayDate || patternDismissed) return null;
    return detectRecurringSymptomPattern({
      logs,
      currentDayOfCycle: currentDayInfo.dayOfCycle,
      todayDate,
      cycleLength: Math.max(1, Math.round(cycleStats.estimatedCycleLength || settings.averageCycleLength || 28)),
      lastPeriodStart: cycleStats.lastVerifiedPeriodStart || settings.lastPeriodStartDate || '',
    });
  }, [hasCycle, selectedDate, todayDate, patternDismissed, logs, currentDayInfo.dayOfCycle, cycleStats, settings]);


  const index = Math.min(activeIndex, Math.max(0, cards.length - 1));
  const card = cards[index];

  const minSwipeDistance = 40;
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && index < cards.length - 1) {
      setActiveIndex(prev => prev + 1);
    } else if (distance < -minSwipeDistance && index > 0) {
      setActiveIndex(prev => prev - 1);
    }
  };

  if (!card) return null;
  return <section className="wellness-section" aria-labelledby="wellness-title">
    {/* Mejora 10: banner proactivo de síntoma recurrente */}
    {recurringPattern && (
      <motion.div
        className="recurring-symptom-banner"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        role="note"
        aria-label="Patrón de síntoma detectado"
      >
        <div className="recurring-symptom-body">
          <Sparkles size={14} className="recurring-symptom-icon" />
          <p>{recurringPattern.message}</p>
        </div>
        <div className="recurring-symptom-actions">
          {onOpenChat && (
            <button
              type="button"
              className="aura-button sm primary"
              style={{ fontSize: 12 }}
              onClick={() => onOpenChat(`Hablemos sobre un síntoma que suelo tener en estos días del ciclo: ${recurringPattern.symptomName}`)}
            >
              <MessageCircle size={13} />
              Hablar de ello
            </button>
          )}
          <button
            type="button"
            className="aura-icon-button sm"
            aria-label="Cerrar aviso de patrón"
            onClick={() => setPatternDismissed(true)}
            style={{ width: 32, height: 32 }}
          >
            ×
          </button>
        </div>
      </motion.div>
    )}
    <div className="section-heading">
      <h2 id="wellness-title">Un momento para ti</h2>
      <div className="wellness-controls flex items-center gap-1.5">
        <button type="button" className="aura-icon-button" aria-label="Consejo anterior" title="Consejo anterior" disabled={index === 0} onClick={() => setActiveIndex(index - 1)}><ChevronLeft size={18}/></button>
        <div className="flex items-center gap-1 px-1" role="img" aria-label={`Consejo ${index + 1} de ${cards.length}`}>
          {cards.map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-4 bg-[var(--accent)]' : 'w-1.5 bg-[var(--border-subtle)]'
              }`}
            />
          ))}
        </div>
        <button type="button" className="aura-icon-button" aria-label="Siguiente consejo" title="Siguiente consejo" disabled={index === cards.length - 1} onClick={() => setActiveIndex(index + 1)}><ChevronRight size={18}/></button>
      </div>
    </div>
    <div className="wellness-carousel-wrapper overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.article
          key={card.id || index}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="advice-card touch-pan-y select-none"
          aria-live="polite"
          aria-atomic="true"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="advice-category"><Leaf size={18}/>{card.categoryTitle || card.category}</div>
          <h3>{card.headline}</h3><p>{card.advice}</p>
          {card.focusTip && <p className="advice-tip">{card.focusTip}</p>}
          {onOpenChat && <button type="button" className="text-action" onClick={() => onOpenChat(`Cuéntame más sobre ${card.categoryTitle?.toLowerCase() || 'este consejo'}: ${card.headline}`)}><MessageCircle size={16}/>Consultar con Confidente</button>}
        </motion.article>
      </AnimatePresence>
    </div>
  </section>;
}
