import { ClipboardList, ChevronRight } from 'lucide-react';
import type { HealthQuiz } from '../../types/quiz';
export function HealthCheckCard({ quiz, onStart }: { quiz: HealthQuiz; onStart: () => void }) {
  return <button type="button" onClick={onStart} className="aura-button w-full text-left">
    <ClipboardList size={20} className="shrink-0" aria-hidden="true" />
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{quiz.title}</span><span className="block text-[13px] font-normal text-[var(--text-secondary)]">{quiz.estimatedTime}</span></span>
    <ChevronRight size={18} className="shrink-0" aria-hidden="true" />
  </button>;
}
