import { useState, useMemo } from 'react';
import { FileText, CalendarDays, Activity, Repeat2 } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { SPANISH_MONTHS_SHORT, parseDateKey } from '../../utils/cycleCalculator';
import { KNOWN_SYMPTOMS } from '../../utils/nlpParser';
import { hapticSelect } from '../../utils/haptics';
import { MedicalExportModal } from './MedicalExportModal';
import { ModalFrame } from './ModalFrame';
import { modalPrimaryButton, modalSecondaryButton } from './modalStyles';

interface CycleAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CycleAnalyticsModal({ isOpen, onClose }: CycleAnalyticsModalProps) {
  const { cycleStats, settings, logs } = useCycle();
  const [isMedicalReportOpen, setIsMedicalReportOpen] = useState(false);
  
  const realCycles = cycleStats.historicalCycles || [];
  const estimatedLength = cycleStats.estimatedCycleLength || settings.averageCycleLength || 28;
  const estimatedPeriod = cycleStats.estimatedPeriodLength || settings.averagePeriodLength || 5;
  const variability = cycleStats.variabilityDays;
  
  const chartData = realCycles.slice(-5).map(cycle => {
    const date = parseDateKey(cycle.startDate);
    // Asumimos un periodo aproximado si no se conoce para el render del gráfico
    const periodDays = Math.min(estimatedPeriod, cycle.lengthDays);
    return { 
      key: cycle.startDate, 
      label: `${date.getDate()} ${SPANISH_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`, 
      days: cycle.lengthDays,
      periodDays
    };
  });
  
  const maxDays = Math.max(1, estimatedLength, ...chartData.map(item => item.days));

  // Top síntomas de los últimos 90 días
  const topSymptoms = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    
    const counts: Record<string, number> = {};
    Object.entries(logs).forEach(([dateKey, log]) => {
      const logDate = parseDateKey(dateKey);
      if (logDate >= ninetyDaysAgo && logDate <= now) {
        if (log.symptoms && log.symptoms.length > 0) {
          log.symptoms.forEach(sym => {
            counts[sym.id] = (counts[sym.id] || 0) + 1;
          });
        }
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const def = KNOWN_SYMPTOMS.find(s => s.id === id);
        return def ? { ...def, count } : null;
      })
      .filter(Boolean) as (typeof KNOWN_SYMPTOMS[number] & { count: number })[];
  }, [logs]);

  let variabilityText = 'Aún no hay datos suficientes para calcular tu variabilidad.';
  if (realCycles.length >= 2 && variability != null) {
    if (variability <= 2) variabilityText = `Tus ciclos son muy regulares, varían en torno a ${variability} días de un mes a otro.`;
    else if (variability <= 5) variabilityText = `Tus ciclos tienen una variación moderada de ${variability} días entre ellos. Es normal.`;
    else variabilityText = `Tus ciclos varían unos ${variability} días entre ellos. Si experimentas otras molestias (como dolor muy fuerte, exceso de vello, o acné), podría ser útil comentarlo en consulta.`;
  }

  return <>
    <ModalFrame isOpen={isOpen} onClose={onClose} title="Tendencias de tu ciclo"
      description="Duración e historial de tus registros."
      footer={<button type="button" onClick={onClose} className={modalSecondaryButton}>Cerrar</button>}>
      
      <dl className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm">
          <dt className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            <Repeat2 size={14} /> Ciclo
          </dt>
          <dd className="text-2xl font-bold tabular-nums text-[var(--accent)]">{estimatedLength} <span className="text-sm font-medium text-[var(--text-secondary)]">días</span></dd>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm">
          <dt className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            <Activity size={14} /> Regla
          </dt>
          <dd className="text-2xl font-bold tabular-nums text-[var(--rose)]">{estimatedPeriod} <span className="text-sm font-medium text-[var(--text-secondary)]">días</span></dd>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm sm:col-span-2 lg:col-span-2">
          <dt className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            <CalendarDays size={14} /> Variabilidad
          </dt>
          <dd className="text-sm leading-relaxed">{variabilityText}</dd>
        </div>
      </dl>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="min-w-0 space-y-5" aria-label="Duración de ciclos recientes">
          <h3 className="text-[15px] font-semibold border-b border-[var(--border-subtle)] pb-2">Ciclos recientes</h3>
          {chartData.length === 0 && <p className="text-sm leading-relaxed text-[var(--text-secondary)]">Aún no hay ciclos completados. La estimación utiliza tus ajustes y los registros disponibles.</p>}
          <ol className="space-y-4">
            {chartData.map(item => (
              <li key={item.key} className="min-w-0 space-y-2">
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{item.days} días</span>
                </div>
                <div aria-hidden="true" className="h-3 w-full rounded-full bg-[var(--bg-card-inner)] flex overflow-hidden">
                  <div className="h-full bg-[var(--rose)] opacity-80" style={{ width: `${Math.max(0, Math.min(100, item.periodDays / maxDays * 100))}%` }} />
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.max(0, Math.min(100, (item.days - item.periodDays) / maxDays * 100))}%` }} />
                </div>
              </li>
            ))}
          </ol>
          <div className="min-w-0 space-y-2 pt-2">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
              <span className="font-medium text-[var(--text-secondary)]">Estimación actual</span>
              <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{estimatedLength} días</span>
            </div>
            <div aria-hidden="true" className="h-3 w-full rounded-full bg-[var(--bg-card-inner)] flex overflow-hidden">
              <div className="h-full bg-[var(--rose-soft)]" style={{ width: `${Math.max(0, Math.min(100, estimatedPeriod / maxDays * 100))}%` }} />
              <div className="h-full bg-[var(--accent-soft)]" style={{ width: `${Math.max(0, Math.min(100, (estimatedLength - estimatedPeriod) / maxDays * 100))}%` }} />
            </div>
          </div>
        </section>

        <section className="min-w-0 space-y-5" aria-label="Síntomas frecuentes">
          <h3 className="text-[15px] font-semibold border-b border-[var(--border-subtle)] pb-2">Síntomas frecuentes (90 días)</h3>
          {topSymptoms.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] italic">Registra síntomas para descubrir cuáles son tus patrones más comunes.</p>
          ) : (
            <ul className="space-y-3">
              {topSymptoms.map(sym => (
                <li key={sym.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-root)] text-lg" aria-hidden="true">
                      {sym.emoji}
                    </span>
                    <span className="font-medium text-sm">{sym.name}</span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    {sym.count} {sym.count === 1 ? 'vez' : 'veces'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-8 pt-4 border-t border-[var(--border-subtle)]">
        <button type="button" onClick={() => { hapticSelect(); setIsMedicalReportOpen(true); }} className={`${modalPrimaryButton} w-full`}>
          <FileText size={18} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0">Preparar informe PDF de salud</span>
        </button>
      </div>
    </ModalFrame>
    {isOpen && isMedicalReportOpen && <MedicalExportModal isOpen onClose={() => setIsMedicalReportOpen(false)} />}
  </>;
}
