import { Clock, Droplets, Leaf, Sparkles } from 'lucide-react';
import type { CycleDayInfo } from '../../types/cycle';

type ForecastKind = 'fertile' | 'period' | 'luteal' | 'follicular';

interface FutureForecast {
  kind: ForecastKind;
  title: string;
  description: string;
  tip: string;
}

/** Días antes de la regla en los que se recuerda tener los productos a mano. */
const PREPARE_WINDOW_DAYS = 5;
const IMMINENT_DAYS = 2;
const LATE_LUTEAL_DAYS = 8;

const ICONS = { fertile: Sparkles, period: Droplets, luteal: Clock, follicular: Leaf } as const;

function periodForecast(dayOfCycle: number, periodLength: number): FutureForecast {
  const isFirstDay = dayOfCycle === 1;
  const isLastDay = dayOfCycle >= periodLength;
  let description = 'Cuídate, hidrátate y descansa lo que necesites.';
  if (isFirstDay) description = 'Primera fecha prevista de sangrado. Ten todo preparado.';
  else if (isLastDay) description = '¡Último día previsto! Ya casi estás, ánimo.';
  else if (dayOfCycle >= periodLength - 1) description = 'Ya falta muy poco. Aguanta, lo estás haciendo genial.';
  return {
    kind: 'period',
    title: isFirstDay ? 'Se espera tu regla este día' : `Día ${dayOfCycle} de regla estimado`,
    description,
    tip: isLastDay ? '¡Ya casi! Mañana deberías sentirte mucho mejor.' : 'Ve a tu ritmo, no te exijas de más.',
  };
}

function lutealForecast(daysToNext: number): FutureForecast {
  const isClose = daysToNext <= PREPARE_WINDOW_DAYS;
  let description = 'Tu cuerpo se prepara para cerrar el ciclo. Un momento natural de recogimiento.';
  if (daysToNext <= IMMINENT_DAYS) description = 'Tu regla está a la vuelta de la esquina. Asegúrate de tener tus productos listos.';
  else if (isClose) description = 'Ve preparando tus productos menstruales. Es buen momento para tenerlo todo a mano.';
  else if (daysToNext <= LATE_LUTEAL_DAYS) description = 'La progesterona marca el ritmo. Es normal sentir cambios de ánimo o apetito.';
  return {
    kind: 'luteal',
    title: isClose ? `Tu regla llega en ${daysToNext} ${daysToNext === 1 ? 'día' : 'días'}` : 'Fase lútea (post-ovulación)',
    description,
    tip: isClose ? 'Tampones, compresas, copa… lo que uses, tenlo cerca.' : 'Prioriza el descanso, la hidratación y la comida que te apetezca.',
  };
}

function describeFutureDay(day: CycleDayInfo, daysToNext: number, periodLength: number): FutureForecast {
  if (day.isOvulationDay) {
    return {
      kind: 'fertile',
      title: 'Día de ovulación estimada',
      description: 'Máxima fertilidad del ciclo. El óvulo permanece viable entre 12 y 24 horas.',
      tip: 'Etapa clave si buscas concebir o si quieres evitar embarazo.',
    };
  }
  if (day.isFertileWindow && !day.isPeriod) {
    return {
      kind: 'fertile',
      title: 'Ventana de fertilidad',
      description: 'Tu cuerpo se prepara para ovular. Fertilidad alta durante estos días.',
      tip: 'Etapa clave si buscas concebir o si quieres evitar embarazo.',
    };
  }
  if (day.isPeriod) return periodForecast(day.dayOfCycle, periodLength);
  if (day.phase === 'luteal') return lutealForecast(daysToNext);
  return {
    kind: 'follicular',
    title: 'Fase folicular',
    description: 'Aumento paulatino de estrógenos y maduración folicular. Te sentirás con más energía.',
    tip: 'Aprovecha esta energía para lo que más te motive.',
  };
}

/** Qué esperar de un día futuro, en la parte baja de la tarjeta principal. */
export function FutureForecastCard({ day, daysToNext, periodLength }: { day: CycleDayInfo; daysToNext: number; periodLength: number }) {
  const forecast = describeFutureDay(day, daysToNext, periodLength);
  const Icon = ICONS[forecast.kind];
  return (
    <div className="future-forecast-container">
      <div className="future-forecast-card" data-phase={day.phase}>
        <div className="future-forecast-icon">
          <Icon size={18} aria-hidden="true" />
        </div>
        <div className="future-forecast-content">
          <h3 className="future-forecast-title">{forecast.title}</h3>
          <p className="future-forecast-desc">{forecast.description}</p>
          <span className="future-forecast-tip">{forecast.tip}</span>
        </div>
      </div>
    </div>
  );
}
