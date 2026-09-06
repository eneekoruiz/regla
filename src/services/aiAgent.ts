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
    text: 'Si hubo una relación sin protección o falló el método, es importante que consultes cuanto antes en una farmacia o centro sanitario. Según el método elegido, hay opciones eficaces durante las primeras 72 o 120 horas (3 a 5 días), y cuanto antes se actúe, mejor. El calendario de Aura no permite descartar un embarazo ni calcular días seguros.', source: 'emergency' },
  { id: 'pregnancy', label: 'Retrasos y test de embarazo', prompt: 'Cuándo hacer un test de embarazo',
    pattern: /embaraz|retras|no me (baja|viene)|falta.*regla|gestacion/,
    text: 'Entiendo que un retraso pueda inquietarte. La mayoría de los test de orina son muy fiables desde el primer día de falta de la regla. Si no sabes cuándo la esperabas, realízalo al menos 21 días después de la última relación sexual sin protección. Si sale negativo y sigue sin bajarte tras unos días, repítelo con calma y consúltalo con tu médica.', source: 'pregnancy' },
  { id: 'import', label: 'Importar y exportar', prompt: 'Importar y exportar mis datos',
    pattern: /import|export|copia|backup|apple|\bflo\b|archivo|\bcsv\b|\bpdf\b/,
    text: 'Puedes gestionar todas tus copias y traspasos de datos desde el menú de Ajustes (icono de engranaje). Allí puedes exportar una copia normal o cifrada con clave, e importar archivos compatibles. Este chat funciona de forma totalmente privada e independiente dentro de tu navegador.', source: 'periods' },
  { id: 'privacy', label: 'Privacidad y modo sin conexión', prompt: 'Privacidad del chat sin conexión',
    pattern: /privac|privad|offline|sin conexion|internet|borrar|historial|guardad|cifrad|segur.*datos/,
    text: 'Tu privacidad es lo primero. Este chat funciona de forma completamente local en tu navegador con un catálogo integrado de bienestar. Tus conversaciones no se envían a ningún servidor externo ni se comparten con nadie. Puedes limpiar tu historial cuando quieras desde el icono de papelera.', source: 'periods' },
  { id: 'pcos', label: 'SOP e irregularidad', prompt: 'Información sobre SOP e irregularidad',
    pattern: /\bsop\b|\bpcos\b|poliqu|irregular|inositol/,
    text: 'Tener ciclos irregulares o sospecha de SOP es muy frecuente y no estás sola en esto. Los ciclos pueden variar por muchos factores hormonales y metabólicos. Anotar tus síntomas y cuándo aparecen te dará información valiosa para compartir con tu ginecóloga. Puedes hacer el chequeo rápido de SOP para ver qué áreas comentar en tu próxima visita.', source: 'pcos', quizKey: 'pcos' },
  { id: 'pms', label: 'Síntomas premenstruales', prompt: 'Síntomas premenstruales y SPM',
    pattern: /premenstrual|\bspm\b|\bpms\b|antojo|irritab|hincha|trist|animo/,
    text: 'Los días previos a la regla pueden ser una auténtica montaña rusa emocional y física. La hinchazón, la sensibilidad y los cambios de humor son respuestas directas al cambio de estrógenos y progesterona. No te juzgues por sentirte vulnerable o con menos paciencia. Descansar, hidratarte y comer alimentos reconfortantes te ayudará a transitarlo mejor.', source: 'pms', quizKey: 'pms' },
  { id: 'sleep', label: 'Sueño y descanso', prompt: 'Mejorar el sueño y el descanso',
    pattern: /sueno|dorm|descans|insomnio|cafe|cafeina|postura/,
    text: 'Un descanso reparador es fundamental para tu equilibrio hormonal. Procura atenuar las luces y alejar las pantallas una hora antes de dormir, y mantén tu habitación a una temperatura fresca y agradable. Si la mente no para de dar vueltas, dejar por escrito tus pensamientos en una libreta antes de meterte en la cama ayuda a desconectar. Tómate una infusión tibia y respira despacio.', source: 'sleep', quizKey: 'sleep' },
  { id: 'stress', label: 'Estrés y respiración', prompt: 'Estrés y respiración tranquila',
    pattern: /estres|ansiedad|respira|tension|agobio|4.?7.?8|calmar/,
    text: 'Respira hondo conmigo. Sé que a veces las cosas se acumulan y el cuerpo lo siente enseguida. Regálate tres respiraciones lentas: inspira por la nariz contando hasta 4, siente cómo se expande tu abdomen, y exhala suavemente por la boca contando hasta 6. Bajar los hombros y aflojar la mandíbula ya le envía a tu sistema nervioso una señal de calma. Estoy aquí contigo.', source: 'stress', quizKey: 'stress' },
  { id: 'nutrition', label: 'Alimentación y suplementos', prompt: 'Alimentación y suplementos',
    pattern: /nutric|aliment|comida|dieta|hierro|semilla|seed cycling|azucar|magnesio|suplement|infusion|jengibre|receta/,
    text: 'Nutrir tu cuerpo según el momento de tu ciclo te ayuda a sentirte con más ligereza y vitalidad. Los alimentos ricos en magnesio (como frutos secos o chocolate negro), el hierro de legumbres y verduras de hoja, y una buena hidratación son grandes aliados contra la pesadez y los cólicos. Escucha lo que te pide tu cuerpo sin culpas.', source: 'pms' },
  { id: 'movement', label: 'Movimiento y ejercicio', prompt: 'Movimiento y ejercicio durante el ciclo',
    pattern: /movimiento|ejercicio|entren|deporte|fuerza|hiit|pilates|yoga|estira|camina/,
    text: 'El movimiento no tiene que ser siempre exigente: caminar al aire libre, hacer estiramientos suaves o una sesión de yoga o pilates puede aliviar la congestión pélvica y mejorar tu estado de ánimo. Si en tus días de sangrado tu cuerpo te pide descansar, honra esa necesidad sin culpa; el descanso también es parte del entrenamiento.', source: 'pain' },
  { id: 'pain', label: 'Dolor y cólicos', prompt: 'Dolor menstrual y cólicos',
    pattern: /dolor|colico|calambre|calor|ibuprofeno|paracetamol|analges|endometriosis|prostaglandina/,
    text: 'Siento mucho que estés sintiendo molestias. Para aliviar los cólicos, el calor suave es maravilloso: una bolsa de agua tibia o una mantita en el bajo vientre relaja los músculos en pocos minutos. También ayuda hacer respiraciones profundas aflojando la pelvis. Si sueles tomar algún antiinflamatorio habitual, tómalo con alimentos. Si el dolor es incapacitante, no dudes en consultar a un profesional.', source: 'pain', quizKey: 'cramps' },
  { id: 'bleeding', label: 'Sangrado y manchado', prompt: 'Sangrado y manchado menstrual',
    pattern: /sangrad|manchad|spotting|flujo abundante|hemorrag/,
    text: 'Anota en tu diario la cantidad aproximada y los cambios de flujo que observes. Es normal que el flujo varíe entre los primeros días y el final de la regla. Si notas un sangrado entre reglas, tras las relaciones o si el sangrado es tan abundante que empapa una compresa por hora o te causa mareos, busca atención médica de inmediato.', source: 'periods' },
  { id: 'fertility', label: 'Ovulación y fertilidad', prompt: 'Ovulación y fertilidad',
    pattern: /ovul|fertil|moco|temperatura basal|\bbbt\b|concebir/,
    text: 'La ventana fértil y la ovulación varían según cada cuerpo y cada ciclo. Los cambios en el flujo cervical (más elástico y transparente) y la temperatura basal son señales naturales preciosas. Recuerda que las estimaciones del calendario son orientativas y no sustituyen un método anticonceptivo ni confirman la ovulación médica.', source: 'periods' },
  { id: 'contraception', label: 'Anticonceptivos', prompt: 'Anticonceptivos y cambios del ciclo',
    pattern: /anticoncept|pildora|pastilla|\bdiu\b|implante|olvido|condon|preservativo/,
    text: 'Los anticonceptivos hormonales regulan o suprimen el ciclo ovulatorio natural, por lo que los sangrados suelen ser por deprivación. Si tomas la píldora y has tenido un olvido, revisa el prospecto de tu caja y actúa rápido. Ante cualquier duda imprevista, consulta en tu farmacia o centro de salud.', source: 'emergency' },
  { id: 'intimacy', label: 'Intimidad y deseo', prompt: 'Intimidad y deseo sexual',
    pattern: /intimidad|sexo|sexual|libido|deseo|orgasmo|relacion/,
    text: 'El deseo sexual es fluctuante y completamente natural que cambie según la fase hormonal, el estrés o tu nivel de energía. No tienes ninguna obligación de sentirte igual todos los días. La clave siempre está en tu propia comodidad, tus deseos y el consentimiento mutuo. Si experimentas dolor o molestias durante las relaciones, coméntalo con tu especialista.', source: 'periods' },
  { id: 'biomarkers', label: 'Analíticas y hormonas', prompt: 'Analíticas y hormonas',
    pattern: /analitic|hormona|progester|estradiol|\blh\b|\bfsh\b|\bamh\b|biomarc|laboratorio/,
    text: 'Los valores hormonales cambian según el día exacto del ciclo en que se extraiga la muestra sanguínea. Guarda siempre el informe original con sus rangos de referencia y llévalo a tu médica o ginecóloga para que lo interprete dentro de tu contexto personal y de salud general.', source: 'periods' },
  { id: 'phase', label: 'Mi fase y cuidados de hoy', prompt: 'Consejos para mi fase de hoy',
    pattern: /fase|ciclo|menstrual|regla|hoy|cuidarm|consejo/,
    text: 'Tu ciclo es un proceso dinámico con cuatro fases: menstrual, folicular, ovulatoria y lútea. Cada una trae cambios en tus niveles de energía, concentración y emociones. Conocer en qué fase estás te permite planificar tu ritmo diario y cuidarte con amabilidad sin exigirte lo mismo cada día.' }
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
  if (!topic) {
    const isGreeting = /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|como estas|quien eres|como te llamas|gracias|muchas gracias)[!. ]*$/.test(text);
    return {
      mode: 'local', topicId: 'catalog',
      text: isGreeting
        ? '¡Hola! Qué alegría hablar contigo. Estoy aquí para acompañarte, resolver dudas sobre tu ciclo, entender lo que estás sintiendo o darte pautas de autocuidado suave. Puedes contarme cómo te encuentras o elegir uno de estos temas para empezar:'
        : 'Te escucho con atención y cariño. Estoy aquí para cuidarte y acompañarte en todo lo relativo a tu ciclo, tus emociones, síntomas físicos y descanso diario. Cuéntame con confianza qué estás sintiendo en tu cuerpo o qué te preocupa hoy, o si lo prefieres, elige alguno de estos temas para explorar juntas:',
      suggestions: LOCAL_CHAT_TOPICS.filter(item => ['pain', 'sleep', 'phase', 'nutrition'].includes(item.id)).map(topicSuggestion)
    };
  }
  const phaseNote = topic.id === 'phase' ? `Fase estimada: **${context.dayInfo.phaseName}**, día ${context.dayInfo.dayOfCycle}.\n\n` : '';
  const suggested = LOCAL_CHAT_TOPICS.filter(item => item.id !== topic.id && ['pain', 'sleep', 'phase', 'nutrition'].includes(item.id)).slice(0, 2).map(topicSuggestion);
  if (topic.quizKey) suggested.unshift(CHAT_QUIZ_SUGGESTIONS.find(item => item.quizKey === topic.quizKey)!);
  return { mode: 'local', topicId: topic.id, text: `**${topic.label}**\n\n${phaseNote}${topic.text}`,
    sources: topic.source ? [sources[topic.source]] : [], suggestions: suggested };
}
