import { useState } from 'react';
import { ModalFrame } from './ModalFrame';
import { useCycle } from '../../hooks/useCycle';
import { Sparkles, Droplet, Check, Leaf, Moon } from 'lucide-react';

const CALENDAR_ITEMS = [
  {
    title: 'Regla registrada',
    description: 'El rosa intenso marca un sangrado que has guardado en tu registro.',
    preview: <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--rose)] text-white text-xs font-bold shadow-xs">9</span>
  },
  {
    title: 'Regla estimada',
    description: 'El rosa suave marca una fecha calculada según tus ciclos previos.',
    preview: <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--rose-soft)] text-[var(--rose)] text-xs font-semibold ring-1 ring-[var(--rose)]">10</span>
  },
  {
    title: 'Ventana fértil estimada',
    description: 'Los tonos azulados / turquesas indican los días de mayor probabilidad de concepción.',
    preview: <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-xs font-semibold ring-1 ring-sky-300 dark:ring-sky-700">14<span className="ml-0.5 text-[8px]">•</span></span>
  },
  {
    title: 'Día de ovulación estimada',
    description: 'Día con máxima probabilidad ovulatoria. El óvulo permanece viable de 12 a 24 horas.',
    preview: <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-bold ring-2 ring-amber-400">15<span className="ml-0.5 text-[10px]">✦</span></span>
  },
  {
    title: 'Con síntomas o notas',
    description: 'Un tick o punto inferior indica que tienes anotaciones o tomas guardadas.',
    preview: <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-chip)] text-[var(--text-primary)] text-xs">12<Check size={11} className="ml-0.5 text-[var(--accent)]"/></span>
  },
  {
    title: 'Fecha seleccionada y Hoy',
    description: 'El fondo sólido verde oscuro marca el día seleccionado en consulta; la fecha de hoy se distingue subrayada.',
    preview: <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white text-xs font-bold underline decoration-2">Hoy</span>
  }
];

export function ColorLegendModal({
  isOpen,
  onClose,
  initialTab = 'phases'
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'phases' | 'legend';
}) {
  const [tab, setTab] = useState<'phases' | 'legend'>(initialTab);
  const { currentDayInfo: day, hasEnoughData } = useCycle();

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={tab === 'phases' ? 'Fases del ciclo y fertilidad' : 'Leyenda del calendario'}
      footer={
        <button type="button" onClick={onClose} className="aura-button primary">
          Entendido
        </button>
      }
    >
      <div className="space-y-4">
        {/* Selector de pestañas */}
        <div className="flex rounded-xl bg-[var(--bg-card-inner)] p-1 border border-[var(--border-subtle)]" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'phases'}
            onClick={() => setTab('phases')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${tab === 'phases' ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Fases del ciclo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'legend'}
            onClick={() => setTab('legend')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${tab === 'legend' ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Símbolos del calendario
          </button>
        </div>

        {tab === 'phases' ? (
          <div className="space-y-3.5">
            {/* Tarjeta de estado actual */}
            {hasEnoughData && (
              <div className="rounded-2xl p-3.5 border border-emerald-300/40 bg-emerald-50/70 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <strong className="text-xs font-bold uppercase tracking-wider">
                    {day.isPeriod ? 'Tu regla activa' : day.isOvulationDay ? 'Ovulación estimada hoy' : day.isFertileWindow ? 'Estás en tu ventana fértil' : `En ${day.phaseName}`}
                  </strong>
                </div>
                <p className="text-xs leading-relaxed opacity-95">
                  {day.isPeriod
                    ? 'Estás en los días de sangrado menstrual. Descanso y escucha corporal.'
                    : day.isOvulationDay
                      ? 'Día de ovulación estimada: máxima probabilidad de concepción. El óvulo está disponible entre 12 y 24 horas.'
                      : day.isFertileWindow
                        ? 'Día fértil: los espermatozoides pueden sobrevivir varios días en moco fértil a la espera de la ovulación.'
                        : day.phase === 'follicular'
                          ? `Día ${day.dayOfCycle} de tu ciclo. Crecimiento folicular y aumento de estrógenos antes de la ventana fértil.`
                          : `Día ${day.dayOfCycle} de tu ciclo. Fase lútea post-ovulatoria dominada por la progesterona.`}
                </p>
              </div>
            )}

            {/* Guía de las 4 fases */}
            <div className="space-y-2.5 pt-1">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                  <Droplet size={15} />
                  <span>1. Fase Menstrual (Días 1 a 5 aprox.)</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                  Descenso de estrógenos y progesterona. Desprendimiento del endometrio con sangrado. Momento ideal para reconectar, descansar e hidratarse.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  <Leaf size={15} />
                  <span>2. Fase Folicular (Días 6 a 13 aprox.)</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                  La FSH estimula la maduración de folículos ováricos. Subida continua de estrógenos que eleva la energía física, el ánimo y la claridad mental.
                </p>
              </div>

              <div className="rounded-xl border border-sky-300/50 bg-sky-50/50 dark:bg-sky-950/20 p-3">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-bold text-xs">
                  <Sparkles size={15} />
                  <span>3. Ventana Fértil y Ovulación (Aprox. 6 días clave)</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                  Comprende los 5 días previos a la ovulación y el día ovulatorio. El pico de LH libera el óvulo. El moco cervical se vuelve elástico y transparente tipo clara de huevo, permitiendo la supervivencia espermática.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                  <Moon size={15} />
                  <span>4. Fase Lútea (Post-ovulación hasta la regla)</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                  El folículo se convierte en cuerpo lúteo y produce progesterona para sostener un posible embarazo. Si no hay fecundación, los niveles caen y se prepara el siguiente ciclo.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <dl className="space-y-3 pt-1">
            {CALENDAR_ITEMS.map(({ title, description, preview }) => (
              <div key={title} className="flex items-start gap-3.5 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <div className="shrink-0 pt-0.5">{preview}</div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-bold text-[var(--text-primary)]">{title}</dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{description}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}
      </div>
    </ModalFrame>
  );
}
