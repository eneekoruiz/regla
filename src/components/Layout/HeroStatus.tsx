import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { useCycle } from '../../hooks/useCycle';
import { presentCycle } from '../../services/cyclePresentation';
import { calculateUpcomingMilestones } from '../../services/predictiveEngine';

export function HeroStatus({ onOpenLegend }: { onRecordPeriod: () => void; onOpenLegend: () => void }) {
  const { currentDayInfo: day, selectedDate, cycleStats, hasEnoughData } = useCycle();
  const model = presentCycle(day, cycleStats, calculateUpcomingMilestones(cycleStats, selectedDate));
  const fillId = useId();
  const progress = Number.isFinite(model.progress) ? Math.min(1, Math.max(0, model.progress)) : 0;
  return <section className="orbit-hero" data-phase={day.phase} aria-labelledby="cycle-title">
    <button type="button" className="phase-chip" onClick={onOpenLegend}><span className="phase-dot"/>{day.phaseName}<ChevronDown size={14}/><span className="sr-only"> · Entender las fases</span></button>
    <div className="orbit">
      <svg className="orbit-svg" width="320" height="320" viewBox="0 0 320 320" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <circle cx="160" cy="160" r="155" fill="none" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="1 8"/>
        <circle cx="160" cy="160" r="145" fill="none" stroke="var(--ring-track)" strokeWidth="9"/>
        <circle className="orbit-progress" cx="160" cy="160" r="145" pathLength="100" fill="none" stroke="var(--phase-ink)" strokeWidth="9" strokeLinecap="round" strokeDasharray="100 100" strokeDashoffset={100 * (1 - progress)} transform="rotate(-90 160 160)"/>
      </svg>
      <div className="orbit-content"><svg className="countdown-drop" width="18" height="24" viewBox="0 0 24 32" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><clipPath id={fillId}><path d="M12 2C10 7 3 14 3 21a9 9 0 0 0 18 0C21 14 14 7 12 2Z"/></clipPath></defs><path d="M12 2C10 7 3 14 3 21a9 9 0 0 0 18 0C21 14 14 7 12 2Z" fill="var(--rose-soft)" stroke="var(--phase-ink)" strokeWidth="1.2"/><rect className="drop-fill" x="2" y={31 - 30 * progress} width="20" height="30" fill="var(--phase-ink)" clipPath={'url(#' + fillId + ')'}/></svg><p className="orbit-eyebrow">{model.eyebrow}</p><h2 id="cycle-title">{model.title}</h2><p className="orbit-detail">{model.detail}</p></div>
    </div>
    <p className="fertility-note">{model.fertility}</p>
    {hasEnoughData && <p className="orbit-source">{model.source} · Fechas orientativas</p>}
  </section>;
}
