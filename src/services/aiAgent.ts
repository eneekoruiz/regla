import type { CycleDayInfo, SymptomItem, UserSettings } from '../types/cycle';
import type { CycleStatistics } from '../types/prediction';
import { findAmbiguousSymptomRule, parseNaturalLanguageInput } from '../utils/nlpParser';

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
  loggedSymptoms?: SymptomItem[];
  periodAction?: 'start' | 'stop' | 'spotting';
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
    text: 'Tu privacidad es lo primero. Este chat funciona de forma completamente local en tu navegador con un catálogo integrado de bienestar y no envía tus mensajes a un modelo remoto ni a ningún servidor externo. Tus conversaciones no se comparten con nadie. Puedes limpiar tu historial cuando quieras desde el icono de papelera.', source: 'periods' },
  { id: 'pcos', label: 'SOP e irregularidad', prompt: 'Información sobre SOP e irregularidad',
    pattern: /\bsop\b|\bpcos\b|poliqu|irregular|inositol/,
    text: 'Tener ciclos irregulares o sospecha de SOP es muy frecuente y no estás sola en esto. Los ciclos pueden variar por muchos factores hormonales y metabólicos. Anotar tus síntomas y cuándo aparecen te dará información valiosa para compartir con tu ginecóloga. Puedes hacer el chequeo rápido de SOP para ver qué áreas comentar en tu próxima visita.', source: 'pcos', quizKey: 'pcos' },
  { id: 'pms', label: 'Síntomas premenstruales', prompt: 'Síntomas premenstruales y SPM',
    pattern: /premenstrual|\bspm\b|\bpms\b|antojo|irritab|hincha|trist|animo/,
    text: 'Los días previos a la regla pueden ser una auténtica montaña rusa emocional y física. La hinchazón, la sensibilidad y los cambios de humor son respuestas directas al cambio de estrógenos y progesterona. No te juzges por sentirte vulnerable o con menos paciencia. Descansar, hidratarte y comer alimentos reconfortantes te ayudará a transitarlo mejor.', source: 'pms', quizKey: 'pms' },
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

// Conversational boundary responses for banter, teasing, jokes and off-topic questions
const BANTER_PATTERN = /^(eres (tonta|fea|un robot|mala|inutil|tonto|pesada)|no sirves|menuda mierda|te odio|vaya bot|vacilando|no me vaciles|te voy a pillar|a ver si sabes|tu que sabes|sabes algo|me caes mal|jajaja+|jejeje+|jaja+|xd+|lol+|que chiste|cuentame un chiste|dime un chiste|chiste|hazme reir|broma|cuentame una broma|eres una maquina|dime algo gracioso)[.!? ]*$/i;
const AFFECTION_PATTERN = /^(te quiero|te amo|casate conmigo|me gustas|eres hermosa|eres guapa|que maja|un beso|quieres salir|dame un beso|eres mi amor)[.!? ]*$/i;

const WITTY_BANTER_RESPONSES = [
  '¡Eh, que te veo venir con la guasa! 😉 Me caes genial y me encanta el buen humor, pero no me vaciles que me pongo solemne y te suelto una conferencia sobre la fase lútea de tres horas.\n\nBromas aparte, ¿cómo te encuentras hoy de verdad? Si tienes alguna molestia, cansancio o simplemente quieres ver cómo mimar tu cuerpo, aquí me tienes.',
  'Jajaja, ¡muy agudo el intento! 😂 Pero no me hagas quemar neuronas digitales en bromas o vaciles, que luego no me quedan para cuidar tu ciclo.\n\nCuéntame mejor: ¿cómo va ese cuerpo hoy? ¿Algún síntoma o algo que quieras apuntar en tu diario?',
  '¡Ay, qué arte tienes! Pero me temo que eso se escapa totalmente de mi especialidad. Si quieres hablamos de tus hormonas, de cómo te sientes hoy o de por qué a veces nos apetece arrasar con el chocolate, pero de lo otro... ¡hago aguas! 🌸\n\n¿En qué te puedo echar una mano hoy con tu salud?',
  'Veo que vienes con ganas de fiesta hoy 😉 Me alegra que estés con ese ánimo, pero para vacilarme tendrás que madrugar más. Venga, céntrate conmigo: ¿cómo llevas el ciclo o qué te apetece registrar hoy?'
];

const WITTY_OUT_OF_SCOPE_RESPONSES = [
  'Creo que eso no está dentro del área de lo que te puedo responder con rigor (¡zapatero a tus zapatos!). A mí sácame de fases del ciclo, cólicos, descanso o cambios de humor y me pierdo por completo.\n\nPara mimarte con pautas de bienestar, entender tus síntomas o anotar cómo estás hoy, estoy aquí al 100%. ¿Qué tal llevas el día?',
  'Mmm, me parece que eso se sale bastante de mi radar de bienestar femenino y salud menstrual... Ojalá ser enciclopedia universal, pero prefiero serte sincera antes que inventar.\n\n¿Hay algo sobre cómo te sientes en tu cuerpo o en tus emociones hoy en lo que te pueda ayudar?',
  '¡Uy! Eso queda bastante lejos de mi terreno ginecológico y hormonal. Lo mío es acompañarte en tu día a día con tu regla, tus síntomas y tu descanso.\n\nSi necesitas revisar tu fase actual o registrar alguna molestia, dime con toda confianza.'
];

const WITTY_AFFECTION_RESPONSES = [
  '¡Ay, qué linda eres! 🥰 Me alegra un montón hacerte compañía cada día. Recuerda que soy tu aliada digital para entender tu cuerpo y tu ciclo sin juzgarte.\n\n¿Cómo te encuentras hoy? ¿Todo en orden con tu cuerpo y tus emociones?',
  '¡Gracias por ese cariño! Se agradece un montón entre tanto hablar de cólicos y hormonas. Aquí estoy para cuidarte siempre. ¿Qué tal va tu día hoy?'
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function isInformativeQuery(text: string): boolean {
  return /^(¿?\s*(por que|por qué|que es|qué es|como funciona|cómo funciona|como aliviar|cómo aliviar|cuando|cuándo|informacion sobre|información sobre|saber sobre|explicame|explícame|consejos para|que hacer|qué hacer|que puedo tomar|para que sirve|en que consiste))\b/i.test(text);
}

function isPersonalSymptomStatement(text: string): boolean {
  if (isInformativeQuery(text)) return false;
  const hasPersonalCue = /\b(tengo|siento|me duele[n]?|estoy con|he tenido|anota(r)?|apunta(r)?|registra(r)?|guarda(r)?|hoy|ahora|me ha bajado|empezo|se (me )?acabo|fin de|termino)\b/i.test(text);
  const hasDirectState = /\b(estoy (muy )?(cansa(da|do)|agota(da|do)|fatiga(da|do)|triste|feliz|radiante|irritable|estresa(da|do)|sensible|choff|hinchada|destemplada))\b/i.test(text);
  const hasDirectSymptom = /\b(dolor de (cabeza|espalda|ovarios|vientre)|colicos? menstruales?|jaqueca|migra[ñn]a|insomnio|antojos? de dulce|mucha hambre)\b/i.test(text);
  return hasPersonalCue || hasDirectState || hasDirectSymptom;
}

function buildSymptomLogResponse(symptoms: SymptomItem[], periodAction?: 'start' | 'stop' | 'spotting'): { text: string; suggestions: ChatSuggestion[]; topicId: string } {
  if (periodAction === 'start') {
    return {
      topicId: 'phase',
      text: '¡Entendido y anotado!\n\nHe registrado el **inicio de tu regla** hoy en tu calendario. Tu ciclo y las próximas fases se han recalculado automáticamente.\n\nRecuerda darte un extra de mimo, descansar lo que necesites y mantenerte bien hidratada en estos primeros días de sangrado.',
      suggestions: [
        { id: 'phase_advice', label: 'Consejos para mi fase de hoy', action: 'ask', prompt: 'Consejos para mi fase de hoy' },
        { id: 'pain_advice', label: 'Dolor menstrual y cólicos', action: 'ask', prompt: 'Dolor menstrual y cólicos' }
      ]
    };
  }

  if (periodAction === 'stop') {
    return {
      topicId: 'phase',
      text: '¡Anotado el **fin de tu regla**!\n\nHas completado los días de sangrado y entras en fase folicular. Poco a poco tus niveles de estrógenos empezarán a subir y notarás cómo tu cuerpo recupera vitalidad y claridad mental.',
      suggestions: [
        { id: 'phase_advice', label: 'Consejos para mi fase de hoy', action: 'ask', prompt: 'Consejos para mi fase de hoy' },
        { id: 'movement_advice', label: 'Movimiento y ejercicio', action: 'ask', prompt: 'Movimiento y ejercicio durante el ciclo' }
      ]
    };
  }

  if (periodAction === 'spotting') {
    return {
      topicId: 'bleeding',
      text: '¡Anotado!\n\nHe registrado **manchado leve (spotting)** en tu día de hoy. El manchado puede deberse a la ovulación, pequeñas variaciones hormonales o implantación. Si persiste o se acompaña de dolor agudo, recuerda consultarlo con tu médica.',
      suggestions: [
        { id: 'bleeding_advice', label: 'Sangrado y manchado', action: 'ask', prompt: 'Sangrado y manchado menstrual' },
        { id: 'phase_advice', label: 'Consejos para mi fase de hoy', action: 'ask', prompt: 'Consejos para mi fase de hoy' }
      ]
    };
  }

  const list = symptoms.map(s => `• **${s.name}**${s.severity && s.severity !== 'moderate' ? ` (${s.severity === 'intense' ? 'intensidad fuerte' : 'intensidad suave'})` : ''}`).join('\n');
  
  let advice = 'He registrado estos datos en tu calendario de hoy para que lleves un seguimiento fiel y sin esfuerzo de tu salud.';
  if (symptoms.some(s => s.id === 'cramps')) {
    advice = 'Siento mucho que estés con cólicos. Recuerda que aplicar calor suave en el bajo vientre con una bolsa térmica relaja la musculatura pélvica rápidamente, y hacer respiraciones lentas soltando el abdomen ayuda a calmar la zona.';
  } else if (symptoms.some(s => s.id === 'headache')) {
    advice = 'Las cefaleas pueden deberse a cambios bruscos de estrógenos o a tensión acumulada. Intenta bajar la luz de las pantallas, beber agua fresca y masajear tus sienes y cuello despacio.';
  } else if (symptoms.some(s => s.id === 'fatigue')) {
    advice = 'Si el cuerpo te pide parar hoy, concédetelo sin culpa. Los cambios hormonales consumen mucha energía interna; el descanso también es salud.';
  } else if (symptoms.some(s => s.id === 'back_pain')) {
    advice = 'Para la molestia lumbar, estiramientos suaves como la postura del niño o calor local en la espalda baja descargan la tensión de la pelvis de maravilla.';
  } else if (symptoms.some(s => s.id === 'nausea')) {
    advice = 'Para el malestar digestivo, una infusión tibia de jengibre o manzanilla tomada a pequeños sorbos suele asentar el estómago enseguida.';
  } else if (symptoms.some(s => s.id === 'bloating')) {
    advice = 'La hinchazón por retención de líquidos es muy común. Reducir la sal hoy, moverte con una caminata suave y beber suficiente agua te devolverá la ligereza.';
  } else if (symptoms.some(s => s.id === 'sensitive_mood' || s.id === 'irritable')) {
    advice = 'Tus emociones son completamente válidas. Las oscilaciones hormonales influyen directamente en la serotonina; trátate con mucha amabilidad hoy.';
  }

  const suggestions: ChatSuggestion[] = [];
  if (symptoms.some(s => s.id === 'cramps' || s.id === 'back_pain')) {
    suggestions.push(
      { id: 'sugg_pain', label: 'Alivio del dolor', action: 'ask', prompt: 'Dolor menstrual y cólicos' },
      { id: 'quiz_cramps', label: 'Chequeo de cólicos', action: 'quiz', quizKey: 'cramps' }
    );
  } else if (symptoms.some(s => s.id === 'fatigue' || s.id === 'insomnia')) {
    suggestions.push(
      { id: 'sugg_sleep', label: 'Mejorar el sueño', action: 'ask', prompt: 'Mejorar el sueño y el descanso' },
      { id: 'quiz_sleep', label: 'Chequeo de sueño', action: 'quiz', quizKey: 'sleep' }
    );
  } else if (symptoms.some(s => s.id === 'sensitive_mood' || s.id === 'irritable')) {
    suggestions.push(
      { id: 'sugg_stress', label: 'Calmar el estrés', action: 'ask', prompt: 'Estrés y respiración tranquila' },
      { id: 'quiz_stress', label: 'Chequeo de estrés', action: 'quiz', quizKey: 'stress' }
    );
  } else {
    suggestions.push(
      { id: 'sugg_phase', label: 'Mi fase y cuidados de hoy', action: 'ask', prompt: 'Consejos para mi fase de hoy' },
      { id: 'sugg_nutrition', label: 'Alimentación y suplementos', action: 'ask', prompt: 'Alimentación y suplementos' }
    );
  }

  return {
    topicId: symptoms[0]?.id || 'symptom_log',
    text: `¡Anotado en tu diario de hoy!\n\n${list}\n\n${advice}\n\n¿Quieres que veamos consejos para aliviarlo o prefieres descansar?`,
    suggestions
  };
}

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
  
  // 1. Urgent health queries
  if (isUrgentChatMessage(text)) return {
    mode: 'local', topicId: 'urgent',
    text: 'Si tienes dolor intenso o repentino, desmayo, dificultad para respirar, sangrado abundante con debilidad o riesgo de hacerte daño, busca ayuda urgente. Llama al número de emergencias de tu zona (112 en España y la UE) si hay peligro inmediato. Este chat no puede valorar una urgencia.',
    sources: [sources.pelvic, sources.pms]
  };

  // 2. Direct catalog prompt match (e.g. from buttons or catalog clicks)
  const catalogByPrompt = LOCAL_CHAT_TOPICS.find(item => normalizeChatText(item.prompt) === text);
  if (catalogByPrompt) {
    const phaseNote = catalogByPrompt.id === 'phase' ? `Fase estimada: **${context.dayInfo.phaseName}**, día ${context.dayInfo.dayOfCycle}.\n\n` : '';
    const suggested = LOCAL_CHAT_TOPICS.filter(item => item.id !== catalogByPrompt.id && ['pain', 'sleep', 'phase', 'nutrition'].includes(item.id)).slice(0, 2).map(topicSuggestion);
    if (catalogByPrompt.quizKey) suggested.unshift(CHAT_QUIZ_SUGGESTIONS.find(item => item.quizKey === catalogByPrompt.quizKey)!);
    return {
      mode: 'local', topicId: catalogByPrompt.id, text: `**${catalogByPrompt.label}**\n\n${phaseNote}${catalogByPrompt.text}`,
      sources: catalogByPrompt.source ? [sources[catalogByPrompt.source]] : [], suggestions: suggested
    };
  }

  // 3. Ambiguous symptom clarification
  const ambiguous = findAmbiguousSymptomRule(text);
  if (ambiguous) {
    return {
      mode: 'local',
      topicId: 'disambiguation',
      text: ambiguous.clarificationText,
      suggestions: ambiguous.options.map(opt => ({
        id: opt.id,
        label: `${opt.emoji} ${opt.label}`,
        action: 'ask',
        prompt: opt.confirmPrompt
      }))
    };
  }

  // 4. Direct unambiguous personal symptom reporting
  if (isPersonalSymptomStatement(text)) {
    const parsed = parseNaturalLanguageInput(prompt);
    const knownSymptoms = parsed.symptoms.filter(s => !s.id.startsWith('custom_'));
    if (knownSymptoms.length > 0 || parsed.periodAction) {
      const logResult = buildSymptomLogResponse(knownSymptoms, parsed.periodAction);
      return {
        mode: 'local',
        topicId: logResult.topicId,
        text: logResult.text,
        suggestions: logResult.suggestions,
        loggedSymptoms: knownSymptoms,
        periodAction: parsed.periodAction
      };
    }
  }

  // 5. Follow-ups to earlier topic ("cuéntame más", "continúa", etc.)
  if (/^(mas|cuentame mas|dime mas|y que mas|continua|explica|si)[.!? ]*$/.test(text)) {
    const previous = [...history].reverse().find(message => message.role === 'assistant' && message.topicId);
    const prevTopic = LOCAL_CHAT_TOPICS.find(item => item.id === previous?.topicId);
    if (prevTopic) {
      const phaseNote = prevTopic.id === 'phase' ? `Fase estimada: **${context.dayInfo.phaseName}**, día ${context.dayInfo.dayOfCycle}.\n\n` : '';
      const suggested = LOCAL_CHAT_TOPICS.filter(item => item.id !== prevTopic.id && ['pain', 'sleep', 'phase', 'nutrition'].includes(item.id)).slice(0, 2).map(topicSuggestion);
      if (prevTopic.quizKey) suggested.unshift(CHAT_QUIZ_SUGGESTIONS.find(item => item.quizKey === prevTopic.quizKey)!);
      return {
        mode: 'local', topicId: prevTopic.id, text: `**${prevTopic.label}**\n\n${phaseNote}${prevTopic.text}`,
        sources: prevTopic.source ? [sources[prevTopic.source]] : [], suggestions: suggested
      };
    }
  }

  // 6. Topic pattern match
  const topic = LOCAL_CHAT_TOPICS.find(item => item.pattern.test(text));
  if (topic) {
    const phaseNote = topic.id === 'phase' ? `Fase estimada: **${context.dayInfo.phaseName}**, día ${context.dayInfo.dayOfCycle}.\n\n` : '';
    const suggested = LOCAL_CHAT_TOPICS.filter(item => item.id !== topic.id && ['pain', 'sleep', 'phase', 'nutrition'].includes(item.id)).slice(0, 2).map(topicSuggestion);
    if (topic.quizKey) suggested.unshift(CHAT_QUIZ_SUGGESTIONS.find(item => item.quizKey === topic.quizKey)!);
    return {
      mode: 'local', topicId: topic.id, text: `**${topic.label}**\n\n${phaseNote}${topic.text}`,
      sources: topic.source ? [sources[topic.source]] : [], suggestions: suggested
    };
  }

  // 7. Warm greetings
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|como estas|quien eres|como te llamas|gracias|muchas gracias)[!. ]*$/.test(text)) {
    return {
      mode: 'local', topicId: 'catalog',
      text: '¡Hola! Qué alegría hablar contigo. Estoy aquí para acompañarte, resolver dudas sobre tu ciclo, entender lo que estás sintiendo o darte pautas de autocuidado suave. Puedes contarme cómo te encuentras hoy o elegir uno de estos temas para empezar:',
      suggestions: LOCAL_CHAT_TOPICS.filter(item => ['pain', 'sleep', 'phase', 'nutrition'].includes(item.id)).map(topicSuggestion)
    };
  }

  // 8. Banter, teasing, jokes and trolling
  if (BANTER_PATTERN.test(text)) {
    const idx = (simpleHash(text) + history.length) % WITTY_BANTER_RESPONSES.length;
    return {
      mode: 'local',
      topicId: 'catalog',
      text: WITTY_BANTER_RESPONSES[idx],
      suggestions: LOCAL_CHAT_TOPICS.filter(item => ['pain', 'phase', 'stress', 'sleep'].includes(item.id)).map(topicSuggestion)
    };
  }

  // 9. Affection and flirting
  if (AFFECTION_PATTERN.test(text)) {
    const idx = (simpleHash(text) + history.length) % WITTY_AFFECTION_RESPONSES.length;
    return {
      mode: 'local',
      topicId: 'catalog',
      text: WITTY_AFFECTION_RESPONSES[idx],
      suggestions: LOCAL_CHAT_TOPICS.filter(item => ['phase', 'stress', 'pain'].includes(item.id)).map(topicSuggestion)
    };
  }

  // 10. Out-of-scope / Unfamiliar queries fallback (with personality and boundaries)
  const idx = (simpleHash(text) + history.length) % WITTY_OUT_OF_SCOPE_RESPONSES.length;
  return {
    mode: 'local',
    topicId: 'catalog',
    text: WITTY_OUT_OF_SCOPE_RESPONSES[idx],
    suggestions: LOCAL_CHAT_TOPICS.filter(item => ['pain', 'sleep', 'phase', 'nutrition'].includes(item.id)).map(topicSuggestion)
  };
}
