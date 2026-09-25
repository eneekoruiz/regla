import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { createDropTrack, sparklePath, type Point } from '../../utils/dropGeometry';
import { describeDialDay, fillLevel, moodOnDay, type CycleDial as CycleDialModel, type DayRange } from '../../services/cycleDial';
import type { MascotMood } from '../../utils/mascotFace';
import { hapticTick } from '../../utils/haptics';

const VIEWBOX_SIZE = 200;
const DROP_TIP_Y = 8;
const DROP_RADIUS = 74;
const TRACK = createDropTrack(VIEWBOX_SIZE / 2, DROP_TIP_Y, DROP_RADIUS);
/** El texto va un poco por debajo del centro del vientre para dejar sitio a la cara. */
const CENTER_TOP_PERCENT = ((TRACK.belly.center.y + 4) / VIEWBOX_SIZE) * 100;
const KEYBOARD_PAGE_DAYS = 7;
const HINT_STORAGE_KEY = 'aura_dial_explored';

/** Superficie del líquido: una ondulación apenas perceptible, con el nivel en y = 0. */
const WAVELENGTH = 64;
const WAVE_AMPLITUDE = 1.4;
const WAVE_START_X = -WAVELENGTH * 2;
const WAVE_END_X = VIEWBOX_SIZE + WAVELENGTH * 2;
const SURFACE_PATH = (() => {
  const commands = [`M ${WAVE_START_X} 0`];
  for (let x = WAVE_START_X; x < WAVE_END_X; x += WAVELENGTH) {
    commands.push(`q ${WAVELENGTH / 4} ${-WAVE_AMPLITUDE} ${WAVELENGTH / 2} 0 t ${WAVELENGTH / 2} 0`);
  }
  return commands.join(' ');
})();
const LIQUID_PATH = `${SURFACE_PATH} V ${VIEWBOX_SIZE + 20} H ${WAVE_START_X} Z`;

/** Cara de la gota-avatar: dos ojos (como la mascota del Confidente) que miran al día marcado. */
const EYE_Y = 60;
const EYE_OFFSET_X = 15;
const LOOK_DISTANCE = 1.8;
const EYE_RADIUS: Record<Exclude<MascotMood, 'resting'>, number> = { calm: 4.2, energetic: 4.8, soft: 3.7 };
const CLOSED_EYE_RADIUS = 4.4;
/** Hacia dónde mira mientras pregunta algo: su bocadillo, arriba a la izquierda. */
const PROMPT_GAZE: Point = { x: 64, y: 18 };

const dayFraction = (day: number, length: number) => (day - 0.5) / length;
const rangePath = ({ start, end }: DayRange, length: number) => TRACK.slice((start - 1) / length, end / length);

function readHintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_STORAGE_KEY) === 'true';
  } catch {
    // Sin almacenamiento, la pista se sigue mostrando: no bloquea nada.
    return false;
  }
}

function rememberHintSeen(): void {
  try {
    localStorage.setItem(HINT_STORAGE_KEY, 'true');
  } catch {
    // Solo afecta a si la pista vuelve a aparecer la próxima vez.
  }
}

function gazeOffset(target: Point): Point {
  const dx = target.x - VIEWBOX_SIZE / 2;
  const dy = target.y - EYE_Y;
  const distance = Math.hypot(dx, dy) || 1;
  return { x: (dx / distance) * LOOK_DISTANCE, y: (dy / distance) * LOOK_DISTANCE };
}

function DropFace({ mood, gaze }: { mood: MascotMood; gaze: Point }) {
  const eyesX = [VIEWBOX_SIZE / 2 - EYE_OFFSET_X, VIEWBOX_SIZE / 2 + EYE_OFFSET_X];
  return (
    <g className="cycle-dial-face" style={{ transform: `translate(${gaze.x}px, ${gaze.y}px)` }}>
      {eyesX.map(x => (mood === 'resting'
        ? <path key={x} className="cycle-dial-eye is-closed" d={`M ${x - CLOSED_EYE_RADIUS} ${EYE_Y} Q ${x} ${EYE_Y + CLOSED_EYE_RADIUS * 0.9} ${x + CLOSED_EYE_RADIUS} ${EYE_Y}`} />
        : <circle key={x} className="cycle-dial-eye" cx={x} cy={EYE_Y} r={EYE_RADIUS[mood]} />))}
    </g>
  );
}

function nearestDay(points: Point[], target: Point): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const distance = (point.x - target.x) ** 2 + (point.y - target.y) ** 2;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best + 1;
}

function keyboardTarget(key: string, current: number, length: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return Math.min(length, current + 1);
    case 'ArrowLeft':
    case 'ArrowDown':
      return Math.max(1, current - 1);
    case 'PageUp':
      return Math.min(length, current + KEYBOARD_PAGE_DAYS);
    case 'PageDown':
      return Math.max(1, current - KEYBOARD_PAGE_DAYS);
    case 'Home':
      return 1;
    case 'End':
      return length;
    default:
      return null;
  }
}

/**
 * La gota del diario, convertida en avatar: su contorno es el ciclo completo,
 * su interior se llena a medida que se acerca la regla y sus ojos siguen el
 * día marcado. Se puede recorrer tocando o arrastrando cualquier punto (o con
 * las flechas del teclado) para ver qué pasa ese día. Si hay un día pendiente,
 * lo pregunta en un bocadillo (`prompt`).
 */
export function CycleDial({ dial, resetLabel, prompt, onPreviewChange }: {
  dial: CycleDialModel;
  /** Texto del botón que vuelve al día consultado tras recorrer la gota. */
  resetLabel: string;
  /** Bocadillo con la pregunta de la gota sobre un día pendiente. */
  prompt?: ReactNode;
  /** Avisa del día que se está recorriendo (o `null` al volver), p. ej. para el círculo de fases. */
  onPreviewChange?: (day: number | null) => void;
}) {
  const svgId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewDay, setPreviewDay] = useState<number | null>(null);
  const [hintSeen, setHintSeen] = useState(readHintSeen);
  // La gota aparece vacía y se llena hasta su nivel (con movimiento reducido, sin transición).
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const dayPoints = useMemo(
    () => Array.from({ length: dial.length }, (_, index) => TRACK.pointAt(dayFraction(index + 1, dial.length))),
    [dial.length],
  );

  const detail = previewDay === null ? null : describeDialDay(dial, previewDay);
  const activeDay = detail?.day ?? dial.day;
  const knob = dial.isLate && !detail ? TRACK.pointAt(0) : dayPoints[activeDay - 1];
  const fill = detail?.fill ?? fillLevel(dial, dial.isLate ? dial.length : dial.day);
  const liquidY = TRACK.levelAt(filled ? fill : 0);
  const center = detail?.center ?? dial.center;
  const tone = detail?.phase.tone ?? dial.tone;
  const mood = moodOnDay(dial, activeDay);
  const gaze = gazeOffset(prompt && !detail ? PROMPT_GAZE : knob);

  const changePreview = (next: number | null) => {
    setPreviewDay(next);
    onPreviewChange?.(next);
  };

  const preview = (day: number) => {
    // Volver al día consultado equivale a dejar de explorar; solo vibra al cambiar de día.
    const next = day === dial.day && !dial.isLate ? null : day;
    if (next === previewDay) return;
    changePreview(next);
    hapticTick();
    if (!hintSeen) {
      setHintSeen(true);
      rememberHintSeen();
    }
  };

  const previewFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const scale = VIEWBOX_SIZE / rect.width;
    preview(nearestDay(dayPoints, { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale }));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    previewFromPointer(event);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging) previewFromPointer(event);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && previewDay !== null) {
      event.preventDefault();
      changePreview(null);
      return;
    }
    const target = keyboardTarget(event.key, activeDay, dial.length);
    if (target === null) return;
    event.preventDefault();
    preview(target);
  };

  return (
    <div className="cycle-dial">
      <div className="cycle-dial-stage">
        <div className="cycle-dial-frame">
          <div
            ref={boxRef}
            className="cycle-dial-box"
            data-tone={tone}
            data-dragging={dragging || undefined}
            role="slider"
            tabIndex={0}
            aria-label="Recorrido de tu ciclo"
            aria-valuemin={1}
            aria-valuemax={dial.length}
            aria-valuenow={activeDay}
            aria-valuetext={detail?.summary ?? dial.summary}
            title="Toca o desliza la gota para ver cada día de tu ciclo"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            onKeyDown={onKeyDown}
          >
            <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} aria-hidden="true" focusable="false">
              <defs>
                <clipPath id={`${svgId}-inside`}>
                  <path d={TRACK.outline} />
                </clipPath>
                <linearGradient id={`${svgId}-liquid`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" className="cycle-dial-liquid-top" />
                  <stop offset="1" className="cycle-dial-liquid-bottom" />
                </linearGradient>
                <linearGradient id={`${svgId}-glass`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" className="cycle-dial-glass-top" />
                  <stop offset="1" className="cycle-dial-glass-bottom" />
                </linearGradient>
              </defs>

              <path className="cycle-dial-body" d={TRACK.outline} fill={`url(#${svgId}-glass)`} />
              <g clipPath={`url(#${svgId}-inside)`}>
                <g className="cycle-dial-liquid" style={{ transform: `translateY(${liquidY}px)` }}>
                  <g className="cycle-dial-wave">
                    <path d={LIQUID_PATH} fill={`url(#${svgId}-liquid)`} />
                    <path className="cycle-dial-surface" d={SURFACE_PATH} />
                  </g>
                </g>
              </g>

              <path className="cycle-dial-track" d={TRACK.outline} />
              {dial.period && <path className="cycle-dial-arc is-period" d={rangePath(dial.period, dial.length)} />}
              {dial.fertile && <path className="cycle-dial-arc is-fertile" d={rangePath(dial.fertile, dial.length)} />}
              {dial.ovulationDay !== null && (
                <path className="cycle-dial-ovulation" d={sparklePath(dayPoints[dial.ovulationDay - 1], 5.5)} />
              )}

              <DropFace mood={mood} gaze={gaze} />

              {detail && !dial.isLate && <circle className="cycle-dial-ghost" cx={dayPoints[dial.day - 1].x} cy={dayPoints[dial.day - 1].y} r="3.2" />}
              <g className="cycle-dial-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}>
                <circle className="cycle-dial-knob-dot" r="6.5" />
              </g>
            </svg>

            <div className="cycle-dial-center" style={{ top: `${CENTER_TOP_PERCENT}%` }} aria-hidden="true">
              {detail && <span className="cycle-dial-eyebrow">{`${detail.dateLabel} · día ${detail.day}`}</span>}
              <span className={`cycle-dial-value${/^\+?\d+$/.test(center.value) ? '' : ' is-word'}`}>
                {center.value}
              </span>
              <span className="cycle-dial-caption">{center.caption}</span>
              {center.note && <span className="cycle-dial-note">{center.note}</span>}
              {detail && <span className="cycle-dial-tag">{detail.phase.label}</span>}
            </div>
          </div>

          {prompt}
          {detail && (
            <button type="button" className="cycle-dial-reset" onClick={() => changePreview(null)}>
              <RotateCcw size={13} aria-hidden="true" />
              {resetLabel}
            </button>
          )}
        </div>
      </div>
      {!hintSeen && <p className="cycle-dial-hint">Recorre la gota para ver cada día</p>}
    </div>
  );
}
