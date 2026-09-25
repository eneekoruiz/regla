import { sparklePath, type Point } from '../../utils/dropGeometry';
import type { PhaseRing as PhaseRingModel } from '../../services/phaseRing';

const VIEWBOX_SIZE = 200;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 82;

/** Punto del círculo a esa fracción del ciclo: el día 1 arriba y en sentido horario, como la gota. */
function pointAt(fraction: number): Point {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return { x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle) };
}

function arcPath(from: number, to: number): string {
  // Un arco que vuelve a su punto de partida no se dibuja: la vuelta completa va en dos mitades.
  if (to - from >= 1) return `${arcPath(from, from + 0.5)} ${arcPath(from + 0.5, to)}`;
  const start = pointAt(from);
  const end = pointAt(to);
  const largeArc = to - from > 0.5 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * El círculo de fases del ordenador: las fases del ciclo con su duración real,
 * la fase activa resaltada y el día marcado (sigue a la gota cuando se recorre).
 * Al tocarlo se abre la leyenda de fases, igual que el chip de la cabecera.
 */
export function PhaseRing({ ring, onOpenLegend }: { ring: PhaseRingModel; onOpenLegend: () => void }) {
  const fractionOf = (day: number) => (day - 0.5) / ring.length;
  const marker = pointAt(ring.isLate ? 0 : fractionOf(ring.day));
  return (
    <div className="phase-ring">
      <button
        type="button"
        className="phase-ring-frame"
        data-phase={ring.active}
        onClick={onOpenLegend}
        aria-label={`${ring.summary} Ver la leyenda de fases.`}
        title="Toca para ver la leyenda de fases del ciclo"
      >
        <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} aria-hidden="true" focusable="false">
          <circle className="phase-ring-track" cx={CENTER} cy={CENTER} r={RADIUS} />
          {ring.segments.map(segment => (
            <path
              key={segment.kind}
              className={`phase-ring-arc is-${segment.kind}${segment.kind === ring.active ? ' is-active' : ''}`}
              d={arcPath((segment.start - 1) / ring.length, segment.end / ring.length)}
            />
          ))}
          {ring.ovulationDay !== null && (
            <path className="phase-ring-ovulation" d={sparklePath(pointAt(fractionOf(ring.ovulationDay)), 5.5)} />
          )}
          <circle className="phase-ring-marker" cx={marker.x} cy={marker.y} r="6.5" />
        </svg>
        <span className="phase-ring-center" aria-hidden="true">
          <span className="phase-ring-kicker">{ring.kicker}</span>
          <span className="phase-ring-value">{ring.value}</span>
          <span className="phase-ring-caption">{ring.caption}</span>
        </span>
      </button>
    </div>
  );
}
