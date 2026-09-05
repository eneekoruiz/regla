import type {
  CervicalMucusEntry,
  ChroniclerContext,
  ChroniclerResponse,
  ChroniclerStructuredData,
  EnergyEntry,
  MoodEntry,
  PeriodEntry,
  PhysicalSymptomEntry
} from '../types/chronicler';
import type { FlowIntensity } from '../types/cycle';
import { formatDateKey, parseDateKey } from '../utils/cycleCalculator';

/**
 * Helper to resolve relative temporal words in Spanish into a ISO date string (YYYY-MM-DD)
 */
export function resolveTargetDate(rawText: string, context: ChroniclerContext): { date: string; matchedSnippet?: string } {
  const lower = rawText.toLowerCase();
  const baseDate = parseDateKey(context.selectedDate || context.todayDate);

  if (/\b(hoy|esta ma[ñn]ana|esta tarde|ahora)\b/i.test(lower)) {
    return { date: context.todayDate, matchedSnippet: 'hoy' };
  }

  if (/\b(ayer|anoche|ayer por la (ma[ñn]ana|tarde|noche))\b/i.test(lower)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 1);
    return { date: formatDateKey(d), matchedSnippet: 'ayer' };
  }

  if (/\b(anteayer|antes de ayer)\b/i.test(lower)) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 2);
    return { date: formatDateKey(d), matchedSnippet: 'anteayer' };
  }

  // Fallback to currently selected date or today
  return { date: context.selectedDate || context.todayDate };
}

/**
 * Extracts explicit cycle day mentions (e.g. "mi segundo día" -> 2)
 */
export function extractCycleDayMention(lowerText: string): number | undefined {
  if (/\b(primer|1er|1º)\s+d[ií]a\b/i.test(lowerText) || /\bd[ií]a\s+1\b/i.test(lowerText)) return 1;
  if (/\b(segundo|2o|2º|segon)\s+d[ií]a\b/i.test(lowerText) || /\bd[ií]a\s+2\b/i.test(lowerText)) return 2;
  if (/\b(tercer|3er|3º)\s+d[ií]a\b/i.test(lowerText) || /\bd[ií]a\s+3\b/i.test(lowerText)) return 3;
  if (/\b(cuarto|4o|4º)\s+d[ií]a\b/i.test(lowerText) || /\bd[ií]a\s+4\b/i.test(lowerText)) return 4;
  if (/\b(quinto|5o|5º)\s+d[ií]a\b/i.test(lowerText) || /\bd[ií]a\s+5\b/i.test(lowerText)) return 5;
  if (/\b(sexto|6o|6º)\s+d[ií]a\b/i.test(lowerText) || /\bd[ií]a\s+6\b/i.test(lowerText)) return 6;
  if (/\b(s[eé]ptimo|7o|7º)\s+d[ií]a\b/i.test(lowerText) || /\bd[ií]a\s+7\b/i.test(lowerText)) return 7;

  const match = lowerText.match(/\bd[ií]a\s+(\d{1,2})\s+(del?\s+ciclo|de\s+(la\s+)?regla)\b/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 45) return num;
  }

  return undefined;
}

/**
 * Detects severity modifiers in surrounding context
 */
function extractSeverity(text: string): 'mild' | 'moderate' | 'intense' {
  if (/\b(un\s+poco|leve|suave|ligero|poquito|apenas|muy\s+poco)\b/i.test(text)) {
    return 'mild';
  }
  if (/\b(bastante|mucho|muy|fuerte|intenso|horrible|fatal|insoportable|a\s+morir|tremendo|much[ií]simo)\b/i.test(text)) {
    return 'intense';
  }
  return 'moderate';
}

/**
 * Main Agente Cronista parser and analyzer
 */
export async function analyzeChronicleNote(
  rawText: string,
  context: ChroniclerContext
): Promise<ChroniclerResponse> {
  const text = (rawText || '').trim();

  if (!text) {
    return {
      success: false,
      data: {
        targetDate: context.selectedDate || context.todayDate,
        period: { detected: false, isPeriod: false },
        physicalSymptoms: [],
        moods: [],
        energy: null,
        notes: '',
        confidence: 0,
        extractedSummary: []
      },
      empathyMessage: 'Aquí estoy para escucharte cuando quieras compartir cómo estás 🌸',
      error: 'Texto vacío'
    };
  }

  const lower = text.toLowerCase();
  const summary: string[] = [];
  let confidenceScore = 0.85;

  // 1. Resolve target date & cycle day
  const { date: targetDate } = resolveTargetDate(text, context);
  const cycleDayExplicit = extractCycleDayMention(lower);

  // 2. Analyze Period and Flow
  let periodEntry: PeriodEntry = { detected: false, isPeriod: false };

  if (/\b(me\s+ha\s+bajado\s+(la\s+regla|el\s+periodo)|empez[oó]\s+(la\s+regla|mi\s+periodo|el\s+sangrado)|vino\s+la\s+regla|primer\s+d[ií]a\s+de\s+regla)\b/i.test(lower)) {
    let flow: FlowIntensity = 'medium';
    if (extractSeverity(lower) === 'intense') flow = 'heavy';
    if (extractSeverity(lower) === 'mild') flow = 'light';

    periodEntry = {
      detected: true,
      isPeriod: true,
      flow,
      isCycleStart: true,
      rawSnippet: 'Inicio de regla'
    };
    summary.push('🩸 Inicio de periodo');
  } else if (/\b(manchado|manchando|gotitas|manchitas|manchas\s+marrones)\b/i.test(lower)) {
    periodEntry = {
      detected: true,
      isPeriod: true,
      flow: 'spotting',
      rawSnippet: 'Manchado leve'
    };
    summary.push('💧 Manchado leve');
  } else if (/\b(se\s+(me\s+)?acab[oó]\s+(la\s+regla|el\s+periodo)|ya\s+no\s+sangro|fin\s+del?\s+(sangrado|periodo|regla))\b/i.test(lower)) {
    periodEntry = {
      detected: true,
      isPeriod: false,
      isCycleEnd: true,
      rawSnippet: 'Fin de regla'
    };
    summary.push('✨ Fin de sangrado');
  } else if (cycleDayExplicit && cycleDayExplicit <= 5) {
    periodEntry = {
      detected: true,
      isPeriod: true,
      flow: 'medium',
      rawSnippet: `Día ${cycleDayExplicit} de regla`
    };
    summary.push(`🩸 Día ${cycleDayExplicit} de periodo`);
  }

  // 3. Extract Physical Symptoms
  const physicalSymptoms: PhysicalSymptomEntry[] = [];

  // Cramps / Belly / Uterus pain
  if (
    /\b(c[oó]lico[s]?|retortijones?|espasmos?)\b/i.test(lower) ||
    /\b(dolor\s+(de|en\s+(la|el))\s+(tripa|ovarios?|barriga|vientre|útero))\b/i.test(lower) ||
    /\b(me\s+duele(n)?\s+(\w+\s+)?(la|el|los|las)?\s*(tripa|barriga|vientre|ovarios?|útero))\b/i.test(lower)
  ) {
    const sev = extractSeverity(lower);
    physicalSymptoms.push({
      id: 'cramps',
      name: 'Cólicos / dolor de vientre',
      category: 'pain',
      severity: sev,
      rawSnippet: 'dolor de tripa/vientre',
      emoji: '🩹'
    });
    summary.push(`🩹 Cólicos (${sev === 'intense' ? 'fuertes' : sev === 'mild' ? 'suaves' : 'medios'})`);
  }

  // Headache
  if (
    /\b(jaqueca[s]?|migra[ñn]a[s]?|cefalea[s]?)\b/i.test(lower) ||
    /\b(dolor\s+de\s+cabeza)\b/i.test(lower) ||
    /\b(me\s+duele\s+(\w+\s+)?(la\s+)?cabeza)\b/i.test(lower)
  ) {
    const sev = extractSeverity(lower);
    physicalSymptoms.push({
      id: 'headache',
      name: 'Dolor de cabeza',
      category: 'pain',
      severity: sev,
      rawSnippet: 'dolor de cabeza',
      emoji: '🤕'
    });
    summary.push('🤕 Dolor de cabeza');
  }

  // Back pain
  if (
    /\b(lumbago|dolor\s+(de\s+espalda|lumbar|de\s+ri[ñn]ones?))\b/i.test(lower) ||
    /\b(me\s+duele\s+(\w+\s+)?(la\s+)?espalda)\b/i.test(lower)
  ) {
    const sev = extractSeverity(lower);
    physicalSymptoms.push({
      id: 'back_pain',
      name: 'Dolor lumbar / espalda',
      category: 'pain',
      severity: sev,
      rawSnippet: 'dolor lumbar',
      emoji: '🦴'
    });
    summary.push('🦴 Dolor lumbar');
  }

  // Breast tenderness
  if (
    /\b(pechos?\s+(sensibles?|hinchados?|doloridos?)|senos?|mamas?)\b/i.test(lower) ||
    /\b(dolor\s+de\s+pecho[s]?)\b/i.test(lower) ||
    /\b(me\s+duelen\s+(\w+\s+)?(los\s+)?pechos?)\b/i.test(lower)
  ) {
    physicalSymptoms.push({
      id: 'tender_breasts',
      name: 'Pechos sensibles',
      category: 'pain',
      severity: extractSeverity(lower),
      rawSnippet: 'pechos sensibles',
      emoji: '🍈'
    });
    summary.push('🍈 Pechos sensibles');
  }

  // Bloating
  if (/\b(hinchada[s]?|inflamada[s]?|retenci[oó]n|gases|pesadez|tripa\s+hinchada|barriga\s+hinchada)\b/i.test(lower)) {
    physicalSymptoms.push({
      id: 'bloating',
      name: 'Hinchazón',
      category: 'digestion',
      severity: extractSeverity(lower),
      rawSnippet: 'hinchazón',
      emoji: '🎈'
    });
    summary.push('🎈 Hinchazón');
  }

  // Nausea / stomach
  if (/\b(n[aá]useas?|mal\s+cuerpo|asco|mareos?|acidez|pesadez\s+estomacal)\b/i.test(lower)) {
    physicalSymptoms.push({
      id: 'nausea',
      name: 'Náuseas / malestar digestivo',
      category: 'digestion',
      severity: extractSeverity(lower),
      rawSnippet: 'náuseas',
      emoji: '🍵'
    });
    summary.push('🍵 Náuseas');
  }

  // Cravings
  if (/\b(antojo[s]?|ganas\s+de\s+(dulce|chocolate|salado)|mucha\s+hambre|ansiedad\s+por\s+comer)\b/i.test(lower)) {
    physicalSymptoms.push({
      id: 'cravings',
      name: 'Antojos',
      category: 'cravings',
      severity: 'moderate',
      rawSnippet: 'antojos',
      emoji: '🍫'
    });
    summary.push('🍫 Antojos');
  }

  // Insomnia
  if (/\b(insomnio|no\s+puedo\s+dormir|desvelo|mal\s+sue[ñn]o|pesadillas?|dorm[ií]\s+fatal)\b/i.test(lower)) {
    physicalSymptoms.push({
      id: 'insomnia',
      name: 'Insomnio / sueño inquieto',
      category: 'sleep',
      severity: 'moderate',
      rawSnippet: 'insomnio',
      emoji: '🌙'
    });
    summary.push('🌙 Insomnio');
  }

  // Skin changes
  if (/\b(granos?|acn[eé]|espinillas?|piel\s+grasa|brote\s+en\s+la\s+piel)\b/i.test(lower)) {
    physicalSymptoms.push({
      id: 'acne',
      name: 'Cambios en la piel / acné',
      category: 'skin',
      severity: 'moderate',
      rawSnippet: 'piel / acné',
      emoji: '✨'
    });
    summary.push('✨ Cambios en la piel');
  }

  // 4. Extract Mood
  const moods: MoodEntry[] = [];

  if (/\b(feliz|contenta|motivada|buen\s+humor|radiante|tranquila|serena|alegre|positiva)\b/i.test(lower)) {
    moods.push({
      id: 'happy',
      name: 'Ánimo positivo',
      polarity: 'positive',
      rawSnippet: 'buen humor / contenta',
      emoji: '✨'
    });
    summary.push('✨ Buen ánimo');
  }

  if (/\b(sensible|llorona|melanc[oó]lica|triste|baj[oó]n|ganas\s+de\s+llorar|nost[aá]lgica|emocional)\b/i.test(lower)) {
    moods.push({
      id: 'sensitive_mood',
      name: 'Sensible / Melancólica',
      polarity: 'sensitive',
      rawSnippet: 'sensible / tristeza',
      emoji: '🥺'
    });
    summary.push('🥺 Sensibilidad');
  }

  if (/\b(irritable|mal\s+humor|estresa(da|do)|ansiosa|nerviosa|agobiada|irascible|poca\s+paciencia|crispada)\b/i.test(lower)) {
    moods.push({
      id: 'irritable',
      name: 'Irritable / Agobiada',
      polarity: 'irritable',
      rawSnippet: 'irritable / estresada',
      emoji: '⚡'
    });
    summary.push('⚡ Tensión / Irritabilidad');
  }

  // 5. Extract Energy
  let energy: EnergyEntry | null = null;

  if (/\b(cansa(da|do|ncio)|agota(da|do|miento)|fatiga|sin\s+energ[ií]a|mucho\s+sue[ñn]o|reventada|fundida|sin\s+fuerzas?|poca\s+energ[ií]a)\b/i.test(lower)) {
    const sev = extractSeverity(lower);
    energy = {
      level: sev === 'intense' ? 'very_low' : 'low',
      label: sev === 'intense' ? 'Agotamiento intenso' : 'Cansancio / Poca energía',
      rawSnippet: 'cansada',
      emoji: '😴'
    };
    summary.push('😴 Cansancio');
  } else if (
    /\b((mucha|much[ií]sima|tanta|gran)\s+energ[ií]a|en[eé]rgica|a\s+tope|vitalidad|activa|con\s+fuerza|imparable)\b/i.test(lower)
  ) {
    energy = {
      level: 'high',
      label: 'Alta energía y vitalidad',
      rawSnippet: 'mucha energía',
      emoji: '⚡'
    };
    summary.push('⚡ Gran energía');
  }

  // 6. Cervical Mucus
  let cervicalMucus: CervicalMucusEntry | undefined = undefined;
  if (/\b(flujo\s+(el[aá]stico|transparente|abundante)|clara\s+de\s+huevo|moco\s+f[eé]rtil)\b/i.test(lower)) {
    cervicalMucus = {
      type: 'egg_white',
      label: 'Flujo fértil (clara de huevo)',
      rawSnippet: 'flujo elástico/transparente'
    };
    summary.push('💧 Flujo fértil');
  }

  // If no specific entities were matched but text was entered, treat as a general note
  if (physicalSymptoms.length === 0 && moods.length === 0 && !energy && !periodEntry.detected) {
    physicalSymptoms.push({
      id: `note_${Date.now()}`,
      name: text.length > 32 ? text.substring(0, 29) + '...' : text,
      category: 'general',
      severity: 'moderate',
      rawSnippet: text,
      emoji: '💭'
    });
    summary.push('💭 Nota registrada');
    confidenceScore = 0.6;
  }

  // 7. Generate empathetic, human response (1-2 sentences maximum)
  const empathyMessage = buildEmpatheticResponse({
    period: periodEntry,
    physicalSymptoms,
    moods,
    energy,
    cycleDayExplicit
  });

  const structuredData: ChroniclerStructuredData = {
    targetDate,
    cycleDayExplicit,
    period: periodEntry,
    physicalSymptoms,
    moods,
    energy,
    cervicalMucus,
    notes: text,
    confidence: confidenceScore,
    extractedSummary: summary
  };

  return {
    success: true,
    data: structuredData,
    empathyMessage
  };
}

/**
 * Builds a warm, ultra-short, empathetic message validating the user's experience
 */
function buildEmpatheticResponse(params: {
  period: PeriodEntry;
  physicalSymptoms: PhysicalSymptomEntry[];
  moods: MoodEntry[];
  energy: EnergyEntry | null;
  cycleDayExplicit?: number;
}): string {
  const { period, physicalSymptoms, moods, energy, cycleDayExplicit } = params;

  const hasCramps = physicalSymptoms.some((s) => s.id === 'cramps');
  const hasHeadache = physicalSymptoms.some((s) => s.id === 'headache');
  const hasFatigue = energy && (energy.level === 'low' || energy.level === 'very_low');
  const isHighEnergy = energy && (energy.level === 'high' || energy.level === 'peak');
  const isSensitive = moods.some((m) => m.polarity === 'sensitive');
  const isIrritable = moods.some((m) => m.polarity === 'irritable');
  const isHappy = moods.some((m) => m.polarity === 'positive');

  // Case 1: Period cramps + fatigue (The classic menstrual combo)
  if (hasCramps && hasFatigue) {
    return 'Te he anotado el dolor de tripa y el cansancio. Mímate mucho hoy y ponte calorcito en el vientre si te alivia 🤍';
  }

  // Case 2: Just cramps or belly ache
  if (hasCramps) {
    if (cycleDayExplicit) {
      return `Anotado para tu día ${cycleDayExplicit}. Es normal que la tripa moleste; regálate momentos de pausa y calor 🤍`;
    }
    return 'Queda registrado el dolor de vientre. Respira profundo, mantente cómoda y date el descanso que tu cuerpo te pide 🌿';
  }

  // Case 3: Headache
  if (hasHeadache) {
    return 'Anotado el dolor de cabeza. Bebe suficiente agua y baja las luces un rato si puedes 🍵';
  }

  // Case 4: Fatigue / Low energy alone
  if (hasFatigue) {
    return 'Anotado ese cansancio. No te exijas más de la cuenta hoy; tu cuerpo está pidiendo recargar pilas 🌙';
  }

  // Case 5: High energy & good mood
  if (isHighEnergy || isHappy) {
    return '¡Qué alegría leerte con tanta vitalidad! Aprovecha este impulso y disfruta de tu día a tope ✨';
  }

  // Case 6: Sensitive or emotional
  if (isSensitive) {
    return 'Te he guardado cómo te sientes. Tus emociones son completamente válidas; busca un ratito para ti y cuídate 🤍';
  }

  // Case 7: Irritable or stressed
  if (isIrritable) {
    return 'Anotada esa tensión. Es totalmente comprensible; pon límites con amabilidad y protege tu espacio hoy 🌿';
  }

  // Case 8: Period start
  if (period.isCycleStart) {
    return 'Registrado el inicio de tu regla. Comienza un nuevo ciclo: recuerda ir más despacio y cuidar de ti 🩸';
  }

  // Case 9: Default warm confirmation
  return 'Anotado con cariño en tu día. Gracias por escuchar y registrar lo que siente tu cuerpo 🌸';
}
