import type { CycleDayInfo } from '../types/cycle';
import type { CycleStatistics, UpcomingMilestones } from '../types/prediction';

/** Presentation model shared by the main ring and cached widget snapshots. */
export function presentCycle(day: CycleDayInfo, stats: CycleStatistics, milestones: UpcomingMilestones) {
  const length = Math.max(1, Math.round(stats.estimatedCycleLength));
  const days = milestones.daysUntilNextPeriod;
  const paused = ['pregnancy', 'postpartum', 'menopause', 'hormonal'].includes(day.phase);
  let title = 'Tu primer registro';
  let detail = 'Tu cuerpo tiene una historia. Empecemos a escucharla.';
  let eyebrow = 'A TU RITMO';
  if (paused) {
    title = day.phaseName;
    detail = 'Tu diario sigue contigo. Las predicciones del ciclo están en pausa.';
  } else if (day.dayOfCycle > 0) {
    eyebrow = 'DÍA ' + day.dayOfCycle + ' DE TU CICLO';
    if (day.phase === 'unknown') {
      title = stats.isIrregular || stats.isPCOSModeActive ? 'Tu propio ritmo' : 'Tu ciclo sigue';
      detail = stats.isIrregular || stats.isPCOSModeActive ? 'Cada ciclo es distinto. Tus observaciones marcan el camino.' : 'La fecha estimada ha pasado. Registra tu regla cuando empiece.';
    } else if (day.isPeriod) {
      title = day.hasLog ? 'En tu periodo' : 'Periodo estimado';
      detail = day.hasLog ? 'Un poco de calma. Escucha lo que necesitas hoy.' : 'Una previsión, pendiente de tu registro.';
    } else if (milestones.nextOvulationDate && milestones.daysUntilNextOvulation <= 10 && milestones.daysUntilNextOvulation >= 0) {
      title = milestones.daysUntilNextOvulation === 0 ? 'Ovulación estimada hoy' : 'Ovulación en unos ' + milestones.daysUntilNextOvulation + ' días';
      detail = 'Una estimación de calendario, no una confirmación.';
    } else {
      title = days > 0 ? 'Tu regla, en unos ' + days + ' días' : 'Tu ciclo tiene su ritmo';
      detail = day.phaseName + ' · Un día más para conocerte.';
    }
  } else if (stats.lastVerifiedPeriodStart && !paused) {
    title = 'Un día de tu historia';
    detail = 'Puedes anotar cómo te sentías, aunque no conozcas la fase.';
  }
  return {
    title, detail, eyebrow, progress: paused ? 0 : Math.min(1, Math.max(0, day.dayOfCycle / length)),
    cycleDay: day.dayOfCycle, length,
    fertility: 'El calendario no determina tu riesgo de embarazo',
    source: stats.totalCyclesAnalyzed ? stats.totalCyclesAnalyzed + ' ciclos registrados' : 'Ajustes iniciales',
  };
}
