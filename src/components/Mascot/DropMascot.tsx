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
 * Avatar del Confidente: la gota con su carita. Sustituye directamente a un
 * icono de lucide-react (`size`, `className`, etc.), así que puede ir en
 * cualquier sitio donde haría falta un icono de chat.
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
      <MascotFaceGroup mood={resolvedMood} color={color} />
    </svg>
  );
}
