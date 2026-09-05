import type { ChatMessage, ChatQuizKey, ChatSuggestion } from '../../services/aiAgent';
import { HEALTH_QUIZZES } from '../../data/healthQuizzes';

export type QuizAnswer = string | number | boolean;
export interface ChatMessageWithQuiz extends ChatMessage {
  suggestions?: ChatSuggestion[];
  quizCard?: { quizKey: ChatQuizKey; stepIndex: number; selectedAnswer?: string; cancelled?: boolean };
}
export interface ActiveQuiz {
  key: ChatQuizKey;
  step: number;
  messageId: string;
  answers: Record<string, QuizAnswer>;
}
export interface Conversation {
  messages: ChatMessageWithQuiz[];
  activeQuiz: ActiveQuiz | null;
  draft: string;
}
export const CHAT_HISTORY_PREFIX = 'aura_chat_v1:';
export const MAX_CHAT_MESSAGES = 200;
const keys = new Set(['stress', 'sleep', 'pcos', 'pms', 'cramps']);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown, max = 8000): value is string => typeof value === 'string' && value.length <= max;
const quizKey = (value: unknown): value is ChatQuizKey => typeof value === 'string' && keys.has(value);
export const emptyConversation = (): Conversation => ({ messages: [], activeQuiz: null, draft: '' });

export function newChatMessage(role: ChatMessage['role'], content: string): ChatMessageWithQuiz {
  return { id: crypto.randomUUID(), role, content, timestamp: new Date().toISOString() };
}

function suggestion(value: unknown): value is ChatSuggestion {
  return object(value) && string(value.id, 100) && string(value.label, 200) &&
    (value.action === 'quiz' ? quizKey(value.quizKey) : value.action === 'ask' && string(value.prompt, 4000));
}

export function parseConversation(raw: string): Conversation {
  if (raw.length > 2000000) throw new Error('History too large');
  const saved: unknown = JSON.parse(raw);
  if (!object(saved) || saved.version !== 1 || !Array.isArray(saved.messages) || saved.messages.length > MAX_CHAT_MESSAGES) throw new Error('Invalid history');
  const ids = new Set<string>();
  const messages: ChatMessageWithQuiz[] = saved.messages.map(value => {
    if (!object(value) || !string(value.id, 100) || ids.has(value.id) || !['user', 'assistant'].includes(String(value.role)) ||
      !string(value.content) || !string(value.timestamp, 50) || !Number.isFinite(Date.parse(value.timestamp))) throw new Error('Invalid message');
    ids.add(value.id);
    const message: ChatMessageWithQuiz = { id: value.id, role: value.role as ChatMessage['role'], content: value.content, timestamp: value.timestamp };
    if (string(value.topicId, 100)) message.topicId = value.topicId;
    if (Array.isArray(value.suggestions)) message.suggestions = value.suggestions.filter(suggestion).slice(0, 20);
    if (Array.isArray(value.sources)) message.sources = value.sources.filter((item): item is { title: string; url: string } => {
      if (!object(item) || !string(item.title, 200) || !string(item.url, 500)) return false;
      try { const url = new URL(item.url); return url.protocol === 'https:' && url.hostname === 'www.nhs.uk' && !url.username && !url.password; } catch { return false; }
    }).slice(0, 5);
    const card = value.quizCard;
    if (object(card) && quizKey(card.quizKey) && Number.isInteger(card.stepIndex) &&
      Number(card.stepIndex) >= 0 && Number(card.stepIndex) < HEALTH_QUIZZES[card.quizKey].questions.length) {
      message.quizCard = { quizKey: card.quizKey, stepIndex: Number(card.stepIndex),
        ...(string(card.selectedAnswer, 300) ? { selectedAnswer: card.selectedAnswer } : {}), cancelled: card.cancelled === true };
    }
    return message;
  });
  let activeQuiz: ActiveQuiz | null = null;
  const active = saved.activeQuiz;
  if (object(active) && quizKey(active.key) && Number.isInteger(active.step) && typeof active.messageId === 'string' && object(active.answers)) {
    const quiz = HEALTH_QUIZZES[active.key];
    const card = messages.find(message => message.id === active.messageId)?.quizCard;
    const answers: Record<string, QuizAnswer> = {};
    let valid = true;
    for (const question of quiz.questions.slice(0, Number(active.step))) {
      const answer = active.answers[question.id];
      if (question.type === 'boolean' && typeof answer === 'boolean' ||
        question.type === 'single_choice' && typeof answer === 'string' && question.options?.some(option => option.id === answer) ||
        question.type === 'slider' && typeof answer === 'number' && Number.isFinite(answer) && answer >= (question.min ?? 1) && answer <= (question.max ?? 5)) {
        answers[question.id] = answer as QuizAnswer;
      } else valid = false;
    }
    if (valid && card && !card.selectedAnswer && !card.cancelled && card.quizKey === active.key && card.stepIndex === active.step) {
      activeQuiz = { key: active.key, step: Number(active.step), messageId: active.messageId, answers };
    }
  }
  return { messages, activeQuiz, draft: string(saved.draft, 4000) ? saved.draft : '' };
}

export function loadConversation(key: string): { conversation: Conversation; error: string | null } {
  try {
    const raw = localStorage.getItem(key);
    return { conversation: raw ? parseConversation(raw) : emptyConversation(), error: null };
  } catch {
    return { conversation: emptyConversation(), error: 'No se ha podido recuperar el historial. Los mensajes nuevos se mostrarán aquí.' };
  }
}

export function saveConversation(key: string, conversation: Conversation): string | null {
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, ...conversation }));
    return null;
  } catch {
    return 'El navegador no permite guardar el historial. Esta conversación podría perderse al cerrar o recargar.';
  }
}

export function completeQuiz(key: ChatQuizKey, answers: Record<string, QuizAnswer>): string {
  let summary = '';
  if (key === 'stress') {
    const elevated = Number(answers.stress_q1) >= 4 || answers.stress_q2 === 'yes';
    summary = elevated ? 'Has señalado tensión alta o preocupaciones frecuentes. Considera reservar una pausa y pedir apoyo si interfiere en tu día.'
      : 'Has anotado cómo sientes la tensión y el descanso. Observar si cambia durante la semana puede ayudarte a decidir qué cuidado necesitas.';
  } else if (key === 'sleep') {
    summary = answers.sleep_q1 === 'less_5' || answers.sleep_q2 === false
      ? 'Has señalado pocas horas de sueño o falta de descanso. Si se repite y afecta a tu día, coméntalo en consulta.'
      : 'Has registrado tus horas y sensación de descanso. Este breve chequeo no mide la calidad clínica del sueño.';
  } else if (key === 'cramps') {
    summary = Number(answers.cramps_q1) >= 4
      ? 'Has señalado dolor intenso. Si es nuevo, empeora o no mejora, busca atención sanitaria. Si aparece con desmayo o sangrado abundante, busca ayuda urgente.'
      : 'Has anotado la intensidad y si mejora con calor. Si el dolor limita tus actividades o cambia respecto al habitual, pide valoración.';
  } else if (key === 'pms') {
    summary = answers.pms_q1 === 'severe'
      ? 'Has señalado cambios de ánimo muy intensos. Merecen apoyo profesional, especialmente si afectan a tu vida diaria. Este resultado no diagnostica SPM ni TDPM.'
      : 'Has anotado tus cambios antes de la regla. Un registro durante varios ciclos puede ayudarte a explicarlos en consulta.';
  } else {
    summary = 'Has registrado cambios del ciclo, piel y peso. Estas respuestas no permiten diagnosticar SOP ni descartar otras causas. Consulta si los cambios persisten o te preocupan.';
  }
  return `**Chequeo completado**\n\n${summary}\n\nLas respuestas quedan en esta conversación. No se añaden al calendario ni al informe médico.`;
}
