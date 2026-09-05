import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
export function InsightsWidget() {
  const { cycleStats } = useCycle();
  const [index, setIndex] = useState(0);
  const insights = cycleStats?.insights || [];
  if (!insights.length) return null;
  const current = index % insights.length;
  return <div className="flex min-w-0 items-center gap-3 border-y border-[var(--border-subtle)] py-3">
    <p aria-live="polite" className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">{insights[current]}</p>
    {insights.length > 1 && <button type="button" onClick={() => setIndex(current + 1)} aria-label={`Siguiente observación, ${current + 1} de ${insights.length}`} className="aura-icon-button"><ChevronRight size={18} aria-hidden="true" /></button>}
  </div>;
}
