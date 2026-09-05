import type { CycleDayInfo, UserSettings } from '../types/cycle';
import type { CycleStatistics } from '../types/prediction';

export type ChatQuizKey = 'stress' | 'sleep' | 'pcos' | 'pms' | 'cramps';
export interface ChatSource { title: string; url: string }
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  topicId?: string;
  sources?: ChatSource[];
}
export interface ChatSuggestion {
  id: string;
  label: string;
  icon?: string;
  action: 'ask' | 'quiz';
  prompt?: string;
  quizKey?: ChatQuizKey;
}
export interface AIResponse {
  text: string;
  suggestions?: ChatSuggestion[];
  sources?: ChatSource[];
  topicId?: string;
  mode?: 'local';
}
export interface ChatContext {
  dayInfo: CycleDayInfo;
  stats: CycleStatistics;
  settings: UserSettings;
}

const sources = {
  periods: { title: 'NHS · Menstruación', url: 'https://www.nhs.uk/conditions/periods/' },
  pain: { title: 'NHS · Dolor menstrual', url: 'https://www.nhs.uk/symptoms/period-pain/' },
  pelvic: { title: 'NHS · Dolor pélvico', url: 'https://www.nhs.uk/symptoms/pelvic-pain/' },
  sleep: { title: 'NHS · Sueño', url: 'https://www.nhs.uk/conditions/insomnia/' },
  stress: { title: 'NHS · Respiración y estrés', url: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/' },
  pms: { title: 'NHS · Síntomas premenstruales', url: 'https://www.nhs.uk/conditions/pre-menstrual-syndrome/' },
  pcos: { title: 'NHS · Síndrome de ovario poliquístico', url: 'https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/' },
  pregnancy: { title: 'NHS · Pruebas de embarazo', url: 'https://www.nhs.uk/pregnancy/trying-for-a-baby/doing-a-pregnancy-test/' },
  emergency: { title: 'NHS · Anticoncepción de urgencia', url: 'https://www.nhs.uk/contraception/emergency-contraception/' }
};

interface LocalTopic {
  id: string;
  label: string;
  prompt: string;
  pattern: RegExp;
  text: string;
  source?: keyof typeof sources;
  quizKey?: ChatQuizKey;
}

// The same bundled catalog is used online and offline. No remote model, telemetry or fetch.
export const LOCAL_CHAT_TOPICS: readonly LocalTopic[] = [
  { id: 'emergency', label: 'Anticoncepción de urgencia', prompt: 'Anticoncepción de urgencia',
    pattern: /emergencia|urgencia|dia despues|sin proteccion|riesgo sexual|preservativo.*rot|condon.*rot/,
    text: 'Si hubo una relación sin protección o falló el método, consulta cuanto antes con una farmacia o un servicio sanitario. Según el método, hay opciones hasta 3 o 5 días después; conviene actuar pronto. El calendario de Aura no permite descartar un embarazo ni decidir que un día es seguro.', source: 'emergency' },
  { id: 'pregnancy', label: 'Retrasos y test de embarazo', prompt: 'Cuándo hacer un test de embarazo',
    pattern: /embaraz|retras|no me (baja|viene)|falta.*regla|gestacion/,
    text: 'La mayoría de los test son fiables desde el primer día de falta. Si no sabes cuándo esperabas la regla, hazlo al menos 21 días después de la última relación sin protección. Sigue las instrucciones; si sale negativo y la regla no llega, repítelo unos días después y consulta si persiste la duda.', source: 'pregnancy' },
  { id: 'import', label: 'Importar y exportar', prompt: 'Importar y exportar mis datos',
    pattern: /import|export|copia|backup|apple|\bflo\b|archivo|\bcsv\b|\bpdf\b/,
    text: 'La importación, exportación y las copias disponibles están en Ajustes. Revisa el formato admitido antes de seleccionar un archivo y comprueba las fechas tras importarlo. Este chat no abre archivos ni añade registros a tu calendario. El historial de esta conversación se guarda por separado en este navegador.' },
  { id: 'privacy', label: 'Privacidad y modo sin conexión', prompt: 'Privacidad del chat sin conexión',
    pattern: /privac|privad|offline|sin conexion|internet|borrar|historial|guardad|cifrad|segur.*datos/,
    text: 'El chat responde con un catálogo incluido en la app: no envía tus mensajes a un modelo remoto y ofrece los mismos temas con y sin conexión. El historial queda en este navegador, separado por usuario, y puedes borrarlo desde la papelera del chat. No está cifrado con una contraseña. Los enlaces a fuentes externas necesitan conexión.' },
  { id: 'pcos', label: 'SOP e irregularidad', prompt: 'Información sobre SOP e irregularidad',
    pattern: /\bsop\b|\bpcos\b|poliqu|irregular|inositol/,
    text: 'Los ciclos irregulares pueden tener distintas causas. Un chequeo breve no diagnostica SOP ni confirma que has ovulado. Registra fechas y cambios que quieras comentar en consulta; el diagnóstico y los tratamientos requieren valoración individual. No empieces suplementos ni cambies medicación basándote en este chat.', source: 'pcos', quizKey: 'pcos' },
  { id: 'pms', label: 'Síntomas premenstruales', prompt: 'Síntomas premenstruales y SPM',
    pattern: /premenstrual|\bspm\b|\bpms\b|antojo|irritab|hincha|trist|animo/,
    text: 'Los síntomas antes de la regla pueden variar entre ciclos. Anotar cuándo aparecen y cuánto afectan a tu día durante al menos dos ciclos puede ayudar en consulta. Descanso, actividad adaptada y comidas regulares pueden ser útiles. Si afectan a tus relaciones, trabajo o bienestar, pide ayuda profesional; un chequeo no establece un diagnóstico.', source: 'pms', quizKey: 'pms' },
  { id: 'sleep', label: 'Sueño y cafeína', prompt: 'Mejorar el sueño y el descanso',
    pattern: /sueno|dorm|descans|insomnio|cafe|cafeina|postura/,
    text: 'Mantén una hora de levantarte regular, reserva un rato tranquilo antes de acostarte y procura un dormitorio oscuro y cómodo. Evita café o té durante las seis horas previas a dormir si afectan a tu descanso. Si las dificultades persisten o limitan tu día, consulta. Puedes completar el chequeo de sueño para ordenar cómo te encuentras.', source: 'sleep', quizKey: 'sleep' },
  { id: 'stress', label: 'Estrés y respiración', prompt: 'Estrés y respiración tranquila',
    pattern: /estres|ansiedad|respira|tension|agobio|4.?7.?8|calmar/,
    text: 'Haz una pausa en una postura cómoda. Inspira por la nariz y suelta el aire suavemente, sin forzar ni retener la respiración. Puedes contar despacio si te ayuda. Si te mareas, vuelve a respirar con normalidad. Esta práctica puede acompañar el cuidado diario; si el malestar persiste, busca apoyo profesional.', source: 'stress', quizKey: 'stress' },
  { id: 'nutrition', label: 'Alimentación y suplementos', prompt: 'Alimentación y suplementos',
    pattern: /nutric|aliment|comida|dieta|hierro|semilla|seed cycling|azucar|magnesio|suplement|infusion|jengibre|receta/,
    text: 'Una alimentación variada y regular es una base de cuidado. No puedo indicarte una dieta clínica ni dosis de suplementos. No se puede prometer equilibrio hormonal con semillas o infusiones. Comenta cualquier suplemento con un profesional, especialmente si tomas medicación o podrías estar embarazada.', source: 'pms' },
  { id: 'movement', label: 'Movimiento y ejercicio', prompt: 'Movimiento y ejercicio durante el ciclo',
    pattern: /movimiento|ejercicio|entren|deporte|fuerza|hiit|pilates|yoga|estira|camina/,
    text: 'Ajusta la actividad a cómo te encuentras. Caminar o hacer movimiento suave puede ayudar con las molestias menstruales; no hay una intensidad obligatoria por fase. Reduce o para si aparece dolor. Si las molestias impiden tus actividades habituales, consulta en vez de forzar el entrenamiento.', source: 'pain' },
  { id: 'pain', label: 'Dolor y cólicos', prompt: 'Dolor menstrual y cólicos',
    pattern: /dolor|colico|calambre|calor|ibuprofeno|paracetamol|analges|endometriosis|prostaglandina/,
    text: 'Para molestias leves, prueba calor templado envuelto en una tela o movimiento suave si te resulta cómodo. Evita el calor que queme. Si el dolor es intenso, distinto del habitual o no mejora, busca atención sanitaria. No puedo elegir un medicamento ni una dosis para ti; consulta el prospecto y a un profesional.', source: 'pain', quizKey: 'cramps' },
  { id: 'bleeding', label: 'Sangrado y manchado', prompt: 'Sangrado y manchado menstrual',
    pattern: /sangrad|manchad|spotting|flujo abundante|hemorrag/,
    text: 'Anota duración, cantidad aproximada y cambios respecto a tu patrón habitual. Si sangras entre reglas, después de relaciones o tras la menopausia, pide valoración. Si el sangrado es muy abundante y te encuentras débil o mareada, busca atención urgente. El chat no puede determinar la causa.', source: 'periods' },
  { id: 'fertility', label: 'Ovulación y fertilidad', prompt: 'Ovulación y fertilidad',
    pattern: /ovul|fertil|moco|temperatura basal|\bbbt\b|concebir/,
    text: 'La fecha de ovulación puede variar. El calendario y los síntomas dan estimaciones, no una confirmación de ovulación ni días seguros para evitar un embarazo. Con ciclos irregulares la incertidumbre puede ser mayor. Si buscas embarazo o necesitas anticoncepción, pide orientación adaptada a tu situación.', source: 'periods' },
  { id: 'contraception', label: 'Anticonceptivos', prompt: 'Anticonceptivos y cambios del ciclo',
    pattern: /anticoncept|pildora|pastilla|\bdiu\b|implante|olvido|condon|preservativo/,
    text: 'Los anticonceptivos pueden cambiar el patrón de sangrado y algunos suprimen la ovulación. Sigue las instrucciones de tu método; ante un olvido, consulta su prospecto o a una farmacia. Aura no puede indicar días sin riesgo ni sustituir un método anticonceptivo. Si hubo un fallo reciente, consulta sobre anticoncepción de urgencia.', source: 'emergency' },
  { id: 'intimacy', label: 'Intimidad y deseo', prompt: 'Intimidad y deseo sexual',
    pattern: /intimidad|sexo|sexual|libido|deseo|orgasmo|relacion/,
    text: 'El deseo puede variar y no tienes que ajustarte a un patrón de ciclo. Puedes registrar cómo te sientes sin sacar conclusiones a partir de un solo día. Si hay dolor durante las relaciones o sangrado después, pide valoración. El consentimiento, la comodidad y la protección siguen siendo lo principal.', source: 'periods' },
  { id: 'biomarkers', label: 'Analíticas y hormonas', prompt: 'Analíticas y hormonas',
    pattern: /analitic|hormona|progester|estradiol|\blh\b|\bfsh\b|\bamh\b|biomarc|laboratorio/,
    text: 'Un valor aislado no permite confirmar una enfermedad, tu fertilidad ni que hayas ovulado. La interpretación depende de las unidades, los intervalos del laboratorio, la fecha y tu historia clínica. Guarda el informe original y revísalo con tu profesional. Este chat no interpreta analíticas de forma diagnóstica.' },
  { id: 'phase', label: 'Mi fase y cuidados de hoy', prompt: 'Consejos para mi fase de hoy',
    pattern: /fase|ciclo|menstrual|regla|hoy|cuidarm|consejo/,
    text: 'La fase mostrada en Aura es una estimación a partir de tus registros. Úsala para observar patrones y decide el descanso y la actividad según cómo te encuentres. El calendario no mide hormonas ni permite descartar problemas de salud.' }
];

export const CHAT_QUIZ_SUGGESTIONS: ChatSuggestion[] = [
  { id: 'quiz_stress', label: 'Chequeo de estrés', action: 'quiz', quizKey: 'stress' },
  { id: 'quiz_sleep', label: 'Chequeo de sueño', action: 'quiz', quizKey: 'sleep' },
  { id: 'quiz_cramps', label: 'Chequeo de cólicos', action: 'quiz', quizKey: 'cramps' },
  { id: 'quiz_pms', label: 'Chequeo premenstrual', action: 'quiz', quizKey: 'pms' },
  { id: 'quiz_pcos', label: 'Chequeo de irregularidad', action: 'quiz', quizKey: 'pcos' }
];

export function normalizeChatText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function isUrgentChatMessage(text: string): boolean {
  return /desmay|insoport|incapacit|dolor.*(muy fuerte|intens|repentin)|sangrad.*(muy abundant|no para)|no puedo respirar|suicid|hacerme dano|matarme/.test(normalizeChatText(text));
}

export function detectChatQuiz(text: string): ChatQuizKey | null {
  const normalized = normalizeChatText(text);
  // Only an explicit request starts a questionnaire; ordinary symptom questions stay questions.
  if (!/chequeo|cuestionario|evaluacion|test de (estres|sueno|colicos|spm|sop)/.test(normalized)) return null;
  if (/estres|ansiedad/.test(normalized)) return 'stress';
  if (/sueno|descans/.test(normalized)) return 'sleep';
  if (/colico|dolor/.test(normalized)) return 'cramps';
  if (/spm|premenstrual/.test(normalized)) return 'pms';
  if (/\bsop\b|pcos|irregular/.test(normalized)) return 'pcos';
  return null;
}

export function topicSuggestion(topic: Pick<LocalTopic, 'id' | 'label' | 'prompt'>): ChatSuggestion {
  return { id: topic.id, label: topic.label, prompt: topic.prompt, action: 'ask' };
}

export async function generateChatResponse(prompt: string, history: ChatMessage[], context: ChatContext): Promise<AIResponse> {
  const text = normalizeChatText(prompt.slice(0, 4000));
  if (isUrgentChatMessage(text)) return {
    mode: 'local', topicId: 'urgent',
    text: 'Si tienes dolor intenso o repentino, desmayo, dificultad para respirar, sangrado abundante con debilidad o riesgo de hacerte daño, busca ayuda urgente. Llama al número de emergencias de tu zona (112 en España y la UE) si hay peligro inmediato. Este chat no puede valorar una urgencia.',
    sources: [sources.pelvic, sources.pms]
  };
  let topic = LOCAL_CHAT_TOPICS.find(item => item.pattern.test(text));
  if (!topic && /^(mas|cuentame mas|dime mas|y que mas|continua|explica|si)[.!? ]*$/.test(text)) {
    const previous = [...history].reverse().find(message => message.role === 'assistant' && message.topicId);
    topic = LOCAL_CHAT_TOPICS.find(item => item.id === previous?.topicId);
  }
  if (!topic) return {
    mode: 'local', topicId: 'catalog',
    text: /^(hola|buenas|hey|gracias)[!. ]*$/.test(text)
      ? 'Hola. Puedes preguntarme por tu ciclo o elegir un tema. La orientación y los cinco chequeos funcionan en este dispositivo, también sin conexión.'
      : 'No encuentro una respuesta específica en el catálogo local. Puedo ofrecer orientación general sobre estos temas y ayudarte a ordenar tus preguntas para consulta. No puedo diagnosticar, buscar en internet ni interpretar una situación clínica individual.',
    suggestions: LOCAL_CHAT_TOPICS.filter(item => ['pain', 'sleep', 'phase', 'privacy'].includes(item.id)).map(topicSuggestion)
  };
  const phaseNote = topic.id === 'phase' ? `Fase estimada: **${context.dayInfo.phaseName}**, día ${context.dayInfo.dayOfCycle}.\n\n` : '';
  const suggested = LOCAL_CHAT_TOPICS.filter(item => item.id !== topic.id && ['pain', 'sleep', 'phase', 'nutrition'].includes(item.id)).slice(0, 2).map(topicSuggestion);
  if (topic.quizKey) suggested.unshift(CHAT_QUIZ_SUGGESTIONS.find(item => item.quizKey === topic.quizKey)!);
  return { mode: 'local', topicId: topic.id, text: `**${topic.label}**\n\n${phaseNote}${topic.text}`,
    sources: topic.source ? [sources[topic.source]] : [], suggestions: suggested };
}
