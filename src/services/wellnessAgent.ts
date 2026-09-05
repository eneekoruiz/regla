import type { DailyWellnessAdvice, WellnessContext } from '../types/wellness';

/**
 * Agente de Bienestar (Wellness Agent)
 * Generates an ultra-short, human, empathetic daily advice tailored to the user's cycle phase and active symptoms.
 */
export function generateDailyWellnessAdvice(context: WellnessContext): DailyWellnessAdvice {
  const { dayOfCycle, phase, isPeriod, isOvulationDay, symptoms, hasEnoughData, flow } = context;

  // Health alerts must not be hidden by onboarding or personalized low-risk prompts.
  if (flow === 'very_heavy') {
    return {
      id: 'very_heavy_flow_care',
      headline: 'Sangrado muy abundante: consulta',
      advice: 'Has registrado sangrado muy abundante. Contacta con un profesional sanitario hoy. Si tienes mareo intenso, desmayo o falta de aire, busca atención urgente.',
      category: 'relief',
      iconEmoji: '⚠️',
      energyLevel: 'Prioriza tu atención',
      focusTip: 'Anota cuánto sangras y desde cuándo, sin retrasar la consulta'
    };
  }

  // Onboarding / Empty State when no historical data exists
  if (hasEnoughData === false && symptoms.length === 0) {
    return {
      id: 'welcome_onboarding',
      headline: 'Tu registro empieza aquí',
      advice: 'Anota cuándo empezó tu última regla o cómo te encuentras hoy. Tus registros pueden ayudarte a observar cambios con el tiempo.',
      category: 'mindset',
      iconEmoji: '✨',
      energyLevel: 'A tu ritmo',
      focusTip: 'Puedes empezar con una fecha o una nota breve'
    };
  }

  // Personalized profile override: User's worst day of discomfort
  const worstDay = context.worstDayOfPeriod || 1;
  if (isPeriod && dayOfCycle === worstDay && symptoms.length === 0) {
    return {
      id: 'personalized_worst_day',
      headline: 'Comprueba cómo te encuentras',
      advice: 'Si hoy tienes más molestias, puedes hacer una pausa o ajustar tus planes. No tienes por qué sentirte igual que en ciclos anteriores.',
      category: 'relief',
      iconEmoji: '🤍',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Si el dolor limita tu día, consulta con un profesional'
    };
  }


  // Menstrual phase tailored day-by-day guidance
  if (isPeriod) {
    if (dayOfCycle <= 2 && symptoms.length === 0) {
      return {
        id: 'period_early_days',
        headline: 'Los primeros días de la regla',
        advice: 'Puedes seguir con tu rutina si te encuentras bien o bajar el ritmo si lo necesitas. La regla no implica tener poca energía.',
        category: 'rest',
        iconEmoji: '🩸',
        energyLevel: 'Según cómo te encuentres',
        focusTip: 'Elige ropa cómoda y haz una pausa si te ayuda'
      };
    } else if (dayOfCycle >= 3 && dayOfCycle <= 4 && symptoms.length === 0) {
      return {
        id: 'period_mid_days',
        headline: 'Observa cómo cambia el sangrado',
        advice: 'La cantidad de sangrado puede cambiar a lo largo de la regla. Anota lo que observes, sin dar por hecho que hoy habrá menos flujo o molestias.',
        category: 'relief',
        iconEmoji: '🌸',
        energyLevel: 'Según cómo te encuentres',
        focusTip: 'Consulta si el sangrado cambia mucho o afecta a tu día'
      };
    } else if (dayOfCycle >= 5 && symptoms.length === 0) {
      return {
        id: 'period_late_days',
        headline: 'Cada regla tiene su ritmo',
        advice: 'No todas las reglas terminan el mismo día. Registra si continúa el sangrado y cómo te encuentras, sin esperar un cambio concreto de energía.',
        category: 'movement',
        iconEmoji: '🌱',
        energyLevel: 'Según cómo te encuentres',
        focusTip: 'Consulta si el sangrado dura más de siete días'
      };
    }
  }

  // PCOS Profile Special Care
  if (context.hasPCOS && symptoms.length === 0 && (phase === 'follicular' || phase === 'ovulation')) {
    return {
      id: 'pcos_metabolic_balance',
      headline: 'Cuidados adaptados a ti',
      advice: 'Si tienes un diagnóstico de SOP, acuerda los cuidados con tu equipo sanitario. Puedes elegir actividades que disfrutes y se ajusten a tu situación.',
      category: 'movement',
      iconEmoji: '🥑',
      energyLevel: 'A tu ritmo',
      focusTip: 'Consulta antes de iniciar suplementos o cambiar tu tratamiento'
    };
  }

  // High Stress Profile Special Care
  if (context.stressLevel === 'high' && symptoms.length === 0 && phase === 'luteal') {
    return {
      id: 'high_stress_care',
      headline: 'Una pausa entre tareas',
      advice: 'Si hoy notas estrés, prueba a sentarte con comodidad y respirar suavemente, sin forzar ni retener el aire. Deja la práctica si te resulta incómoda.',
      category: 'mindset',
      iconEmoji: '🌿',
      energyLevel: 'A tu ritmo',
      focusTip: 'Puedes apartarte un momento de las pantallas'
    };
  }

  // 1. Analyze prominent symptoms logged by the Agente Cronista
  const hasCramps = symptoms.some(
    (s) => s.id === 'cramps' || s.name.toLowerCase().includes('cólico') || s.name.toLowerCase().includes('tripa') || s.name.toLowerCase().includes('vientre')
  );
  const hasHeadache = symptoms.some(
    (s) => s.id === 'headache' || s.name.toLowerCase().includes('cabeza') || s.name.toLowerCase().includes('migraña')
  );
  const hasFatigue = symptoms.some(
    (s) => s.id === 'fatigue' || s.id === 'energy_low' || s.id === 'energy_very_low' || s.name.toLowerCase().includes('cansan')
  );
  const hasHighEnergy = symptoms.some(
    (s) => s.id === 'high_energy' || s.id === 'energy_high' || s.id === 'energy_peak' || s.name.toLowerCase().includes('energía')
  );
  const hasCravings = symptoms.some(
    (s) => s.id === 'cravings' || s.name.toLowerCase().includes('antojo')
  );
  const hasSensitiveMood = symptoms.some(
    (s) => s.id === 'sensitive_mood' || s.name.toLowerCase().includes('sensible') || s.name.toLowerCase().includes('triste')
  );
  const hasIrritable = symptoms.some(
    (s) => s.id === 'irritable' || s.name.toLowerCase().includes('irritab') || s.name.toLowerCase().includes('estrés')
  );
  const hasBloating = symptoms.some(
    (s) => s.id === 'bloating' || s.name.toLowerCase().includes('hincha')
  );

  // Priority 1: Direct Symptom Overrides
  if (hasCramps) {
    if (dayOfCycle === 1 || isPeriod) {
      return {
        id: 'cramps_period',
        headline: 'Calor suave para las molestias',
        advice: 'Si te alivia, prueba una bolsa de agua caliente envuelta en una toalla, sin quemar la piel. El dolor que te impide hacer tu vida merece una consulta.',
        category: 'relief',
        iconEmoji: '🍵',
        energyLevel: 'Según cómo te encuentres',
        focusTip: 'Si el dolor es intenso o empeora y no cede, busca atención médica'
      };
    }
    return {
      id: 'cramps_general',
      headline: 'Presta atención al dolor',
      advice: 'Busca una postura cómoda y evita lo que aumente el dolor. No todo dolor de vientre está relacionado con la regla; consulta si persiste o se repite.',
      category: 'relief',
      iconEmoji: '🩹',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Si el dolor aparece de golpe y es intenso, busca atención urgente'
    };
  }

  if (hasHeadache) {
    return {
      id: 'headache_care',
      headline: 'Una pausa para el dolor de cabeza',
      advice: 'Puedes beber agua y descansar un rato de las pantallas. Si los dolores se repiten o no mejoran, pide una valoración sanitaria.',
      category: 'relief',
      iconEmoji: '💧',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Si aparece de golpe y es muy intenso, busca atención urgente'
    };
  }

  if (hasSensitiveMood) {
    return {
      id: 'sensitive_care',
      headline: 'Tus emociones merecen espacio',
      advice: 'Si te sientes triste o sensible, puedes contárselo a alguien de confianza o buscar un rato de tranquilidad. No hace falta atribuirlo todo al ciclo.',
      category: 'mindset',
      iconEmoji: '🤍',
      energyLevel: 'A tu ritmo',
      focusTip: 'Busca apoyo profesional si el malestar persiste o limita tu día'
    };
  }

  if (hasIrritable) {
    return {
      headline: 'Un poco de espacio para ti',
      id: 'irritable_care',
      advice: 'Si hoy te irritas con facilidad, puede ayudarte hacer una pausa o pedir espacio. Elige qué compromisos puedes ajustar sin exigirte estar de buen humor.',
      category: 'mindset',
      iconEmoji: '🌿',
      energyLevel: 'A tu ritmo',
      focusTip: 'Busca un momento tranquilo si te apetece'
    };
  }

  if (hasBloating) {
    return {
      id: 'bloating_care',
      headline: 'Observa qué te sienta bien',
      advice: 'Si notas hinchazón, prueba a comer más despacio y reducir las bebidas con gas. Si se repite a menudo o no desaparece, consulta con un profesional.',
      category: 'nutrition',
      iconEmoji: '🎈',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Anota cuándo aparece, sin eliminar grupos de alimentos por tu cuenta'
    };
  }

  if (hasCravings) {
    return {
      id: 'cravings_care',
      headline: 'Antojos sin culpa',
      advice: 'Si te apetece algo concreto, puedes incluirlo en tu alimentación habitual. No es necesario interpretar un antojo como una carencia o un problema hormonal.',
      category: 'nutrition',
      iconEmoji: '🍫',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Elige algo que disfrutes y te siente bien'
    };
  }

  if (hasFatigue) {
    return {
      id: 'fatigue_care',
      headline: 'Una pausa si la necesitas',
      advice: 'Si notas cansancio, reduce las tareas que puedas y reserva tiempo para descansar. Si persiste o limita tu día, consulta; el ciclo no explica todo.',
      category: 'rest',
      iconEmoji: '🌙',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Intenta mantener una hora parecida para levantarte'
    };
  }

  // Priority 2: Exact Day / Key Cycle Transitions
  if (dayOfCycle === 1 && isPeriod) {
    return {
      id: 'day_1_period',
      headline: 'Empieza un nuevo registro',
      advice: 'Puedes anotar el inicio del sangrado y cómo te encuentras. No hay una forma obligatoria de vivir el primer día de la regla.',
      category: 'rest',
      iconEmoji: '☕',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Elige entre seguir tu rutina o hacer una pausa, según lo necesites'
    };
  }

  if (isOvulationDay || phase === 'ovulation') {
    return {
      id: 'phase_ovulation',
      headline: 'Muévete según cómo te encuentres',
      advice: 'La fecha estimada de ovulación no indica cuánta fuerza tienes hoy. Elige una actividad y una intensidad acordes con tu experiencia y tus sensaciones.',
      category: 'movement',
      iconEmoji: '⚡',
      energyLevel: 'A tu ritmo',
      focusTip: 'No necesitas entrenar más fuerte por estar en una fase concreta'
    };
  }

  // Priority 3: Phase-Based Guidance
  switch (phase) {
    case 'menstrual':
      return {
        id: 'phase_menstrual',
        headline: 'Cuida tu comodidad',
        advice: 'Si tienes molestias, puedes ajustar tus planes y buscar una postura cómoda. Si te encuentras bien, no necesitas descansar solo por la fase del ciclo.',
        category: 'rest',
        iconEmoji: '🩸',
        energyLevel: 'Según cómo te encuentres',
        focusTip: 'Consulta si el dolor interfiere con tus actividades'
      };

    case 'follicular':
      if (hasHighEnergy) {
        return {
          id: 'phase_follicular_high',
          headline: 'Elige dónde poner tu energía',
          advice: 'Si hoy te notas con ganas, elige una actividad que disfrutes o una tarea pendiente. La fase del ciclo no garantiza más fuerza ni concentración.',
          category: 'movement',
          iconEmoji: '✨',
          energyLevel: 'Según cómo te encuentres',
          focusTip: 'Haz pausas y ajusta el esfuerzo si lo necesitas'
        };
      }
      return {
        id: 'phase_follicular',
        headline: 'Retoma algo que te apetezca',
        advice: 'Puedes dedicar un rato a pasear, moverte o retomar una actividad. Decide según cómo te encuentres hoy, sin esperar un nivel concreto de energía.',
        category: 'movement',
        iconEmoji: '🌱',
        energyLevel: 'A tu ritmo',
        focusTip: 'Una actividad breve también puede encajar en tu día'
      };

    case 'luteal':
      if (dayOfCycle >= 23) {
        return {
          id: 'phase_premenstrual',
          headline: 'Observa qué ayuda a tu descanso',
          advice: 'Si te cuesta dormir, prueba a dejar el café y otras bebidas con cafeína para más temprano. Anota si notas cambios, sin esperar un resultado inmediato.',
          category: 'nutrition',
          iconEmoji: '🍂',
          energyLevel: 'Según cómo te encuentres',
          focusTip: 'Reserva un rato tranquilo antes de acostarte'
        };
      }
      return {
        id: 'phase_luteal_early',
        headline: 'Un plan que se adapte a tu día',
        advice: 'Elige una tarea manejable y deja espacio para pausas. Tu capacidad de concentrarte no se puede deducir solo de la fase del ciclo.',
        category: 'mindset',
        iconEmoji: '🍁',
        energyLevel: 'A tu ritmo',
        focusTip: 'Puedes ajustar tus planes si cambian tus necesidades'
      };

    default:
      return {
        id: 'wellness_default',
        headline: 'Un momento para ti',
        advice: 'Puedes hacer una pausa y observar cómo te encuentras. Una nota breve sobre el ánimo, el descanso o las molestias puede ayudarte a recordar este día.',
        category: 'mindset',
        iconEmoji: '🌸',
        energyLevel: 'A tu ritmo',
        focusTip: 'Registra lo que te resulte útil, sin exigirte completarlo todo'
      };
  }
}

/**
 * Agente de Bienestar Premium Multi-Categoría (Estilo Flo Pro Stories / Daily Insights)
 * Genera 4 tarjetas personalizadas en tiempo real:
 * 1. Fisiología & Hormonas
 * 2. Nutrición & Metabolismo
 * 3. Movimiento & Fuerza
 * 4. Mente, Sueño & Ritmo
 */
export function generateDailyWellnessCarousel(context: WellnessContext): DailyWellnessAdvice[] {
  const { dayOfCycle, phase, isPeriod, isOvulationDay, symptoms } = context;

  const hasCramps = symptoms.some(s => s.id === 'cramps' || s.name.toLowerCase().includes('cólico') || s.name.toLowerCase().includes('dolor'));
  const hasCravings = symptoms.some(s => s.id === 'cravings' || s.name.toLowerCase().includes('antojo'));

  // 1. HORMONAS Y FISIOLOGÍA
  let physiologyCard: DailyWellnessAdvice;
  if (isPeriod) {
    physiologyCard = {
      id: 'physio_period',
      category: 'physiology',
      categoryTitle: 'Tu cuerpo',
      headline: hasCramps ? 'Una pausa para las molestias' : (dayOfCycle <= 2 ? 'Los primeros días de la regla' : 'Cada regla puede ser distinta'),
      advice: hasCramps
        ? 'El calor suave puede aliviar las molestias. Si usas una bolsa de agua caliente, envuélvela en una toalla para proteger la piel.'
        : 'La cantidad de sangrado y cómo te encuentras pueden variar. Anota lo que observas hoy, sin esperar sentirte de una forma concreta.',
      iconEmoji: '🩸',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Consulta si el dolor o el sangrado dificultan tu vida diaria'
    };
  } else if (isOvulationDay) {
    physiologyCard = {
      id: 'physio_ovulation',
      category: 'physiology',
      categoryTitle: 'Tu cuerpo',
      headline: 'Ovulación estimada, no confirmada',
      advice: 'El calendario ofrece una estimación: no confirma que estés ovulando ni mide tus hormonas. La fecha puede variar entre ciclos.',
      iconEmoji: '✨',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'No uses esta estimación como método anticonceptivo'
    };
  } else if (phase === 'follicular') {
    physiologyCard = {
      id: 'physio_follicular',
      category: 'physiology',
      categoryTitle: 'Tu cuerpo',
      headline: 'Observa los cambios de estos días',
      advice: 'Después de la regla puedes notar cambios o encontrarte como siempre. Anotar tus sensaciones ayuda a comparar días sin asumir qué ocurre con tus hormonas.',
      iconEmoji: '🌱',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Puedes registrar tanto cambios como días sin molestias'
    };
  } else {
    // Luteal
    physiologyCard = {
      id: 'physio_luteal',
      category: 'physiology',
      categoryTitle: 'Tu cuerpo',
      headline: 'Cómo te encuentras antes de la regla',
      advice: 'Algunas personas notan cambios en el ánimo, el apetito o las molestias antes de la regla; otras no. Pueden variar de un mes a otro.',
      iconEmoji: '🍂',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Lleva tus registros a consulta si las molestias afectan a tu día'
    };
  }

  // 2. NUTRICIÓN Y METABOLISMO
  let nutritionCard: DailyWellnessAdvice;
  if (isPeriod) {
    nutritionCard = {
      id: 'nutri_period',
      category: 'nutrition',
      categoryTitle: 'Alimentación',
      headline: 'Comidas sencillas que te sienten bien',
      advice: 'Puedes combinar arroz, pan o patata con verduras y legumbres, huevo u otra proteína que te guste. Adapta las opciones a tus necesidades y preferencias.',
      iconEmoji: '🍲',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Un plato caliente es una opción si te apetece, no una obligación'
    };
  } else if (isOvulationDay) {
    nutritionCard = {
      id: 'nutri_ovulation',
      category: 'nutrition',
      categoryTitle: 'Alimentación',
      headline: 'Variedad también en días ocupados',
      advice: 'Frutas, verduras, cereales y alimentos con proteínas pueden formar parte de tus comidas habituales. Elige opciones accesibles que te sienten bien.',
      iconEmoji: '🫐',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'No necesitas un menú especial para cada fase'
    };
  } else if (phase === 'follicular') {
    nutritionCard = {
      id: 'nutri_follicular',
      category: 'nutrition',
      categoryTitle: 'Alimentación',
      headline: 'Una comida práctica para hoy',
      advice: 'Una tostada con huevo o un plato de legumbres con verduras son opciones sencillas. Cámbialas por alimentos que toleres y encajen con tus preferencias.',
      iconEmoji: '🥑',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Puedes preparar una ración extra para otro día'
    };
  } else {
    // Luteal
    nutritionCard = {
      id: 'nutri_luteal',
      category: 'nutrition',
      categoryTitle: 'Alimentación',
      headline: hasCravings ? 'Dale espacio a lo que te apetece' : 'Comidas que encajen con tu día',
      advice: hasCravings
        ? 'Si te apetece algo dulce, puedes disfrutarlo sin culpa. Tener un antojo no permite deducir tus niveles de azúcar ni de ninguna hormona.'
        : 'Si hoy tienes más hambre, puedes ajustar tus comidas o añadir una merienda. El calendario no permite calcular cuántas calorías necesitas.',
      iconEmoji: '🍫',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Adapta las opciones a tu apetito y a tus necesidades'
    };
  }

  // 3. MOVIMIENTO Y ENTRENAMIENTO
  let movementCard: DailyWellnessAdvice;
  if (isPeriod) {
    movementCard = {
      id: 'move_period',
      category: 'movement',
      categoryTitle: 'Movimiento',
      headline: 'Movimiento que te resulte cómodo',
      advice: 'Si te apetece, prueba a caminar o hacer movimientos suaves. También puedes seguir tu actividad habitual si te encuentras bien; para si aumenta el dolor.',
      iconEmoji: '🧘‍♀️',
      energyLevel: 'A tu ritmo',
      focusTip: 'No tienes que entrenar ni descansar por obligación'
    };
  } else if (isOvulationDay) {
    movementCard = {
      id: 'move_ovulation',
      category: 'movement',
      categoryTitle: 'Movimiento',
      headline: 'La intensidad la eliges tú',
      advice: 'Si vas a entrenar, elige una intensidad acorde con tu experiencia y cómo te encuentres. La ovulación estimada no es una señal para batir marcas.',
      iconEmoji: '⚡',
      energyLevel: 'A tu ritmo',
      focusTip: 'Presta atención a las molestias, sin forzar'
    };
  } else if (phase === 'follicular') {
    movementCard = {
      id: 'move_follicular',
      category: 'movement',
      categoryTitle: 'Movimiento',
      headline: 'Encuentra un rato para moverte',
      advice: 'Puedes pasear, bailar o hacer una actividad que ya conozcas. Ajusta la duración a tus sensaciones y a tu rutina, sin asumir una recuperación más rápida.',
      iconEmoji: '🏃‍♀️',
      energyLevel: 'A tu ritmo',
      focusTip: 'Empieza de forma gradual si retomas una actividad'
    };
  } else {
    // Luteal
    movementCard = {
      id: 'move_luteal',
      category: 'movement',
      categoryTitle: 'Movimiento',
      headline: 'Adapta el movimiento a tu día',
      advice: 'Si te encuentras bien, puedes mantener tu actividad habitual. Si notas cansancio o molestias, prueba una sesión más breve o una pausa.',
      iconEmoji: '🌿',
      energyLevel: 'A tu ritmo',
      focusTip: 'No necesitas cambiar de ejercicio solo por el calendario'
    };
  }

  // 4. MENTE, SUEÑO Y RITMO CIRCADIANO
  let mindsetCard: DailyWellnessAdvice;
  if (isPeriod) {
    mindsetCard = {
      id: 'mind_period',
      category: 'mindset',
      categoryTitle: 'Descanso y ánimo',
      headline: 'Un entorno cómodo para descansar',
      advice: 'Si necesitas descansar, busca un lugar tranquilo. Por la noche, una habitación oscura, silenciosa y cómoda puede ayudar, sin garantizar un sueño perfecto.',
      iconEmoji: '🌙',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'Procura levantarte a una hora parecida cada día'
    };
  } else if (isOvulationDay) {
    mindsetCard = {
      id: 'mind_ovulation',
      category: 'mindset',
      categoryTitle: 'Descanso y ánimo',
      headline: 'Tus planes, según tus ganas',
      advice: 'Puedes elegir entre compartir tiempo con alguien o reservar un rato para ti. El calendario no determina tu confianza, tus ganas de hablar ni tu estado de ánimo.',
      iconEmoji: '🗣️',
      energyLevel: 'A tu ritmo',
      focusTip: 'Una conversación importante no tiene que esperar a una fase'
    };
  } else if (phase === 'follicular') {
    mindsetCard = {
      id: 'mind_follicular',
      category: 'mindset',
      categoryTitle: 'Descanso y ánimo',
      headline: 'Una idea, un primer paso',
      advice: 'Si te apetece empezar algo, elige un paso pequeño y concreto. No necesitas esperar a una fase determinada para aprender o hacer planes.',
      iconEmoji: '💡',
      energyLevel: 'A tu ritmo',
      focusTip: 'Anota una idea que quieras retomar cuando puedas'
    };
  } else {
    // Luteal
    mindsetCard = {
      id: 'mind_luteal',
      category: 'mindset',
      categoryTitle: 'Descanso y ánimo',
      headline: 'Un cierre tranquilo para el día',
      advice: 'Si te ayuda, deja un rato para leer o respirar suavemente antes de acostarte. Si los problemas de sueño persisten o afectan a tu día, consulta.',
      iconEmoji: '💤',
      energyLevel: 'Según cómo te encuentres',
      focusTip: 'No empieces suplementos para dormir sin asesoramiento sanitario'
    };
  }

  return [physiologyCard, nutritionCard, movementCard, mindsetCard];
}
