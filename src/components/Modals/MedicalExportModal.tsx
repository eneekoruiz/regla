import { ModalFrame } from './ModalFrame';
import { useState, useMemo } from 'react';
import { useCycle } from '../../hooks/useCycle';
import { generateMedicalReportData, generateMedicalReportPDF, generateMedicalReportText } from '../../services/medicalReportGenerator';
import { shareOrCopyText, shareOrDownloadPDF } from '../../services/shareService';
import { Share2, Copy, Check, Activity } from 'lucide-react';

interface MedicalExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MedicalExportModal({ isOpen, onClose }: MedicalExportModalProps) {
  const { logs, settings, cycleStats } = useCycle();
  const [monthsBack, setMonthsBack] = useState<3 | 6>(6);
  const [patientName, setPatientName] = useState(settings.userName || '');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const reportData = useMemo(() => {
    return generateMedicalReportData(logs, settings, cycleStats, {
      monthsBack,
      patientName: patientName.trim() || undefined
    });
  }, [logs, settings, cycleStats, monthsBack, patientName]);

  if (!isOpen) return null;

  const handleSharePDF = async () => {
    if (downloading) return;
    setError(''); setDownloading(true);
    try {
      const doc = generateMedicalReportPDF(reportData);
      await shareOrDownloadPDF(
        doc,
        `reporte-medico-ciclos-${monthsBack}m-${new Date().toISOString().split('T')[0]}.pdf`
      );
    } catch { setError('No se ha podido exportar el informe. Vuelve a intentarlo.'); } finally {
      setDownloading(false);
    }
  };

  const handleCopyText = async () => {
    if (downloading) return;
    setDownloading(true); setError('');
    try {
      const result = await shareOrCopyText(generateMedicalReportText(reportData));
      setCopied(result.copied);
      if (!result.copied && !result.shared) setError('No se ha compartido el texto. Puedes exportar el PDF.');
    } catch { setError('No se ha podido compartir el resumen.'); }
    finally { setDownloading(false); }
  };

  return <ModalFrame isOpen={isOpen} onClose={onClose} closeDisabled={downloading} title="Informe de salud"
    footer={<button type="button" onClick={onClose} disabled={downloading} className="aura-button">Cerrar</button>}>
    {/* Timeframe Selector */}
    <div className="space-y-1.5">
      <span className="text-[13px] font-bold text-[var(--text-primary)]">
        Periodo a incluir
      </span>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: 3 as const, label: 'Últimos 3 meses' },
          { value: 6 as const, label: 'Últimos 6 meses' }
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={monthsBack === opt.value}
            onClick={() => setMonthsBack(opt.value)}
            className={`min-h-11 min-w-0 py-2 px-3 rounded-lg border text-[13px] font-semibold transition-all cursor-pointer ${
              monthsBack === opt.value
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] bg-[var(--bg-chip)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>

    {/* Patient Name */}
    <div className="space-y-1.5 min-h-11 min-w-0">
      <label htmlFor="report-patient-name" className="text-[13px] font-bold text-[var(--text-primary)]">
        Nombre de la paciente (opcional)
      </label>
      <input
        id="report-patient-name"
        maxLength={100}
        type="text"
        value={patientName}
        onChange={(e) => setPatientName(e.target.value)}
        placeholder="Ej. Ana García"
        className="aura-field min-w-0"
      />
    </div>

    {/* Clinical Summary Preview */}
    <div className="p-3.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] space-y-2.5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 text-[13px] font-bold text-[var(--text-primary)]">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <span>Resumen del registro</span>
        </span>
        <span className="text-[13px] font-semibold text-[var(--text-muted)]">
          {reportData.totalCyclesRecorded} {reportData.totalCyclesRecorded === 1 ? 'periodo registrado' : 'periodos registrados'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm text-[var(--text-secondary)]">
        <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <span className="text-[13px] font-semibold text-[var(--text-muted)] block">Ciclo estimado</span>
          <span className="font-extrabold text-[var(--text-primary)] text-sm">
            {reportData.averageCycleLength} d
          </span>
          <span className="text-[13px] font-medium text-[var(--text-muted)] ml-1">
            (±{reportData.variabilityDays}d)
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <span className="text-[13px] font-semibold text-[var(--text-muted)] block">Sangrado estimado</span>
          <span className="font-extrabold text-[var(--text-primary)] text-sm">
            {reportData.averagePeriodLength} días
          </span>
        </div>
      </div>

      {cycleStats.totalCyclesAnalyzed === 0 && <p className="text-[13px] text-[var(--text-secondary)]">Aún no hay ciclos completados. Las duraciones son estimaciones basadas en los ajustes y registros disponibles.</p>}

      {reportData.symptomFrequencies.length > 0 && (
        <div className="pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-[13px] font-bold text-[var(--text-tertiary)] block mb-1">
            Síntomas recurrentes:
          </span>
          <div className="flex flex-wrap gap-1">
            {reportData.symptomFrequencies.slice(0, 4).map((s) => (
              <span
                key={s.id}
                className="text-[13px] font-semibold px-2 py-0.5 rounded-lg bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              >
                {s.name} ({s.totalLoggedDays} d)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>

    {error && <p role="alert" className="text-sm text-[var(--rose)]">{error}</p>}
    {/* Action Buttons */}
    <div className="space-y-2 pt-1">
      <button
        onClick={handleSharePDF}
        disabled={downloading}
        className="aura-button primary w-full min-w-0"
      >
        <Share2 className="w-4 h-4" />
        <span>{downloading ? 'Generando PDF...' : 'Compartir PDF'}</span>
      </button>

      <button
        disabled={downloading}
        onClick={handleCopyText}
        className="aura-button w-full min-w-0"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span className="text-[var(--text-secondary)] font-bold">¡Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Compartir resumen de texto</span>
          </>
        )}
      </button>
    </div>
  </ModalFrame>;
}
