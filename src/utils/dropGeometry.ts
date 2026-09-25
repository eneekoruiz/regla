/**
 * Geometría de la gota del diario entendida como un recorrido: el contorno
 * completo representa un ciclo. Se recorre en sentido horario desde la punta
 * (día 1, inicio de la regla), baja por la ladera derecha, rodea el vientre y
 * vuelve a la punta por la izquierda (la siguiente regla).
 *
 * Todas las posiciones se expresan como fracción de la longitud real del
 * contorno (0 = punta, 1 = vuelta completa), de modo que cada día ocupa el
 * mismo espacio sobre el trazo y los arcos se pueden dibujar como tramos
 * exactos de la propia curva (no aproximaciones poligonales).
 *
 * La silueta tiene las mismas proporciones que el icono del Confidente
 * (DROP_SILHOUETTE_PATH, radio 64 en una caja de 160 × 170).
 */

export interface Point {
  x: number;
  y: number;
}

interface CubicSegment {
  kind: 'cubic';
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
}

interface ArcSegment {
  kind: 'arc';
  center: Point;
  radius: number;
  /** Ángulos en radianes; crecen en sentido horario en pantalla (eje y hacia abajo). */
  fromAngle: number;
  toAngle: number;
}

type Segment = CubicSegment | ArcSegment;

interface MeasuredSegment {
  segment: Segment;
  start: number;
  length: number;
  /** Solo en curvas: longitud acumulada para cada valor de t muestreado. */
  samples: { t: number; length: number }[];
}

export interface DropTrack {
  /** Contorno cerrado completo, listo para `<path d>`. */
  outline: string;
  /** Centro y radio del vientre, donde se coloca el texto central. */
  belly: { center: Point; radius: number };
  /** Punto del contorno a esa fracción del recorrido (0..1). */
  pointAt: (fraction: number) => Point;
  /** Tramo del contorno entre dos fracciones, como `<path d>` abierto. */
  slice: (from: number, to: number) => string;
}

/** Proporciones de la silueta de referencia (radio 64). */
const BASE_RADIUS = 64;
const TIP_CONTROL = { x: 22, y: 12 };
const SHOULDER_CONTROL_Y = 50;
const EQUATOR_Y = 92;
const CURVE_SAMPLES = 96;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round = (value: number) => Math.round(value * 100) / 100;
const formatPoint = ({ x, y }: Point) => `${round(x)} ${round(y)}`;

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function cubicPoint({ p0, p1, p2, p3 }: CubicSegment, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** De Casteljau: parte de la curva entre t0 y t1 como nueva cúbica. */
function cubicPart(curve: CubicSegment, t0: number, t1: number): CubicSegment {
  const splitLeft = (c: CubicSegment, t: number): CubicSegment => {
    const a = lerp(c.p0, c.p1, t);
    const b = lerp(c.p1, c.p2, t);
    const d = lerp(c.p2, c.p3, t);
    const ab = lerp(a, b, t);
    const bd = lerp(b, d, t);
    return { kind: 'cubic', p0: c.p0, p1: a, p2: ab, p3: lerp(ab, bd, t) };
  };
  const splitRight = (c: CubicSegment, t: number): CubicSegment => {
    const a = lerp(c.p0, c.p1, t);
    const b = lerp(c.p1, c.p2, t);
    const d = lerp(c.p2, c.p3, t);
    const ab = lerp(a, b, t);
    const bd = lerp(b, d, t);
    return { kind: 'cubic', p0: lerp(ab, bd, t), p1: bd, p2: d, p3: c.p3 };
  };
  const head = splitLeft(curve, t1);
  return t1 === 0 ? head : splitRight(head, t0 / t1);
}

function arcPoint({ center, radius }: ArcSegment, angle: number): Point {
  return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
}

function measure(segment: Segment, start: number): MeasuredSegment {
  if (segment.kind === 'arc') {
    return { segment, start, length: segment.radius * (segment.toAngle - segment.fromAngle), samples: [] };
  }
  const samples = [{ t: 0, length: 0 }];
  let previous = segment.p0;
  let length = 0;
  for (let index = 1; index <= CURVE_SAMPLES; index++) {
    const t = index / CURVE_SAMPLES;
    const point = cubicPoint(segment, t);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    samples.push({ t, length });
    previous = point;
  }
  return { segment, start, length, samples };
}

/** Parámetro local (t de la curva o ángulo del arco) a una distancia dada del inicio del tramo. */
function localParameter(measured: MeasuredSegment, distance: number): number {
  const { segment, samples, length } = measured;
  const offset = Math.min(length, Math.max(0, distance - measured.start));
  if (segment.kind === 'arc') return segment.fromAngle + offset / segment.radius;
  let low = 0;
  let high = samples.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].length < offset) low = middle;
    else high = middle;
  }
  const span = samples[high].length - samples[low].length;
  const ratio = span > 0 ? (offset - samples[low].length) / span : 0;
  return samples[low].t + (samples[high].t - samples[low].t) * ratio;
}

function segmentPoint(segment: Segment, parameter: number): Point {
  return segment.kind === 'arc' ? arcPoint(segment, parameter) : cubicPoint(segment, parameter);
}

function segmentCommand(measured: MeasuredSegment, fromDistance: number, toDistance: number): string {
  const { segment } = measured;
  const a = localParameter(measured, fromDistance);
  const b = localParameter(measured, toDistance);
  if (segment.kind === 'arc') {
    const largeArc = b - a > Math.PI ? 1 : 0;
    return `A ${round(segment.radius)} ${round(segment.radius)} 0 ${largeArc} 1 ${formatPoint(arcPoint(segment, b))}`;
  }
  const part = cubicPart(segment, a, b);
  return `C ${formatPoint(part.p1)} ${formatPoint(part.p2)} ${formatPoint(part.p3)}`;
}

/**
 * Crea el recorrido de una gota con la punta en (centerX, tipY) y el vientre
 * de radio `radius`.
 */
export function createDropTrack(centerX: number, tipY: number, radius: number): DropTrack {
  const scale = radius / BASE_RADIUS;
  const tip = { x: centerX, y: tipY };
  const equatorY = tipY + EQUATOR_Y * scale;
  const shoulderY = tipY + SHOULDER_CONTROL_Y * scale;
  const segments: Segment[] = [
    {
      kind: 'cubic',
      p0: tip,
      p1: { x: centerX + TIP_CONTROL.x * scale, y: tipY + TIP_CONTROL.y * scale },
      p2: { x: centerX + radius, y: shoulderY },
      p3: { x: centerX + radius, y: equatorY },
    },
    { kind: 'arc', center: { x: centerX, y: equatorY }, radius, fromAngle: 0, toAngle: Math.PI },
    {
      kind: 'cubic',
      p0: { x: centerX - radius, y: equatorY },
      p1: { x: centerX - radius, y: shoulderY },
      p2: { x: centerX - TIP_CONTROL.x * scale, y: tipY + TIP_CONTROL.y * scale },
      p3: tip,
    },
  ];

  const measured: MeasuredSegment[] = [];
  let total = 0;
  for (const segment of segments) {
    const entry = measure(segment, total);
    measured.push(entry);
    total += entry.length;
  }

  const locate = (distance: number) =>
    measured.find(entry => distance <= entry.start + entry.length) ?? measured[measured.length - 1];

  const pointAt = (fraction: number): Point => {
    const distance = clamp01(fraction) * total;
    const entry = locate(distance);
    return segmentPoint(entry.segment, localParameter(entry, distance));
  };

  const slice = (from: number, to: number): string => {
    const start = clamp01(Math.min(from, to)) * total;
    const end = clamp01(Math.max(from, to)) * total;
    const commands = [`M ${formatPoint(pointAt(start / total))}`];
    for (const entry of measured) {
      const segmentEnd = entry.start + entry.length;
      if (segmentEnd <= start || entry.start >= end) continue;
      commands.push(segmentCommand(entry, Math.max(start, entry.start), Math.min(end, segmentEnd)));
    }
    return commands.join(' ');
  };

  return {
    outline: `${slice(0, 1)} Z`,
    belly: { center: { x: centerX, y: equatorY }, radius },
    pointAt,
    slice,
  };
}
