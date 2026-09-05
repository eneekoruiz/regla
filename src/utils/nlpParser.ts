import type { FlowIntensity, SymptomCategory, SymptomItem } from '../types/cycle';

export interface ParseResult {
  symptoms: SymptomItem[];
  periodAction?: 'start' | 'stop' | 'spotting';
  flow?: FlowIntensity;
  cleanedText: string;
  matchedKeywords: string[];
}

interface SymptomRule {
  id: string;
  name: string;
  category: SymptomCategory;
  emoji: string;
  patterns: RegExp[];
}

export const KNOWN_SYMPTOMS: SymptomRule[] = [
  {
    id: 'cramps',
    name: 'Cólicos',
    category: 'pain',
    emoji: '🩹',
    patterns: [/\b(c[oó]lico[s]?|dolor\s+de\s+(ovarios?|tripa|vientre|útero)|espasmos?|retortij[oó]n(es)?)\b/i]
  },
  {
    id: 'headache',
    name: 'Dolor de cabeza',
    category: 'pain',
    emoji: '🤕',
    patterns: [/\b(dolor\s+de\s+cabeza|jaqueca[s]?|migra[ñn]a[s]?|cefalea[s]?)\b/i]
  },
  {
    id: 'back_pain',
    name: 'Dolor lumbar',
    category: 'pain',
    emoji: '🦴',
    patterns: [/\b(dolor\s+(de\s+espalda|lumbar|de\s+ri[ñn]ones?)|lumbago)\b/i]
  },
  {
    id: 'tender_breasts',
    name: 'Pechos sensibles',
    category: 'pain',
    emoji: '🍈',
    patterns: [/\b(pechos?\s+(sensibles?|hinchados?|doloridos?)|dolor\s+de\s+pecho[s]?|mamas?\s+tensas?|senos?)\b/i]
  },
  {
    id: 'bloating',
    name: 'Hinchazón',
    category: 'digestion',
    emoji: '🎈',
    patterns: [/\b(hinchada[s]?|inflamada[s]?|retenci[oó]n|gases|pesadez|tripa\s+hinchada)\b/i]
  },
  {
    id: 'fatigue',
    name: 'Fatiga / Cansancio',
    category: 'energy',
    emoji: '😴',
    patterns: [/\b(cansa(da|do|ncio)|agota(da|do|miento)|fatiga|sin\s+energ[ií]a|mucho\s+sue[ñn]o|reventada)\b/i]
  },
  {
    id: 'high_energy',
    name: 'Alta energía',
    category: 'energy',
    emoji: '⚡',
    patterns: [/\b(mucha\s+energ[ií]a|en[eé]rgica|a\s+tope|vitalidad|activa|con\s+fuerza)\b/i]
  },
  {
    id: 'happy',
    name: 'Ánimo positivo',
    category: 'mood',
    emoji: '✨',
    patterns: [/\b(feliz|contenta|motivada|buen\s+humor|radiante|tranquila|serena|alegre)\b/i]
  },
  {
    id: 'sensitive_mood',
    name: 'Sensible / Melancólica',
    category: 'mood',
    emoji: '🥺',
    patterns: [/\b(sensible|llorona|melanc[oó]lica|triste|baj[oó]n|nost[aá]lgica|ganas\s+de\s+llorar)\b/i]
  },
  {
    id: 'irritable',
    name: 'Irritable / Estresada',
    category: 'mood',
    emoji: '⚡',
    patterns: [/\b(irritable|mal\s+humor|estresa(da|do)|ansiosa|nerviosa|agobiada|irascible)\b/i]
  },
  {
    id: 'cravings',
    name: 'Antojos',
    category: 'cravings',
    emoji: '🍫',
    patterns: [/\b(antojo[s]?|ganas\s+de\s+(dulce|chocolate|salado)|mucha\s+hambre|hambre\s+voraz)\b/i]
  },
  {
    id: 'acne',
    name: 'Acné / Cambios de piel',
    category: 'skin',
    emoji: '✨',
    patterns: [/\b(grano[s]?|acn[eé]|espinilla[s]?|piel\s+grasa|piel\s+seca)\b/i]
  },
  {
    id: 'insomnia',
    name: 'Insomnio',
    category: 'sleep',
    emoji: '🌙',
    patterns: [/\b(insomnio|no\s+puedo\s+dormir|desvelo|sue[ñn]o\s+inquieto|pesadillas?)\b/i]
  },
  {
    id: 'nausea',
    name: 'Náuseas',
    category: 'digestion',
    emoji: '🍵',
    patterns: [/\b(n[aá]useas?|mal\s+cuerpo|asco|mareo[s]?|acidez)\b/i]
  },
  {
    id: 'fertile_mucus',
    name: 'Flujo fértil (clara de huevo)',
    category: 'mucus',
    emoji: '💧',
    patterns: [/\b(flujo\s+(el[aá]stico|transparente|acuoso|abundante)|moco\s+cervical\s+f[eé]rtil|clara\s+de\s+huevo)\b/i]
  },
  {
    id: 'libido_high',
    name: 'Libido alta',
    category: 'libido',
    emoji: '🔥',
    patterns: [/\b(libido\s+alta|mucho\s+deseo|ganas\s+sexuales?|sensual|activada)\b/i]
  },
  {
    id: 'sex_protected',
    name: 'Relaciones con protección',
    category: 'intimacy',
    emoji: '🛡️',
    patterns: [/\b(relacion(es)?\s+con\s+(protecci[oó]n|preservativo|cond[oó]n)|sexo\s+con\s+cond[oó]n|coito\s+protegido)\b/i]
  },
  {
    id: 'sex_unprotected',
    name: 'Relaciones sin protección',
    category: 'intimacy',
    emoji: '💖',
    patterns: [/\b(relacion(es)?\s+sin\s+(protecci[oó]n|preservativo|cond[oó]n)|sexo\s+sin\s+protecci[oó]n|coito\s+sin\s+protecci[oó]n|sin\s+cond[oó]n)\b/i]
  },
  {
    id: 'lh_test_positive',
    name: 'Test Ovulación Positivo (LH+)',
    category: 'ovulation_test',
    emoji: '🧪',
    patterns: [/\b(test\s+de\s+ovulaci[oó]n\s+positivo|lh\s+positivo|pico\s+de\s+lh|test\s+positivo)\b/i]
  },
  {
    id: 'lh_test_negative',
    name: 'Test Ovulación Negativo',
    category: 'ovulation_test',
    emoji: '⚪',
    patterns: [/\b(test\s+de\s+ovulaci[oó]n\s+negativo|lh\s+negativo)\b/i]
  },
  {
    id: 'pill_taken',
    name: 'Píldora / Anticonceptivo',
    category: 'contraception',
    emoji: '💊',
    patterns: [/\b(p[ií]ldora|pastilla|anticonceptivo|tom[eé]\s+la\s+p[ií]ldora)\b/i]
  }
];

export function parseNaturalLanguageInput(rawInput: string): ParseResult {
  const text = rawInput.trim();
  const lower = text.toLowerCase();
  const matchedSymptoms: SymptomItem[] = [];
  const matchedKeywords: string[] = [];

  let defaultSeverity: 'mild' | 'moderate' | 'intense' = 'moderate';
  if (/\b(un\s+poco|leve|suave|ligero|poquito|apenas)\b/i.test(lower)) {
    defaultSeverity = 'mild';
  } else if (/\b(mucho|bastante|muy|fuerte|intenso|horrible|fatal|insoportable|a\s+morir)\b/i.test(lower)) {
    defaultSeverity = 'intense';
  }

  let periodAction: 'start' | 'stop' | 'spotting' | undefined = undefined;
  let flow: FlowIntensity | undefined = undefined;

  // Specific flow volume detection
  if (/\b(muy\s+abundante|sangro\s+(much[ií]simo|demasiado)|sangrado\s+(excesivo|muy\s+fuerte|intenso)|cambio\s+(constante|frecuente)\s+de\s+(compresa|tamp[oó]n))\b/i.test(lower)) {
    flow = 'very_heavy';
    matchedKeywords.push('⚠️ Flujo Muy Abundante');
  } else if (/\b(abundante|bastante\s+sangre|mucho\s+sangrado)\b/i.test(lower)) {
    flow = 'heavy';
    matchedKeywords.push('🩸 Flujo Abundante');
  } else if (/\b(flujo\s+ligero|poco\s+sangrado|escasa|suave)\b/i.test(lower)) {
    flow = 'light';
    matchedKeywords.push('🩸 Flujo Ligero');
  }

  if (/\b(me\s+ha\s+bajado\s+(la\s+regla|el\s+periodo)|empez[oó]\s+(la\s+regla|mi\s+periodo|el\s+sangrado)|primer\s+d[ií]a\s+de\s+regla)\b/i.test(lower)) {
    periodAction = 'start';
    if (!flow) {
      flow = defaultSeverity === 'mild' ? 'light' : defaultSeverity === 'intense' ? 'heavy' : 'medium';
    }
    matchedKeywords.push('🩸 Inicio de regla');
  } else if (/\b(manchado|manchando|gotitas|manchitas|spotting)\b/i.test(lower)) {
    periodAction = 'spotting';
    flow = 'spotting';
    matchedKeywords.push('💧 Manchado leve');
  } else if (/\b(se\s+(me\s+)?acab[oó]\s+(la\s+regla|el\s+periodo)|ya\s+no\s+sangro|fin\s+de\s+(la\s+regla|periodo))\b/i.test(lower)) {
    periodAction = 'stop';
    matchedKeywords.push('✨ Fin de regla');
  }

  for (const symptomRule of KNOWN_SYMPTOMS) {
    const isMatched = symptomRule.patterns.some((pattern) => pattern.test(lower));
    if (isMatched) {
      matchedSymptoms.push({
        id: symptomRule.id,
        name: symptomRule.name,
        category: symptomRule.category,
        emoji: symptomRule.emoji,
        severity: defaultSeverity
      });
      matchedKeywords.push(symptomRule.name);
    }
  }

  if (matchedSymptoms.length === 0 && !periodAction && text.length > 2) {
    matchedSymptoms.push({
      id: `custom_${Date.now()}`,
      name: text.length > 30 ? text.substring(0, 27) + '...' : text,
      category: 'general',
      emoji: '💭',
      severity: defaultSeverity
    });
  }

  return {
    symptoms: matchedSymptoms,
    periodAction,
    flow,
    cleanedText: text,
    matchedKeywords
  };
}
