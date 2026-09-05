import { ChevronDown, ClipboardList } from 'lucide-react';
import { HEALTH_QUIZZES } from '../../data/healthQuizzes';
import type { QuizResult } from '../../types/quiz';

export function QuizHistory({ results }: { results: QuizResult[] }) {
  if (!results.length) return null;
  return <section className="quiz-history" aria-label="Cuestionarios guardados">
    <h3>Cuestionarios guardados</h3>
    {[...results].reverse().map(result => {
      const quiz = Object.values(HEALTH_QUIZZES).find(item => item.id === result.quizId);
      return <details key={`${result.quizId}-${result.completedAt}`}>
        <summary><ClipboardList size={17} aria-hidden="true" /><span>{quiz?.title || 'Cuestionario'}</span><time dateTime={result.completedAt}>{new Date(result.completedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</time><ChevronDown size={16} aria-hidden="true" /></summary>
        <dl>{Object.entries(result.answers).map(([id, answer]) => {
          const question = quiz?.questions.find(item => item.id === id);
          const label = typeof answer === 'boolean' ? (answer ? 'Sí' : 'No') : question?.options?.find(option => option.id === answer)?.label || String(answer);
          return <div key={id}><dt>{question?.title || id}</dt><dd>{label}</dd></div>;
        })}</dl>
      </details>;
    })}
  </section>;
}
