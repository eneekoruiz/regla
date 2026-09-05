import type { HealthQuiz } from '../types/quiz';

export const HEALTH_QUIZZES: Record<string, HealthQuiz> = {
  stress: {
    id: 'stress_check',
    title: 'Estrés y tensión',
    description: 'Anota cómo te has sentido esta semana. Este cuestionario no realiza un diagnóstico.',
    estimatedTime: '1 min',
    iconEmoji: '🧘‍♀️',
    themeColor: 'indigo',
    questions: [
      {
        id: 'stress_q1',
        title: 'En la última semana, ¿cómo describirías tu nivel de tensión general?',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        sliderLabels: ['Muy relajada', 'Al límite']
      },
      {
        id: 'stress_q2',
        title: '¿Has sentido que las preocupaciones te impiden dormir?',
        type: 'single_choice',
        options: [
          { id: 'no', label: 'Casi nunca', emoji: '😴', score: 0 },
          { id: 'sometimes', label: 'A veces', emoji: '💭', score: 1 },
          { id: 'yes', label: 'Frecuentemente', emoji: '🦉', score: 2 }
        ]
      },
      {
        id: 'stress_q3',
        title: 'A nivel físico, ¿tienes tensión muscular o dolores de cabeza?',
        type: 'boolean'
      }
    ]
  },
  sleep: {
    id: 'sleep_quality',
    title: 'Descanso y sueño',
    description: 'Registra tu descanso y cómo te sientes al despertar.',
    estimatedTime: '30 seg',
    iconEmoji: '🌙',
    themeColor: 'emerald',
    questions: [
      {
        id: 'sleep_q1',
        title: '¿Cuántas horas seguidas sueles dormir últimamente?',
        type: 'single_choice',
        options: [
          { id: 'less_5', label: 'Menos de 6 horas', emoji: '🥱', score: 2 },
          { id: '6_7', label: 'De 6 a menos de 8 horas', emoji: '😌', score: 1 },
          { id: 'more_8', label: '8h o más', emoji: '✨', score: 0 }
        ]
      },
      {
        id: 'sleep_q2',
        title: '¿Te levantas con sensación de haber descansado?',
        type: 'boolean'
      }
    ]
  },
  pcos: {
    id: 'pcos_screening',
    title: 'Cambios en tu ciclo',
    description: 'Anota los cambios que has observado para tenerlos presentes en tu próxima consulta.',
    estimatedTime: '1.5 min',
    iconEmoji: '🔍',
    themeColor: 'rose',
    questions: [
      {
        id: 'pcos_q1',
        title: '¿La duración de tus ciclos varía mucho (por ejemplo, de 20 a 45 días)?',
        type: 'boolean'
      },
      {
        id: 'pcos_q2',
        title: '¿Has notado cambios inusuales en piel o vello corporal recientemente?',
        type: 'boolean'
      },
      {
        id: 'pcos_q3',
        title: '¿Cómo ha evolucionado tu peso en los últimos meses sin cambiar de dieta?',
        type: 'single_choice',
        options: [
          { id: 'stable', label: 'Estable', emoji: '⚖️' },
          { id: 'up', label: 'Ha aumentado', emoji: '📈' },
          { id: 'down', label: 'Ha disminuido', emoji: '📉' }
        ]
      }
    ]
  },
  pms: {
    id: 'pms_evaluation',
    title: 'Síntomas premenstruales',
    description: 'Registra cómo te afectan los días previos a la regla. Tus respuestas no sustituyen una valoración profesional.',
    estimatedTime: '45 seg',
    iconEmoji: '🌸',
    themeColor: 'purple',
    questions: [
      {
        id: 'pms_q1',
        title: 'En los días previos a tu regla, ¿notas irritabilidad, tristeza o cambios intensos de humor?',
        type: 'single_choice',
        options: [
          { id: 'mild', label: 'Leves o normales', emoji: '😌', score: 0 },
          { id: 'moderate', label: 'Moderados (me afectan el día)', emoji: '🌪️', score: 1 },
          { id: 'severe', label: 'Muy intensos (no me reconozco)', emoji: '💔', score: 2 }
        ]
      },
      {
        id: 'pms_q2',
        title: '¿Sueles tener hinchazón abdominal marcada o sensibilidad dolorosa en los pechos?',
        type: 'boolean'
      }
    ]
  },
  cramps: {
    id: 'cramps_check',
    title: 'Dolor menstrual',
    description: 'Anota la intensidad del dolor y qué te ayuda a aliviarlo.',
    estimatedTime: '30 seg',
    iconEmoji: '🩹',
    themeColor: 'rose',
    questions: [
      {
        id: 'cramps_q1',
        title: '¿Cómo calificarías el dolor de cólicos en una escala del 1 al 5?',
        type: 'slider',
        min: 1,
        max: 5,
        step: 1,
        sliderLabels: ['Molestia suave', 'Incapacitante']
      },
      {
        id: 'cramps_q2',
        title: '¿El dolor suele mejorar aplicando calor local (bolsa caliente o manta térmica)?',
        type: 'boolean'
      }
    ]
  }
};
