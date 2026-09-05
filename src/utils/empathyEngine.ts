import type { CycleDayInfo } from '../types/cycle';

interface EmpathyReflection {
  headline: string;
  message: string;
  focusTip: string;
  energyLevel: 'Baja / Introspectiva' | 'En aumento' | 'En su punto máximo' | 'Hacia adentro';
}

export function generateEmpathyInsight(dayInfo: CycleDayInfo): EmpathyReflection {
  const { phase, dayOfCycle, symptoms, isPeriod } = dayInfo;

  const hasCramps = symptoms.some((s) => s.id === 'cramps' || s.category === 'pain');
  const hasFatigue = symptoms.some((s) => s.id === 'fatigue');
  const hasHighEnergy = symptoms.some((s) => s.id === 'high_energy');
  const hasCravings = symptoms.some((s) => s.id === 'cravings');
  const hasSadOrSensitive = symptoms.some((s) => s.id === 'sensitive_mood');
  const hasIrritable = symptoms.some((s) => s.id === 'irritable');
  const hasBloating = symptoms.some((s) => s.id === 'bloating');

  if (hasCramps) {
    return {
      headline: 'Abraza el descanso y el calor',
      message: 'Es normal que hoy sientas contracciones uterinas mientras tu cuerpo limpia y renueva. Aplica calor suave en la zona lumbar o abdomen y date permiso para ir más despacio.',
      focusTip: 'Infusión tibia de jengibre o manzanilla y esterilla de calor.',
      energyLevel: 'Baja / Introspectiva'
    };
  }

  if (hasSadOrSensitive) {
    return {
      headline: 'Tus emociones son un mapa válido',
      message: 'La sensibilidad hormonal abre una ventana de conexión emocional profunda. No juzgues lo que sientes; abrígate, busca compañía segura o regálate un momento de silencio.',
      focusTip: 'Evita sobrecargarte de compromisos sociales hoy.',
      energyLevel: 'Hacia adentro'
    };
  }

  if (hasIrritable) {
    return {
      headline: 'Pon límites amables hoy',
      message: 'El cambio hormonal puede hacer que tu paciencia disminuya. Tu cuerpo te está pidiendo proteger tu energía de estímulos excesivos.',
      focusTip: 'Pausas conscientes de respiración profunda cada pocas horas.',
      energyLevel: 'Hacia adentro'
    };
  }

  if (hasBloating) {
    return {
      headline: 'Ligereza y digestión mimada',
      message: 'La progesterona y los cambios de fluidos causan retención natural. Es un efecto temporal del ciclo que se resolverá espontáneamente.',
      focusTip: 'Agua con limón, alimentos ricos en potasio y paseos suaves.',
      energyLevel: 'Hacia adentro'
    };
  }

  switch (phase) {
    case 'menstrual':
      return {
        headline: isPeriod ? `Día ${dayOfCycle} • Momento de soltar y recargar` : 'Fase de renovación interna',
        message: 'Tus niveles hormonales están en su punto basal. Es la temporada de invierno de tu ciclo: tu intuición está más aguda y tu cuerpo pide cuidados suaves y nutrición rica en hierro.',
        focusTip: 'Comidas tibias, descanso reparador y poco ruido mental.',
        energyLevel: 'Baja / Introspectiva'
      };

    case 'follicular':
      if (hasHighEnergy) {
        return {
          headline: `Día ${dayOfCycle} • Vitalidad en expansión`,
          message: 'Tus estrógenos están subiendo con fuerza, multiplicando tu agilidad mental y resistencia física. ¡Es un día excelente para iniciar nuevos proyectos o retos!',
          focusTip: 'Aprovecha este impulso para planificar y crear cosas nuevas.',
          energyLevel: 'En aumento'
        };
      }
      return {
        headline: `Día ${dayOfCycle} • Despertar de energía y claridad`,
        message: 'La primavera de tu ciclo. El aumento gradual de estrógeno estimula la serotonina, trayendo una mente más curiosa, ligera y abierta a nuevas experiencias.',
        focusTip: 'Ideal para brainstormings, ejercicio dinámico y aprendizajes.',
        energyLevel: 'En aumento'
      };

    case 'ovulation':
      return {
        headline: `Día ${dayOfCycle} • Tu pico de magnetismo y brillo`,
        message: 'Tus estrógenos y la hormona luteinizante alcanzan su cúspide. Tu capacidad de comunicación, empatía y magnetismo están en su máximo nivel biológico.',
        focusTip: 'Excelente momento para conversaciones importantes y conectar con otros.',
        energyLevel: 'En su punto máximo'
      };

    case 'luteal':
      if (hasCravings) {
        return {
          headline: `Día ${dayOfCycle} • Nutrición reconfortante`,
          message: 'Tu metabolismo basal se acelera en esta fase y requiere más calorías limpias. Satisface tus antojos con carbohidratos complejos y chocolate negro.',
          focusTip: 'Magnesio, frutos secos y snacks ricos en fibra.',
          energyLevel: 'Hacia adentro'
        };
      }
      if (hasFatigue) {
        return {
          headline: `Día ${dayOfCycle} • Honra el ritmo pausado`,
          message: 'La progesterona tiene un efecto relajante y sedante natural. No fuerces ritmos frenéticos cuando tu cuerpo está pidiendo reposo consciente.',
          focusTip: 'Cenas tempranas y lectura relajante antes de dormir.',
          energyLevel: 'Hacia adentro'
        };
      }
      return {
        headline: `Día ${dayOfCycle} • Otoño interior y concentración`,
        message: 'La progesterona domina esta etapa. Tu mente se vuelve más analítica y orientada a los detalles. Buen momento para cerrar tareas pendientes y cuidar de tu espacio.',
        focusTip: 'Cuidado de tu entorno, yoga suave y cenas ligeras y cálidas.',
        energyLevel: 'Hacia adentro'
      };

    default:
      return {
        headline: `Día ${dayOfCycle} de tu ciclo`,
        message: 'Escucha las señales de tu cuerpo con amabilidad. Cada día del ciclo tiene su propio ritmo y propósito biológico.',
        focusTip: 'Hidratación consciente y pausas de calidad.',
        energyLevel: 'En aumento'
      };
  }
}
