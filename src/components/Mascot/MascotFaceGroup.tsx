import { getMascotFace, type MascotFaceVariant, type MascotMood } from '../../utils/mascotFace';

interface MascotFaceGroupProps {
  mood: MascotMood;
  /** Color de los trazos de la cara (ojos + boca). */
  color?: string;
  /** Opacidad general de la cara, para que quede como un gesto sutil. */
  opacity?: number;
  /** 'ring' (por defecto): carita pequeña en la punta de la gota, pensada
   * para convivir con el texto del anillo grande. 'icon': carita más
   * grande en el vientre de la gota, para cuando se usa como icono suelto. */
  variant?: MascotFaceVariant;
}

/**
 * Ojos + boca de la mascota-gota, en las coordenadas del viewBox 0 0 160 170
 * de la gota. Pensado para pintarse por encima de cualquier otro contenido
 * (arco de progreso, silueta, etc.).
 */
export function MascotFaceGroup({ mood, color = 'currentColor', opacity = 1, variant = 'ring' }: MascotFaceGroupProps) {
  const face = getMascotFace(mood, variant);
  return (
    <g style={{ opacity }} stroke={color} fill={color} strokeLinecap="round">
      {face.eyesClosed ? (
        <>
          <path
            d={`M ${face.eyeLeftX - face.eyeRadius} ${face.eyeY} Q ${face.eyeLeftX} ${face.eyeY + face.eyeRadius * 0.9} ${face.eyeLeftX + face.eyeRadius} ${face.eyeY}`}
            fill="none"
            strokeWidth={face.eyeStrokeWidth}
          />
          <path
            d={`M ${face.eyeRightX - face.eyeRadius} ${face.eyeY} Q ${face.eyeRightX} ${face.eyeY + face.eyeRadius * 0.9} ${face.eyeRightX + face.eyeRadius} ${face.eyeY}`}
            fill="none"
            strokeWidth={face.eyeStrokeWidth}
          />
        </>
      ) : (
        <>
          <circle cx={face.eyeLeftX} cy={face.eyeY} r={face.eyeRadius} stroke="none" />
          <circle cx={face.eyeRightX} cy={face.eyeY} r={face.eyeRadius} stroke="none" />
        </>
      )}
      <path d={face.mouthPath} fill="none" strokeWidth={face.mouthStrokeWidth} />
    </g>
  );
}
