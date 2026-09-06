import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { containDialogFocus } from '../../utils/dialogFocus';
import { ArrowUpRight, BookOpen, Check, ChevronRight, ClipboardList, Leaf, Loader2, Send, Sparkles, Trash2, X } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { useAuth } from '../../hooks/useAuth';
import { CHAT_QUIZ_SUGGESTIONS, detectChatQuiz, generateChatResponse, isUrgentChatMessage, LOCAL_CHAT_TOPICS, topicSuggestion } from '../../services/aiAgent';
import type { ChatQuizKey, ChatSuggestion } from '../../services/aiAgent';
import { HEALTH_QUIZZES } from '../../data/healthQuizzes';
import type { QuizQuestion } from '../../types/quiz';
import { hapticSelect, hapticTick, hapticSuccess } from '../../utils/haptics';
import { CHAT_HISTORY_PREFIX, MAX_CHAT_MESSAGES, completeQuiz, emptyConversation, loadConversation, newChatMessage, saveConversation } from './chatHistory';
import type { ChatMessageWithQuiz, Conversation, QuizAnswer } from './chatHistory';

export type QuizKeyType = ChatQuizKey;
export type { ChatMessageWithQuiz } from './chatHistory';
interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string | null;
  onInitialMessageConsumed?: () => void;
  onOpenQuizModal?: (quizId: string) => void;
  initialQuizKey?: ChatQuizKey | null;
  onInitialQuizConsumed?: () => void;
  initialCompletedQuiz?: { quizKey: ChatQuizKey; answers: Record<string, QuizAnswer> } | null;
  onInitialCompletedQuizConsumed?: () => void;
}
const control = 'min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-root)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60';
const iconControl = 'flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-root)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]';

function FormattedContent({ text }: { text: string }) {
  return <div className="space-y-2">{text.split('\n\n').map((paragraph, index) => <p key={index} className="whitespace-pre-line leading-relaxed">
    {paragraph.split(/(\*\*.*?\*\*)/g).map((part, partIndex) => part.startsWith('**') && part.endsWith('**')
      ? <strong key={partIndex} className="font-semibold">{part.slice(2, -2)}</strong> : <Fragment key={partIndex}>{part}</Fragment>)}
  </p>)}</div>;
}

function QuizControls({ question, disabled, onAnswer }: { question: QuizQuestion; disabled: boolean; onAnswer: (value: QuizAnswer, label: string) => void }) {
  const [value, setValue] = useState(question.min ?? 1);
  if (question.type === 'slider') return <div className="space-y-2">
    <label className="flex items-center justify-between gap-3 text-sm" htmlFor={'chat-' + question.id}>
      <span>Intensidad</span><output htmlFor={'chat-' + question.id} className="font-semibold tabular-nums">{value} / {question.max ?? 5}</output>
    </label>
    <input id={'chat-' + question.id} aria-label={question.title} type="range" min={question.min ?? 1} max={question.max ?? 5} step={question.step ?? 1}
      value={value} onChange={event => setValue(Number(event.target.value))} disabled={disabled}
      className="h-11 w-full accent-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]" />
    <div className="flex justify-between gap-4 text-xs text-[var(--text-secondary)]"><span>{question.sliderLabels?.[0]}</span><span className="text-right">{question.sliderLabels?.[1]}</span></div>
    <button type="button" disabled={disabled} onClick={() => onAnswer(value, value + ' de ' + (question.max ?? 5))} className={control + ' flex w-full items-center justify-center gap-2'}>
      <Check aria-hidden="true" className="size-4" />Confirmar respuesta
    </button>
  </div>;
  const options = question.type === 'boolean'
    ? [{ id: 'yes', label: 'Sí', value: true }, { id: 'no', label: 'No', value: false }]
    : (question.options || []).map(option => ({ ...option, value: option.id }));
  return <div className={question.type === 'boolean' ? 'grid grid-cols-2 gap-2' : 'grid gap-2'}>{options.map(option =>
    <button type="button" key={option.id} disabled={disabled} onClick={() => onAnswer(option.value, option.label)} className={control}>{option.label}</button>
  )}</div>;
}

function ChatSession({
  storageKey,
  isOpen,
  onClose,
  initialMessage,
  onInitialMessageConsumed,
  onOpenQuizModal,
  initialQuizKey,
  onInitialQuizConsumed,
  initialCompletedQuiz,
  onInitialCompletedQuizConsumed
}: ChatDrawerProps & { storageKey: string }) {
  const {
    currentDayInfo,
    cycleStats,
    settings,
    saveQuizResult,
    selectedDate,
    todayDate,
    logMultipleSymptoms,
    startPeriodOnDate,
    setPeriodFlowForDate
  } = useCycle();
  const [snapshot, setSnapshot] = useState(() => loadConversation(storageKey));
  const snapshotRef = useRef(snapshot);
  const [isTyping, setIsTyping] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const busy = useRef(false);
  const requestEpoch = useRef(0);
  const mounted = useRef(true);
  const consumedInitial = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const { conversation, error } = snapshot;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestEpoch.current += 1; };
  }, []);

  const commit = useCallback((next: Conversation) => {
    const messages = next.messages.slice(-MAX_CHAT_MESSAGES);
    const activeQuiz = messages.some(message => message.id === next.activeQuiz?.messageId) ? next.activeQuiz : null;
    const conversation = { ...next, messages, activeQuiz };
    const snapshot = { conversation, error: saveConversation(storageKey, conversation) };
    snapshotRef.current = snapshot;
    setSnapshot(snapshot);
  }, [storageKey]);

  const startQuiz = useCallback((key: ChatQuizKey, userText?: string) => {
    if (busy.current) return false;
    const quiz = HEALTH_QUIZZES[key];
    const current = snapshotRef.current.conversation;
    const messages = current.messages.map(message => message.quizCard && !message.quizCard.selectedAnswer
      ? { ...message, quizCard: { ...message.quizCard, cancelled: true } } : message);
    const question: ChatMessageWithQuiz = { ...newChatMessage('assistant', '**' + quiz.title + '**\n\nUn chequeo breve para ordenar cómo te encuentras. No es un diagnóstico.'),
      quizCard: { quizKey: key, stepIndex: 0 } };
    commit({ draft: '', messages: [...messages, newChatMessage('user', userText || 'Quiero hacer el chequeo de ' + quiz.title.toLowerCase() + '.'), question],
      activeQuiz: { key, step: 0, messageId: question.id, answers: {} } });
    hapticSelect();
    return true;
  }, [commit]);

  const handleSend = useCallback(async (rawText: string) => {
    const text = rawText.trim().slice(0, 4000);
    if (!text || busy.current) return false;
    const quiz = !isUrgentChatMessage(text) && detectChatQuiz(text);
    if (quiz) return startQuiz(quiz, text);
    busy.current = true;
    const epoch = ++requestEpoch.current;
    const history = snapshotRef.current.conversation;
    commit({ ...history, draft: '', messages: [...history.messages, newChatMessage('user', text)] });
    setIsTyping(true);
    hapticSelect();
    try {
      const response = await generateChatResponse(text, history.messages, { dayInfo: currentDayInfo, stats: cycleStats, settings });
      if (!mounted.current || epoch !== requestEpoch.current) return true;

      const targetDate = selectedDate || todayDate;
      if (response.loggedSymptoms && response.loggedSymptoms.length > 0) {
        logMultipleSymptoms(targetDate, response.loggedSymptoms);
      }
      if (response.periodAction === 'start') {
        startPeriodOnDate(targetDate);
      } else if (response.periodAction === 'stop') {
        setPeriodFlowForDate(targetDate, 'spotting');
      }

      const message = { ...newChatMessage('assistant', response.text), suggestions: response.suggestions, sources: response.sources, topicId: response.topicId };
      const current = snapshotRef.current.conversation;
      commit({ ...current, messages: [...current.messages, message] });
      hapticTick();
    } catch {
      if (mounted.current && epoch === requestEpoch.current) {
        const current = snapshotRef.current.conversation;
        commit({ ...current, messages: [...current.messages, newChatMessage('assistant', 'No se ha podido preparar la respuesta local. Elige un tema del catálogo o vuelve a intentarlo.')] });
      }
    } finally {
      if (mounted.current && epoch === requestEpoch.current) {
        busy.current = false;
        setIsTyping(false);
      }
    }
    return true;
  }, [commit, currentDayInfo, cycleStats, settings, startQuiz, selectedDate, todayDate, logMultipleSymptoms, startPeriodOnDate, setPeriodFlowForDate]);

  useEffect(() => {
    if (!initialMessage) { consumedInitial.current = null; return; }
    if (!isOpen || isTyping || consumedInitial.current === initialMessage) return;
    // Cancel the StrictMode setup/cleanup probe before it can send a duplicate.
    const timer = window.setTimeout(() => {
      consumedInitial.current = initialMessage;
      void handleSend(initialMessage).then(accepted => {
        if (accepted) onInitialMessageConsumed?.();
        else consumedInitial.current = null;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [handleSend, initialMessage, isOpen, isTyping, onInitialMessageConsumed]);

  useEffect(() => {
    if (!initialQuizKey || !isOpen) return;
    const timer = window.setTimeout(() => {
      startQuiz(initialQuizKey);
      onInitialQuizConsumed?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialQuizKey, isOpen, onInitialQuizConsumed, startQuiz]);

  useEffect(() => {
    if (!initialCompletedQuiz || !isOpen) return;
    const timer = window.setTimeout(() => {
      const { quizKey, answers } = initialCompletedQuiz;
      const quiz = HEALTH_QUIZZES[quizKey];
      const topic = LOCAL_CHAT_TOPICS.find(t => t.quizKey === quizKey);
      const current = snapshotRef.current.conversation;
      const userMsg = newChatMessage('user', `He completado el chequeo de **${quiz?.title || quizKey}**.`);
      const feedbackText = completeQuiz(quizKey, answers);
      const assistantMsg: ChatMessageWithQuiz = {
        ...newChatMessage('assistant', feedbackText),
        suggestions: [
          ...(topic ? [topicSuggestion(topic)] : []),
          ...CHAT_QUIZ_SUGGESTIONS.filter(item => item.quizKey !== quizKey).slice(0, 2)
        ]
      };
      commit({
        ...current,
        messages: [...current.messages, userMsg, assistantMsg],
        activeQuiz: null
      });
      onInitialCompletedQuizConsumed?.();
      hapticSuccess();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialCompletedQuiz, isOpen, onInitialCompletedQuizConsumed, commit]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    if (isOpen && !dialog.open) { dialog.showModal(); inputRef.current?.focus(); }
    if (!isOpen && dialog.open) dialog.close();
    if (!isOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !messagesRef.current) return;
    messagesRef.current.scrollTop = showCatalog ? 0 : messagesRef.current.scrollHeight;
  }, [conversation.messages, isOpen, isTyping, showCatalog]);

  function answerQuiz(messageId: string, value: QuizAnswer, label: string) {
    if (busy.current) return;
    const current = snapshotRef.current.conversation;
    const active = current.activeQuiz;
    if (!active || active.messageId !== messageId) return;
    const quiz = HEALTH_QUIZZES[active.key];
    const question = quiz.questions[active.step];
    const answers = { ...active.answers, [question.id]: value };
    const messages = current.messages.map(message => message.id === messageId && message.quizCard
      ? { ...message, quizCard: { ...message.quizCard, selectedAnswer: label } } : message);
    messages.push(newChatMessage('user', label));
    const step = active.step + 1;
    if (step < quiz.questions.length) {
      const next = { ...newChatMessage('assistant', ''), quizCard: { quizKey: active.key, stepIndex: step } };
      messages.push(next);
      commit({ ...current, messages, activeQuiz: { key: active.key, step, messageId: next.id, answers } });
      hapticTick();
    } else {
      const topic = LOCAL_CHAT_TOPICS.find(topic => topic.quizKey === active.key);
      const feedbackText = completeQuiz(active.key, answers);
      messages.push({ ...newChatMessage('assistant', feedbackText),
        suggestions: [...(topic ? [topicSuggestion(topic)] : []), ...CHAT_QUIZ_SUGGESTIONS.filter(item => item.quizKey !== active.key).slice(0, 2)] });
      commit({ ...current, messages, activeQuiz: null });
      hapticSuccess();
      try {
        if (quiz?.id) {
          saveQuizResult({
            quizId: quiz.id,
            completedAt: new Date().toISOString(),
            answers: answers as Record<string, string | number | boolean>
          }, selectedDate);
        }
      } catch {
        // fail silently if cannot persist
      }
    }
  }
  function choose(suggestion: ChatSuggestion) {
    setShowCatalog(false);
    if (suggestion.action === 'quiz' && suggestion.quizKey) startQuiz(suggestion.quizKey);
    else if (suggestion.prompt) void handleSend(suggestion.prompt);
  }
  function clearHistory() {
    requestEpoch.current += 1;
    busy.current = false;
    setIsTyping(false);
    commit(emptyConversation());
    setConfirmClear(false);
    inputRef.current?.focus();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSend(conversation.draft);
  }
  const WELCOME_SUGGESTIONS: ChatSuggestion[] = [
    { id: 'welcome_phase', label: 'Mi fase y cuidados hoy', action: 'ask', prompt: 'Consejos para mi fase de hoy' },
    { id: 'welcome_cramps', label: 'Aliviar cólicos', action: 'ask', prompt: 'Dolor menstrual y cólicos' },
    { id: 'welcome_sleep', label: 'Mejorar el sueño', action: 'ask', prompt: 'Mejorar el sueño y el descanso' },
    { id: 'welcome_stress', label: 'Calmar el estrés', action: 'ask', prompt: 'Estrés y respiración tranquila' },
    { id: 'welcome_quiz', label: 'Chequeo de bienestar', action: 'quiz', quizKey: 'stress' }
  ];

  const welcome: ChatMessageWithQuiz = {
    id: 'welcome',
    role: 'assistant',
    timestamp: '',
    content: 'Hola. Soy tu asistente en el Chat de Aura. Estoy aquí para acompañarte, resolver dudas sobre tus síntomas y darte calma en cualquier momento de tu ciclo.\n\nPuedes escribir lo que sientes o elegir una opción para empezar:',
    suggestions: WELCOME_SUGGESTIONS
  };
  const displayedMessages = conversation.messages.length ? conversation.messages : [welcome];

  return <dialog ref={dialogRef} aria-labelledby="chat-title" aria-describedby="chat-description" tabIndex={-1} onKeyDown={containDialogFocus}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-md border-0 bg-[var(--bg-root)] p-0 text-[var(--text-primary)] shadow-xl backdrop:bg-black/35">
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3">
        <div className="flex items-center gap-2">
          <Leaf aria-hidden="true" className="size-5 shrink-0 text-[var(--accent)]" />
          <h2 id="chat-title" className="min-w-0 flex-1 text-base font-semibold">Chat</h2>
          <button type="button" onClick={() => setShowCatalog(value => !value)} className={iconControl} aria-label="Catálogo de temas" title="Catálogo de temas" aria-expanded={showCatalog} aria-controls="chat-catalog"><BookOpen className="size-5" /></button>
          <button type="button" onClick={() => setConfirmClear(value => !value)} className={iconControl} aria-label="Borrar historial" title="Borrar historial"><Trash2 className="size-5" /></button>
          <button type="button" onClick={onClose} className={iconControl} aria-label="Cerrar chat" title="Cerrar chat"><X className="size-5" /></button>
        </div>
        <p id="chat-description" className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">Orientación local. Disponible sin conexión.</p>
      </header>
      {/* Barra de accesos directos a cuestionarios en el chat */}
      <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            <ClipboardList size={13} className="text-[var(--accent)]" /> Cuestionarios en el chat
          </span>
          <button
            type="button"
            onClick={() => setShowCatalog(v => !v)}
            className="text-[11px] font-medium text-[var(--accent)] hover:underline"
          >
            {showCatalog ? 'Ocultar catálogo' : 'Ver todos'}
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {CHAT_QUIZ_SUGGESTIONS.map(s => (
            <button
              key={s.id}
              type="button"
              disabled={isTyping}
              onClick={() => {
                if (s.quizKey) startQuiz(s.quizKey);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-root)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all active:scale-95"
            >
              <Sparkles size={11} className="text-[var(--accent)]" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      {confirmClear && <div className="shrink-0 border-b border-[var(--rose)] bg-[var(--rose-soft)] px-4 py-3 text-sm text-[var(--rose)]">
        <p className="font-semibold">¿Borrar esta conversación?</p><p className="mt-1 text-xs">Se eliminarán los mensajes y chequeos de este usuario en este navegador. Se conservan como máximo los últimos 200 mensajes.</p>
        <div className="mt-3 flex gap-2"><button type="button" onClick={clearHistory} className={control + ' flex items-center gap-2'}><Trash2 className="size-4" />Borrar</button>
          <button type="button" onClick={() => setConfirmClear(false)} className={control}>Cancelar</button></div>
      </div>}
      {error && <p role="alert" className="shrink-0 border-b border-[var(--rose)] bg-[var(--rose-soft)] px-4 py-2 text-xs leading-relaxed text-[var(--rose)]">{error}</p>}
      <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <section
          id="chat-catalog"
          aria-label="Catálogo local"
          hidden={!showCatalog}
          className="mb-5 space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-root)]/70 p-4 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <BookOpen className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Guía de temas y dudas</h3>
                <p className="text-[11px] text-[var(--text-secondary)]">Disponible de forma local e inmediata</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCatalog(false)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
            >
              Cerrar
            </button>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Preguntas y salud del ciclo
            </span>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {LOCAL_CHAT_TOPICS.map(topic => (
                <button
                  type="button"
                  key={topic.id}
                  disabled={isTyping}
                  onClick={() => choose(topicSuggestion(topic))}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-left text-xs font-medium text-[var(--text-primary)] shadow-2xs transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/30 hover:text-[var(--accent)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50"
                >
                  <span className="truncate">{topic.label}</span>
                  <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Chequeos interactivos
            </span>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {CHAT_QUIZ_SUGGESTIONS.map(suggestion => (
                <button
                  type="button"
                  key={suggestion.id}
                  disabled={isTyping}
                  onClick={() => choose(suggestion)}
                  className="flex items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-left text-xs font-medium text-[var(--text-primary)] shadow-2xs transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/30 hover:text-[var(--accent)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Sparkles aria-hidden="true" className="size-3.5" />
                  </span>
                  <span className="truncate">{suggestion.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
        <div role="log" aria-label="Conversación" aria-live="polite" aria-relevant="additions" className="space-y-4">
          {displayedMessages.map(message => {
            const card = message.quizCard;
            const question = card ? HEALTH_QUIZZES[card.quizKey].questions[card.stepIndex] : null;
            const active = conversation.activeQuiz?.messageId === message.id;
            return <article key={message.id} aria-label={message.role === 'user' ? 'Tú' : 'Confidente'} className={'flex min-w-0 flex-col ' + (message.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={'max-w-[95%] min-w-0 rounded-lg px-3.5 py-3 text-sm break-words [overflow-wrap:anywhere] ' + (message.role === 'user' ? 'bg-[var(--accent)] text-[var(--accent-on)]' : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]')}>
                {message.content && <FormattedContent text={message.content} />}
                {card && question && <div className={message.content ? 'mt-4 border-t border-[var(--border-subtle)] pt-3' : ''}>
                  <p className="mb-2 text-xs font-medium text-[var(--accent)]">Pregunta {card.stepIndex + 1} de {HEALTH_QUIZZES[card.quizKey].questions.length}</p>
                  <p className="mb-3 font-semibold leading-relaxed">{question.title}</p>
                  {card.selectedAnswer ? <p className="flex items-start gap-2 text-sm text-[var(--accent)]"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{card.selectedAnswer}</p>
                    : active ? <QuizControls key={message.id} question={question} disabled={isTyping} onAnswer={(value, label) => answerQuiz(message.id, value, label)} />
                    : <p className="text-xs text-[var(--text-secondary)]">Chequeo interrumpido. Puedes iniciarlo de nuevo desde el catálogo.</p>}
                  {active && onOpenQuizModal && <button type="button" onClick={() => { onClose(); onOpenQuizModal(HEALTH_QUIZZES[card.quizKey].id); }} title="Abrir un chequeo nuevo en pantalla completa"
                    className="mt-2 flex min-h-11 items-center gap-2 rounded-lg text-xs font-medium text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
                    <ArrowUpRight aria-hidden="true" className="size-4" />Abrir chequeo nuevo
                  </button>}
                </div>}
                {message.sources && message.sources.length > 0 && <details className="mt-3 border-t border-[var(--border-subtle)] pt-1">
                  <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">Fuentes · Requieren conexión</summary>
                  <ul>{message.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-lg text-xs text-[var(--accent)] underline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
                    <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />{source.title}
                  </a></li>)}</ul>
                </details>}
              </div>
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-2.5 flex w-full flex-wrap gap-1.5 pt-0.5">
                  {message.suggestions.map(suggestion => (
                    <button
                      type="button"
                      key={suggestion.id}
                      disabled={isTyping}
                      onClick={() => choose(suggestion)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-2xs transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50"
                    >
                      {suggestion.action === 'quiz' ? (
                        <Sparkles aria-hidden="true" className="size-3.5 shrink-0 text-[var(--accent)]" />
                      ) : !/^\p{Extended_Pictographic}/u.test(suggestion.label) ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-[var(--accent)] opacity-70" />
                      ) : null}
                      <span className="truncate">{suggestion.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </article>;
          })}
          {isTyping && <p role="status" className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Preparando respuesta…</p>}
        </div>
      </div>
      <footer className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <form onSubmit={submit} className="flex items-end gap-2">
          <label htmlFor="chat-message" className="sr-only">Tu mensaje</label>
          <textarea ref={inputRef} id="chat-message" name="message" rows={2} maxLength={4000} value={conversation.draft}
            onChange={event => commit({ ...snapshotRef.current.conversation, draft: event.target.value })}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void handleSend(conversation.draft); } }}
            placeholder="¿Cómo te encuentras?" className="min-h-11 min-w-0 flex-1 resize-none rounded-lg border border-[var(--text-secondary)] bg-[var(--bg-root)] px-3 py-2.5 text-base leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]" />
          <button type="submit" disabled={!conversation.draft.trim() || isTyping} aria-label="Enviar mensaje" title="Enviar mensaje"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-on)] enabled:hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:bg-[var(--bg-root)] disabled:text-[var(--text-secondary)]">
            <Send aria-hidden="true" className="size-5" />
          </button>
        </form>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">Orientación general, no diagnóstico. Ante una urgencia, busca atención sanitaria.</p>
      </footer>
    </div>
  </dialog>;
}

export function ChatDrawer(props: ChatDrawerProps) {
  const { user } = useAuth();
  const storageKey = CHAT_HISTORY_PREFIX + (user?.id || 'local_user');
  return <ChatSession key={storageKey} storageKey={storageKey} {...props} />;
}
