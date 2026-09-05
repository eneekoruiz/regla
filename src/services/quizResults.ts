import { HEALTH_QUIZZES } from '../data/healthQuizzes';
import type { DailyLog } from '../types/cycle';
import type { QuizResult } from '../types/quiz';
import { validateQuizResult } from '../utils/dataValidation';
import { isDateKey } from '../utils/dateKey';

export function addQuizResultToLogs(logs: Record<string, DailyLog>, input: QuizResult, date: string): Record<string, DailyLog> {
  if (!isDateKey(date)) throw new Error('Fecha del registro no válida.');
  const result = validateQuizResult(input);
  const quiz = Object.values(HEALTH_QUIZZES).find(item => item.id === result.quizId);
  if (!quiz) throw new Error('Cuestionario no disponible.');
  if (Object.keys(result.answers).length !== quiz.questions.length) throw new Error('Completa todas las preguntas antes de guardar.');
  for (const question of quiz.questions) {
    if (!Object.hasOwn(result.answers, question.id)) throw new Error('Falta una respuesta del cuestionario.');
    const answer = result.answers[question.id];
    if (question.type === 'boolean' && typeof answer !== 'boolean') throw new Error('La respuesta debe ser sí o no.');
    if (question.type === 'single_choice' && !question.options?.some(option => option.id === answer)) throw new Error('Opción de respuesta no válida.');
    if (question.type === 'slider') {
      const min = question.min ?? 0;
      const max = question.max ?? 5;
      const step = question.step ?? 1;
      const steps = typeof answer === 'number' ? (answer - min) / step : Number.NaN;
      if (typeof answer !== 'number' || answer < min || answer > max || !Number.isFinite(steps) || Math.abs(steps - Math.round(steps)) > 1e-8) {
        throw new Error('La respuesta está fuera de la escala del cuestionario.');
      }
    }
  }
  const current = logs[date] ?? { date, isPeriod: false, symptoms: [] };
  const previous = current.quizResults ?? [];
  const duplicate = previous.findIndex(item => item.quizId === result.quizId && item.completedAt === result.completedAt);
  const quizResults = duplicate === -1 ? [...previous, result] : previous.map((item, index) => index === duplicate ? result : item);
  return { ...logs, [date]: { ...current, quizResults, recordedAt: new Date().toISOString() } };
}
