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
    patterns: [/\b(c[oó]lico[s]?|dolor\s+de\s+(ovarios?|vientre|útero)|espasmos?|retortij[oó]n(es)?)\b/i]
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
    patterns: [/\b(n[aá]useas?|asco|mareo[s]?|acidez|ganas\s+de\s+vomitar|v[oó]mito[s]?)\b/i]
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

export interface DisambiguationOption {
  id: string;
  label: string;
  symptomId: string;
  symptomName: string;
  category: SymptomCategory;
  emoji: string;
  confirmPrompt: string;
}

export interface AmbiguousSymptomRule {
  id: string;
  pattern: RegExp;
  clarificationText: string;
  options: DisambiguationOption[];
}

export const AMBIGUOUS_SYMPTOM_RULES: AmbiguousSymptomRule[] = [
  {
    id: 'belly_pain',
    pattern: /\b(me\s+duele\s+(la\s+)?(tripa|barriga|panza|estomago)|dolor\s+de\s+(tripa|barriga|panza|estomago)|molestia[s]?\s+en\s+la\s+(tripa|barriga)|retortijon(es)?)\b/i,
    clarificationText: 'Uy, con lo de *"me duele la tripa"* no termino de tenerlo del todo claro y prefiero no apuntarlo mal en tu registro de salud. ¿A qué molestia te refieres exactamente?',
    options: [
      {
        id: 'opt_cramps',
        label: 'Cólicos en bajo vientre',
        symptomId: 'cramps',
        symptomName: 'Cólicos',
        category: 'pain',
        emoji: '🩹',
        confirmPrompt: 'Tengo cólicos menstruales en el bajo vientre'
      },
      {
        id: 'opt_bloating',
        label: 'Hinchazón o gases',
        symptomId: 'bloating',
        symptomName: 'Hinchazón',
        category: 'digestion',
        emoji: '🎈',
        confirmPrompt: 'Tengo hinchazón y gases en la tripa'
      },
      {
        id: 'opt_nausea',
        label: 'Malestar de estómago / náuseas',
        symptomId: 'nausea',
        symptomName: 'Náuseas',
        category: 'digestion',
        emoji: '🍵',
        confirmPrompt: 'Tengo náuseas y malestar de estómago'
      }
    ]
  },
  {
    id: 'bad_body',
    pattern: /\b(tengo\s+mal\s+cuerpo|mal\s+cuerpo|cuerpo\s+cortado|destemplada|estoy\s+destemplada|malestar\s+general)\b/i,
    clarificationText: 'Uy, la expresión *"tener mal cuerpo"* puede abarcar varias sensaciones y no quiero registrar un dato incorrecto en tu diario. ¿Qué estás notando con mayor claridad?',
    options: [
      {
        id: 'opt_fatigue',
        label: 'Cansancio y fatiga',
        symptomId: 'fatigue',
        symptomName: 'Fatiga / Cansancio',
        category: 'energy',
        emoji: '😴',
        confirmPrompt: 'Tengo cansancio y fatiga general'
      },
      {
        id: 'opt_nausea',
        label: 'Náuseas o mareo',
        symptomId: 'nausea',
        symptomName: 'Náuseas',
        category: 'digestion',
        emoji: '🍵',
        confirmPrompt: 'Tengo mareo y náuseas'
      },
      {
        id: 'opt_headache',
        label: 'Pesadez o dolor de cabeza',
        symptomId: 'headache',
        symptomName: 'Dolor de cabeza',
        category: 'pain',
        emoji: '🤕',
        confirmPrompt: 'Tengo pesadez y dolor de cabeza'
      }
    ]
  },
  {
    id: 'pain_down',
    pattern: /\b(me\s+duele\s+abajo|dolor\s+abajo|molestia\s+abajo|pinchazos?\s+abajo|siento\s+pinchazos)\b/i,
    clarificationText: 'Cuando dices que *"te duele abajo"* o que sientes pinchazos, ¿en qué zona los notas principalmente para apuntarlo con precisión?',
    options: [
      {
        id: 'opt_cramps',
        label: 'Bajo vientre u ovarios',
        symptomId: 'cramps',
        symptomName: 'Cólicos',
        category: 'pain',
        emoji: '🩹',
        confirmPrompt: 'Tengo cólicos en el bajo vientre'
      },
      {
        id: 'opt_back_pain',
        label: 'Espalda baja o lumbar',
        symptomId: 'back_pain',
        symptomName: 'Dolor lumbar',
        category: 'pain',
        emoji: '🦴',
        confirmPrompt: 'Tengo dolor lumbar en la espalda baja'
      },
      {
        id: 'opt_breasts',
        label: 'Pechos sensibles',
        symptomId: 'tender_breasts',
        symptomName: 'Pechos sensibles',
        category: 'pain',
        emoji: '🍈',
        confirmPrompt: 'Tengo pinchazos y pechos sensibles'
      }
    ]
  },
  {
    id: 'feeling_weird',
    pattern: /\b(estoy\s+rara|tengo\s+un\s+d[ií]a\s+raro|me\s+siento\s+rara|no\s+s[eé]\s+qu[eé]\s+me\s+pasa|estoy\s+choff)\b/i,
    clarificationText: 'Te comprendo mucho, a veces el vaivén de las hormonas nos deja con esa sensación "rara" indefinida. Para ayudarte y registrarlo de forma útil, ¿lo notas más físico o emocional?',
    options: [
      {
        id: 'opt_sensitive',
        label: 'Ánimo sensible o bajón',
        symptomId: 'sensitive_mood',
        symptomName: 'Sensible / Melancólica',
        category: 'mood',
        emoji: '🥺',
        confirmPrompt: 'Tengo bajón de ánimo y estoy sensible'
      },
      {
        id: 'opt_irritable',
        label: 'Irritabilidad o agobio',
        symptomId: 'irritable',
        symptomName: 'Irritable / Estresada',
        category: 'mood',
        emoji: '⚡',
        confirmPrompt: 'Estoy irritable y nerviosa'
      },
      {
        id: 'opt_fatigue',
        label: 'Agotamiento físico',
        symptomId: 'fatigue',
        symptomName: 'Fatiga / Cansancio',
        category: 'energy',
        emoji: '😴',
        confirmPrompt: 'Tengo agotamiento físico y cansancio'
      }
    ]
  },
  {
    id: 'bloated_general',
    pattern: /\b(estoy\s+hinchada|me\s+noto\s+hinchada|mucha\s+hinchaz[oó]n|siento\s+inflamaci[oó]n)\b/i,
    clarificationText: 'La sensación de hinchazón es súper habitual por retención de líquidos o cambios de estrógenos. ¿Dónde la estás percibiendo con más peso?',
    options: [
      {
        id: 'opt_bloating',
        label: 'Abdomen y retención',
        symptomId: 'bloating',
        symptomName: 'Hinchazón',
        category: 'digestion',
        emoji: '🎈',
        confirmPrompt: 'Tengo hinchazón y retención abdominal'
      },
      {
        id: 'opt_breasts',
        label: 'Pechos tirantes o sensibles',
        symptomId: 'tender_breasts',
        symptomName: 'Pechos sensibles',
        category: 'pain',
        emoji: '🍈',
        confirmPrompt: 'Tengo los pechos hinchados y sensibles'
      }
    ]
  },
  {
    id: 'exhausted_body',
    pattern: /\b(estoy\s+hecha\s+polvo|estoy\s+molida|me\s+duele\s+todo|no\s+puedo\s+con\s+mi\s+alma)\b/i,
    clarificationText: '¡Vaya! Siento que te encuentres tan molida hoy. Para dejarlo bien reflejado en tu diario de hoy, ¿a qué molestia le darías más peso?',
    options: [
      {
        id: 'opt_fatigue',
        label: 'Cansancio y fatiga general',
        symptomId: 'fatigue',
        symptomName: 'Fatiga / Cansancio',
        category: 'energy',
        emoji: '😴',
        confirmPrompt: 'Tengo fatiga y cansancio general'
      },
      {
        id: 'opt_back_pain',
        label: 'Dolor lumbar y muscular',
        symptomId: 'back_pain',
        symptomName: 'Dolor lumbar',
        category: 'pain',
        emoji: '🦴',
        confirmPrompt: 'Tengo dolor lumbar y de espalda'
      },
      {
        id: 'opt_cramps',
        label: 'Cólicos menstruales',
        symptomId: 'cramps',
        symptomName: 'Cólicos',
        category: 'pain',
        emoji: '🩹',
        confirmPrompt: 'Tengo cólicos menstruales'
      }
    ]
  }
];

export function findAmbiguousSymptomRule(text: string): AmbiguousSymptomRule | undefined {
  return AMBIGUOUS_SYMPTOM_RULES.find(rule => rule.pattern.test(text));
}
