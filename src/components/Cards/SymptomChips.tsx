import { Plus, X, Check, Sparkles } from 'lucide-react';
import type { SymptomItem } from '../../types/cycle';
import { KNOWN_SYMPTOMS } from '../../utils/nlpParser';
import { modalChoice, modalSelected, modalUnselected } from '../Modals/modalStyles';
import { useCycle } from '../../hooks/useCycle';
import { getFrequentSymptomCombo } from '../../services/symptomPreferences';
import { hapticSelect, hapticSuccess } from '../../utils/haptics';

interface SymptomChipsProps {
  symptoms: SymptomItem[];
  onToggleSymptom?: (symptom: SymptomItem) => void;
  onRemove: (id: string) => void;
  onOpenPicker: () => void;
}

const COMMON_IDS = [
  'cramps_mild', 'cramps', 'fatigue', 'high_energy',
  'cravings', 'low_mood', 'bloating', 'headache',
];

export function SymptomChips({ symptoms, onToggleSymptom, onRemove, onOpenPicker }: SymptomChipsProps) {
  const { logs } = useCycle();
  const selected = new Set(symptoms.map(s => s.id));
  const common = KNOWN_SYMPTOMS.filter(s => COMMON_IDS.includes(s.id) && !selected.has(s.id));

  // Compute frequent combination
  const combo = getFrequentSymptomCombo(logs, 3);
  const unappliedFromCombo = combo.filter(s => !selected.has(s.id));
  const hasUsableCombo = combo.length >= 2 && unappliedFromCombo.length > 0;

  const handleApplyCombo = () => {
    if (!onToggleSymptom) return;
    hapticSuccess();
    for (const item of unappliedFromCombo) {
      onToggleSymptom(item);
    }
  };

  return (
    <div className="space-y-3">
      {/* 1-Tap Frequent Combo Shortcut */}
      {hasUsableCombo && (
        <button
          type="button"
          onClick={handleApplyCombo}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-[color-mix(in_srgb,var(--rose)_35%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--rose-soft)_60%,var(--bg-card-inner))] text-xs font-semibold text-[var(--rose)] hover:border-[var(--rose)] transition-all active:scale-[0.98] shadow-xs"
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>Añadir mi combo habitual ({unappliedFromCombo.map(s => s.name).join(', ')})</span>
        </button>
      )}

      {/* Selected symptoms */}
      {symptoms.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            En tu registro · toca para quitar
          </p>
          <div className="flex flex-wrap gap-2">
            {symptoms.map(s => (
              <button
                key={s.id}
                type="button"
                aria-label={`Eliminar ${s.name}`}
                onClick={() => {
                  hapticSelect();
                  onRemove(s.id);
                }}
                className={`flex items-center gap-2 ${modalChoice} ${modalSelected} pr-2`}
              >
                {s.emoji && <span aria-hidden="true" className="text-base leading-none">{s.emoji}</span>}
                <span className="text-[13px]">{s.name}</span>
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--rose)]/15">
                  <X size={11} className="text-[var(--rose)]" aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
        Toca una sensación para añadirla. Puedes cambiarla cuando quieras.
      </p>

      {/* Quick common symptoms */}
      {onToggleSymptom && common.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {common.map(s => {
            const isOn = selected.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={isOn}
                onClick={() => {
                  hapticSelect();
                  if (isOn) {
                    onRemove(s.id);
                  } else {
                    onToggleSymptom(s);
                  }
                }}
                className={`flex items-center gap-2 ${modalChoice} ${isOn ? modalSelected : modalUnselected}`}
              >
                {s.emoji && <span aria-hidden="true" className="text-base leading-none">{s.emoji}</span>}
                <span>{s.name}</span>
                {isOn && <Check size={14} className="shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Open full picker */}
      <button
        type="button"
        onClick={() => {
          hapticSelect();
          onOpenPicker();
        }}
        className={`flex items-center gap-2 ${modalChoice} ${modalUnselected} w-full justify-center`}
      >
        <Plus size={16} aria-hidden="true" />
        <span>Todos los síntomas</span>
      </button>
    </div>
  );
}
