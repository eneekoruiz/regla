import type { LucideProps } from 'lucide-react';
import { DROP_SILHOUETTE_PATH, moodForPhase, type CyclePhase, type MascotMood } from '../../utils/mascotFace';
import { MascotFaceGroup } from './MascotFaceGroup';

interface DropMascotProps extends LucideProps {
  /** Fase del ciclo, para derivar el humor automáticamente. */
  phase?: CyclePhase;
  /** Humor explícito; tiene prioridad sobre `phase`. Por defecto, tranquila. */
  mood?: MascotMood;
}

/**
 * La gota de la cuenta atrás, convertida en el avatar del Confidente: mismo
 * trazo, misma silueta, con la carita dentro. Pensada como sustituto directo
 * de un icono de lucide-react (`size`, `className`, etc.), para poder
 * colocarla en cualquier sitio donde hoy hay un icono genérico de chat.
 *
 * Al usarse siempre a tamaños pequeños (~20-24px) y sin texto superpuesto,
 * la carita se dibuja con la variante 'icon' (más grande, en el vientre de
 * la gota) en vez de la variante 'ring' minúscula del anillo grande.
 */
export function DropMascot({ phase, mood, size = 24, color = 'currentColor', strokeWidth = 13, className, ...rest }: DropMascotProps) {
  const resolvedMood = mood ?? moodForPhase(phase ?? 'follicular');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 170"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      {...rest}
    >
      <path d={DROP_SILHOUETTE_PATH} />
      <MascotFaceGroup mood={resolvedMood} color={color} variant="icon" />
    </svg>
  );
}
