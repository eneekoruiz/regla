/**
 * Cara del mascota-gota: un gesto mínimo (ojos + boca) dibujado dentro de la
 * misma gota que ya usamos para la cuenta atrás de la regla, para que sirva a
 * la vez de personaje visual y de icono del Confidente. Se define una única
 * vez aquí y se reutiliza tanto en el anillo grande de HeroStatus como en el
 * icono pequeño DropMascot, para que la expresión sea siempre coherente.
 *
 * Todo el geometry está pensado para el viewBox 0 0 160 170 de la gota
 * (mismo path que ya se usa para el anillo): M 80 6 ... 80 6 Z.
 *
 * Hay dos "variantes" de geometría, no solo una escala uniforme, porque el
 * espacio disponible cambia de naturaleza según dónde se dibuje:
 * - 'ring': la carita vive en la punta superior de la gota (y ~ 6 a 26),
 *   la única zona que siempre queda libre de la etiqueta central de texto
 *   (que empieza a partir de ~15% de la altura del contenedor).
 * - 'icon': la gota se usa sola, como icono pequeño (20-24px) sin ningún
 *   texto superpuesto, así que la carita puede vivir más abajo, en el
 *   "vientre" ancho de la gota (y ~ 60-105), donde hay mucho más sitio y el
 *   gesto se sigue leyendo con claridad aunque el icono sea diminuto.
 */

import type { CyclePhase } from '../types/cycle';
export type { CyclePhase };

export type MascotMood = 'resting' | 'calm' | 'energetic' | 'soft';
export type MascotFaceVariant = 'ring' | 'icon';

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

/** Path de la silueta de la gota, reutilizado por el anillo y por el icono. */
export const DROP_SILHOUETTE_PATH =
  'M 80 6 C 58 18 16 56 16 98 A 64 64 0 0 0 144 98 C 144 56 102 18 80 6 Z';

// ---------------------------------------------------------------------------
// Variante 'ring': carita pequeña en la punta superior (no debe invadir la
// etiqueta de texto, que empieza en torno a y≈26 en este viewBox).
// ---------------------------------------------------------------------------
const RING_EYE_LEFT_X = 67;
const RING_EYE_RIGHT_X = 93;
const RING_EYE_Y = 25;

const RING_FACES: Record<MascotMood, MascotFace> = {
  energetic: {
    mouthPath: 'M 68 32 Q 80 46 92 32',
    mouthStrokeWidth: 2.6,
    eyesClosed: false,
    eyeLeftX: RING_EYE_LEFT_X,
    eyeRightX: RING_EYE_RIGHT_X,
    eyeY: RING_EYE_Y,
    eyeRadius: 3.4,
    eyeStrokeWidth: 2.2,
  },
  soft: {
    mouthPath: 'M 72 36 Q 80 39 88 36',
    mouthStrokeWidth: 2.6,
    eyesClosed: false,
    eyeLeftX: RING_EYE_LEFT_X,
    eyeRightX: RING_EYE_RIGHT_X,
    eyeY: RING_EYE_Y,
    eyeRadius: 2.8,
    eyeStrokeWidth: 2.2,
  },
  resting: {
    mouthPath: 'M 71 35 Q 80 41 89 35',
    mouthStrokeWidth: 2.6,
    eyesClosed: true,
    eyeLeftX: RING_EYE_LEFT_X,
    eyeRightX: RING_EYE_RIGHT_X,
    eyeY: RING_EYE_Y,
    eyeRadius: 3,
    eyeStrokeWidth: 2.2,
  },
  calm: {
    mouthPath: 'M 70 33 Q 80 42 90 33',
    mouthStrokeWidth: 2.6,
    eyesClosed: false,
    eyeLeftX: RING_EYE_LEFT_X,
    eyeRightX: RING_EYE_RIGHT_X,
    eyeY: RING_EYE_Y,
    eyeRadius: 3.1,
    eyeStrokeWidth: 2.2,
  },
};

// ---------------------------------------------------------------------------
// Variante 'icon': la gota se ve sola (sin texto encima), así que la carita
// se dibuja mucho más grande, en el vientre ancho de la gota, para que se
// lea con claridad incluso a 20px.
// ---------------------------------------------------------------------------
const ICON_EYE_LEFT_X = 58;
const ICON_EYE_RIGHT_X = 102;
const ICON_EYE_Y = 68;

const ICON_FACES: Record<MascotMood, MascotFace> = {
  energetic: {
    mouthPath: 'M 55 82 Q 80 118 105 82',
    mouthStrokeWidth: 13,
    eyesClosed: false,
    eyeLeftX: ICON_EYE_LEFT_X,
    eyeRightX: ICON_EYE_RIGHT_X,
    eyeY: ICON_EYE_Y,
    eyeRadius: 10,
    eyeStrokeWidth: 11,
  },
  soft: {
    mouthPath: 'M 65 88 Q 80 96 95 88',
    mouthStrokeWidth: 13,
    eyesClosed: false,
    eyeLeftX: ICON_EYE_LEFT_X,
    eyeRightX: ICON_EYE_RIGHT_X,
    eyeY: ICON_EYE_Y,
    eyeRadius: 8,
    eyeStrokeWidth: 11,
  },
  resting: {
    mouthPath: 'M 62 87 Q 80 100 98 87',
    mouthStrokeWidth: 13,
    eyesClosed: true,
    eyeLeftX: ICON_EYE_LEFT_X,
    eyeRightX: ICON_EYE_RIGHT_X,
    eyeY: ICON_EYE_Y,
    eyeRadius: 9,
    eyeStrokeWidth: 11,
  },
  calm: {
    mouthPath: 'M 60 84 Q 80 106 100 84',
    mouthStrokeWidth: 13,
    eyesClosed: false,
    eyeLeftX: ICON_EYE_LEFT_X,
    eyeRightX: ICON_EYE_RIGHT_X,
    eyeY: ICON_EYE_Y,
    eyeRadius: 9,
    eyeStrokeWidth: 11,
  },
};

export function getMascotFace(mood: MascotMood, variant: MascotFaceVariant = 'ring'): MascotFace {
  return (variant === 'icon' ? ICON_FACES : RING_FACES)[mood];
}
