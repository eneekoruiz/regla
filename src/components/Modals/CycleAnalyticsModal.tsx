import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { SPANISH_MONTHS_SHORT, parseDateKey } from '../../utils/cycleCalculator';
import { hapticSelect } from '../../utils/haptics';
import { MedicalExportModal } from './MedicalExportModal';
import { ModalFrame } from './ModalFrame';
import { modalPrimaryButton, modalSecondaryButton } from './modalStyles';

interface CycleAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CycleAnalyticsModal({ isOpen, onClose }: CycleAnalyticsModalProps) {
  const { cycleStats, settings } = useCycle();
  const [isMedicalReportOpen, setIsMedicalReportOpen] = useState(false);
  const realCycles = cycleStats.historicalCycles || [];
  const estimatedLength = cycleStats.estimatedCycleLength || settings.averageCycleLength || 28;
  const estimatedPeriod = cycleStats.estimatedPeriodLength || settings.averagePeriodLength || 5;
  const variability = cycleStats.variabilityDays;
  const chartData = realCycles.slice(-5).map(cycle => {
    const date = parseDateKey(cycle.startDate);
    return { key: cycle.startDate, label: `${date.getDate()} ${SPANISH_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`, days: cycle.lengthDays };
  });
  const maxDays = Math.max(1, estimatedLength, ...chartData.map(item => item.days));

  return <>
    <ModalFrame isOpen={isOpen} onClose={onClose} title="Tendencias de tu ciclo"
      description="Duración e historial de tus registros."
      footer={<button type="button" onClick={onClose} className={modalSecondaryButton}>Cerrar</button>}>
      <dl className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="min-w-0"><dt className="text-sm text-[var(--text-secondary)]">Duración estimada</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{estimatedLength} días</dd></div>
        <div className="min-w-0"><dt className="text-sm text-[var(--text-secondary)]">Periodo estimado</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--rose)]">{estimatedPeriod} días</dd></div>
        <div className="min-w-0"><dt className="text-sm text-[var(--text-secondary)]">Ciclos completados</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{realCycles.length}</dd></div>
      </dl>

      <section className="min-w-0 space-y-4 border-t border-[var(--border-subtle)] pt-4" aria-label="Duración de ciclos recientes">
        <h3 className="text-sm font-semibold">Ciclos recientes</h3>
        {chartData.length === 0 && <p className="text-sm leading-relaxed text-[var(--text-secondary)]">Aún no hay ciclos completados. La estimación utiliza tus ajustes y los registros disponibles; no es una medición de un ciclo finalizado.</p>}
        <ol className="space-y-4">
          {chartData.map(item => <li key={item.key} className="min-w-0 space-y-2">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm"><span className="text-[var(--text-secondary)]">{item.label}</span><span className="font-semibold tabular-nums">{item.days} días</span></div>
            <div aria-hidden="true" className="h-2 w-full rounded bg-[var(--bg-card-inner)]"><div className="h-full rounded bg-[var(--accent)]" style={{ width: `${Math.max(0, Math.min(100, item.days / maxDays * 100))}%` }} /></div>
          </li>)}
        </ol>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm"><span className="text-[var(--text-secondary)]">Próximo ciclo · estimación</span><span className="font-semibold tabular-nums">{estimatedLength} días</span></div>
          <div aria-hidden="true" className="h-2 w-full rounded bg-[var(--bg-card-inner)]"><div className="h-full rounded bg-[var(--text-secondary)]" style={{ width: `${Math.min(100, estimatedLength / maxDays * 100)}%` }} /></div>
        </div>
      </section>

      <section className="space-y-2 border-t border-[var(--border-subtle)] pt-4" aria-label="Variación registrada">
        <h3 className="text-sm font-semibold">Variación registrada</h3>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{realCycles.length < 2 || variability == null
          ? 'Se necesitan al menos dos ciclos completados para comparar sus duraciones.'
          : `La variación calculada entre tus ciclos es de ${variability} días. Estas tendencias describen tus registros y no constituyen un diagnóstico.`}</p>
      </section>

      <button type="button" onClick={() => { hapticSelect(); setIsMedicalReportOpen(true); }} className={`${modalPrimaryButton} w-full`}>
        <FileText size={18} className="shrink-0" aria-hidden="true" /><span className="min-w-0">Preparar informe PDF</span>
      </button>
    </ModalFrame>
    {isOpen && isMedicalReportOpen && <MedicalExportModal isOpen onClose={() => setIsMedicalReportOpen(false)} />}
  </>;
}
