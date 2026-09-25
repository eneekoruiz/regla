/**
 * Cara de la mascota-gota del Confidente: un gesto mínimo (ojos + boca)
 * dibujado en el vientre de la gota, pensado para leerse con claridad incluso
 * como icono pequeño (20-24px). Todas las coordenadas usan el viewBox
 * 0 0 160 170 de DROP_SILHOUETTE_PATH.
 */

import type { CyclePhase } from '../types/cycle';
export type { CyclePhase };

export type MascotMood = 'resting' | 'calm' | 'energetic' | 'soft';

export interface MascotFace {
  /** Boca: un único trazo (quadratic bezier) coherente con el humor. */
  mouthPath: string;
  mouthStrokeWidth: number;
  /** Si los ojos se dibujan cerrados (arco) en vez de abiertos (punto). */
  eyesClosed: boolean;
  eyeLeftX: number;
  eyeRightX: number;
  eyeY: number;
  eyeRadius: number;
  eyeStrokeWidth: number;
}

/** Humor según la fase del ciclo — tranquila en folicular, con energía en
 * ovulación, más calmada en lútea; en menstrual, un gesto de reposo/cariño. */
export function moodForPhase(phase: CyclePhase | null | undefined): MascotMood {
  switch (phase) {
    case 'follicular':
      return 'calm';
    case 'ovulation':
      return 'energetic';
    case 'luteal':
      return 'soft';
    case 'menstrual':
      return 'resting';
    default:
      return 'calm';
  }
}

/** Silueta de la gota del icono del Confidente. */
export const DROP_SILHOUETTE_PATH =
  'M 80 6 C 58 18 16 56 16 98 A 64 64 0 0 0 144 98 C 144 56 102 18 80 6 Z';

const EYE_LEFT_X = 58;
const EYE_RIGHT_X = 102;
const EYE_Y = 68;

const FACES: Record<MascotMood, MascotFace> = {
  energetic: {
    mouthPath: 'M 55 82 Q 80 118 105 82',
    mouthStrokeWidth: 13,
    eyesClosed: false,
    eyeLeftX: EYE_LEFT_X,
    eyeRightX: EYE_RIGHT_X,
    eyeY: EYE_Y,
    eyeRadius: 10,
    eyeStrokeWidth: 11,
  },
  soft: {
    mouthPath: 'M 65 88 Q 80 96 95 88',
    mouthStrokeWidth: 13,
    eyesClosed: false,
    eyeLeftX: EYE_LEFT_X,
    eyeRightX: EYE_RIGHT_X,
    eyeY: EYE_Y,
    eyeRadius: 8,
    eyeStrokeWidth: 11,
  },
  resting: {
    mouthPath: 'M 62 87 Q 80 100 98 87',
    mouthStrokeWidth: 13,
    eyesClosed: true,
    eyeLeftX: EYE_LEFT_X,
    eyeRightX: EYE_RIGHT_X,
    eyeY: EYE_Y,
    eyeRadius: 9,
    eyeStrokeWidth: 11,
  },
  calm: {
    mouthPath: 'M 60 84 Q 80 106 100 84',
    mouthStrokeWidth: 13,
    eyesClosed: false,
    eyeLeftX: EYE_LEFT_X,
    eyeRightX: EYE_RIGHT_X,
    eyeY: EYE_Y,
    eyeRadius: 9,
    eyeStrokeWidth: 11,
  },
};

export function getMascotFace(mood: MascotMood): MascotFace {
  return FACES[mood];
}
