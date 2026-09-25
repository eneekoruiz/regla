import { getMascotFace, type MascotMood } from '../../utils/mascotFace';

interface MascotFaceGroupProps {
  mood: MascotMood;
  /** Color de los trazos de la cara (ojos + boca). */
  color?: string;
}

/** Ojos + boca de la mascota-gota, en las coordenadas del viewBox 0 0 160 170 de la gota. */
export function MascotFaceGroup({ mood, color = 'currentColor' }: MascotFaceGroupProps) {
  const face = getMascotFace(mood);
  return (
    <g stroke={color} fill={color} strokeLinecap="round">
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
