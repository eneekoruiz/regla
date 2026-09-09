import { useState } from 'react';
import { ModalFrame } from './ModalFrame';
import { useCycle } from '../../hooks/useCycle';
import { formatDateKey } from '../../utils/dateKey';
import { Droplets, Calendar as CalendarIcon, History } from 'lucide-react';
import { useToast } from '../../context/toast';

export function PastCycleRecoveryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { logBleedingForDate, cycleStats, settings } = useCycle();
  const toast = useToast();

  const lastStart = cycleStats.lastVerifiedPeriodStart;
  const recommendedStart = lastStart ? new Date(lastStart + 'T12:00:00') : new Date();
  if (lastStart) {
    recommendedStart.setDate(recommendedStart.getDate() + (settings.averageCycleLength || 28));
  }

  const [startDate, setStartDate] = useState(formatDateKey(recommendedStart));
  const [duration, setDuration] = useState(settings.averagePeriodLength || 5);

  const handleSave = () => {
    try { navigator.vibrate?.(20); } catch {}
    const start = new Date(startDate + 'T12:00:00');
    for (let i = 0; i < duration; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const k = formatDateKey(d);
      logBleedingForDate(k, { flow: settings.typicalFlowIntensity || 'medium', isCycleStart: i === 0, isIrregular: false });
    }
    toast.success(`¡Regla recuperada! Se han añadido ${duration} días.`);
    onClose();
  };

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Recuperar ciclo anterior"
    >
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 mb-2 font-bold text-sm">
            <History size={16} />
            <span>¿Olvidaste apuntar el mes pasado?</span>
          </div>
          <p className="text-xs leading-relaxed opacity-90">
            Parece que llevas bastante tiempo sin registrar tu regla. Si la tuviste y se te olvidó anotarla, puedes añadirla rápidamente aquí para que tus previsiones no pierdan precisión.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <CalendarIcon size={16} className="text-[var(--text-secondary)]" />
              ¿Qué día empezó aproximadamente?
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <Droplets size={16} className="text-[var(--rose)]" />
              ¿Cuántos días te duró el sangrado?
            </label>
            <div className="flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setDuration(Math.max(1, duration - 1))}
                className="w-10 h-10 rounded-lg hover:bg-[var(--bg-card-inner)] flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <span className="text-2xl leading-none -mt-1">-</span>
              </button>
              <span className="text-lg font-bold w-12 text-center text-[var(--text-primary)]">{duration}</span>
              <button
                type="button"
                onClick={() => setDuration(duration + 1)}
                className="w-10 h-10 rounded-lg hover:bg-[var(--bg-card-inner)] flex items-center justify-center transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <span className="text-2xl leading-none -mt-0.5">+</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="aura-button primary w-full"
            style={{ padding: '14px' }}
          >
            Guardar regla pasada y recalcular
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
