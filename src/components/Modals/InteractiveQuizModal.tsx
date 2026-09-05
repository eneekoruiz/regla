import { useRef, useState, type MouseEvent } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import type { HealthQuiz, QuizResult } from '../../types/quiz';
import { ModalFrame } from './ModalFrame';
import { modalChoice, modalPrimaryButton, modalSecondaryButton, modalSelected, modalUnselected } from './modalStyles';

export function InteractiveQuizModal({ quiz, isOpen, onClose, onComplete }: { quiz: HealthQuiz; isOpen: boolean; onClose: () => void; onComplete: (result: QuizResult) => Promise<void> | void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizResult['answers']>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submitted = useRef(false);
  const advancing = useRef(false);
  const question = quiz.questions[step];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answer = question ? answers[question.id] : undefined;
  const minimum = question?.min ?? 0;
  const maximum = question?.max ?? 5;
  const increment = question?.step && question.step > 0 ? question.step : 1;
  const defaultSliderValue = minimum + Math.round((maximum - minimum) / (2 * increment)) * increment;
  const sliderValue = Number(answer ?? Math.min(maximum, defaultSliderValue));

  const changeStep = (value: number) => {
    advancing.current = true;
    setStep(value);
    setError('');
    requestAnimationFrame(() => {
      advancing.current = false;
      headingRef.current?.focus();
    });
  };

  const next = async (event: MouseEvent<HTMLButtonElement>) => {
    if (!question || submitted.current || advancing.current || event.detail > 1) return;
    const value = question.type === 'slider' ? sliderValue : answer;
    if (value === undefined) return;
    const updated = { ...answers, [question.id]: value };
    setAnswers(updated);
    if (step < quiz.questions.length - 1) {
      changeStep(step + 1);
      return;
    }
    submitted.current = true;
    setPending(true);
    setError('');
    try {
      await onComplete({ quizId: quiz.id, completedAt: new Date().toISOString(), answers: updated });
    } catch {
      submitted.current = false;
      setPending(false);
      setError('No se han guardado las respuestas. Se conservan aquí para que puedas volver a intentarlo.');
      return;
    }
    setPending(false);
    onClose();
  };

  const close = () => { if (!submitted.current) onClose(); };

  return <ModalFrame isOpen={isOpen} onClose={close} closeDisabled={pending} title={quiz.title}
    description={question ? `Pregunta ${step + 1} de ${quiz.questions.length}` : undefined}
    footer={!question ? <button type="button" onClick={close} className={modalPrimaryButton}>Cerrar</button> : <>
      {step > 0 && <button type="button" disabled={pending} onClick={() => { if (!submitted.current) changeStep(step - 1); }} className={modalSecondaryButton}><ChevronLeft size={18} aria-hidden="true" /> Anterior</button>}
      <button type="button" disabled={pending || (question.type !== 'slider' && answer === undefined)} onClick={next} className={modalPrimaryButton}>
        {pending ? <><LoaderCircle size={18} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Guardando</> : <>{step === quiz.questions.length - 1 ? 'Guardar respuestas' : 'Continuar'}<ChevronRight size={18} className="shrink-0" aria-hidden="true" /></>}
      </button>
    </>}>
    {!question ? <p className="text-sm">Este chequeo no tiene preguntas disponibles.</p> : <>
      <progress value={step} max={quiz.questions.length} aria-label="Progreso del chequeo" className="h-2 w-full accent-[var(--accent)]" />
      <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold leading-relaxed">{question.title}</h3>
      {question.subtitle && <p className="text-sm text-[var(--text-secondary)]">{question.subtitle}</p>}
      {question.type === 'single_choice' && <div className="space-y-2">{question.options?.map(option => <button key={option.id} type="button" disabled={pending} aria-pressed={answer === option.id} onClick={() => setAnswers(previous => ({ ...previous, [question.id]: option.id }))} className={`block w-full ${modalChoice} ${answer === option.id ? modalSelected : modalUnselected}`}>{option.label}</button>)}</div>}
      {question.type === 'boolean' && <div className="grid grid-cols-2 gap-2">{[true, false].map(value => <button key={String(value)} type="button" disabled={pending} aria-pressed={answer === value} onClick={() => setAnswers(previous => ({ ...previous, [question.id]: value }))} className={`${modalChoice} ${answer === value ? modalSelected : modalUnselected}`}>{value ? 'Sí' : 'No'}</button>)}</div>}
      {question.type === 'slider' && <label className="block space-y-3 text-sm"><span className="block font-semibold">Valor: {sliderValue}</span><input type="range" disabled={pending} min={minimum} max={maximum} step={increment} value={sliderValue} onChange={event => setAnswers(previous => ({ ...previous, [question.id]: Number(event.target.value) }))} aria-label={question.title} className="min-h-11 w-full accent-[var(--accent)]" /><span className="flex justify-between gap-4"><span>{question.sliderLabels?.[0] || 'Mínimo'}</span><span className="text-right">{question.sliderLabels?.[1] || 'Máximo'}</span></span></label>}
    </>}
    {pending && <p role="status" className="text-sm text-[var(--text-secondary)]">Guardando tus respuestas…</p>}
    {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
  </ModalFrame>;
}
