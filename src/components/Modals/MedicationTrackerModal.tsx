import { useMemo, useState } from 'react';
import { AlertCircle, Check, Pill, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useCycle } from '../../hooks/useCycle';
import { useToast } from '../../context/toast';
import type { MedicationItem } from '../../types/cycle';
import { ModalFrame } from './ModalFrame';
import { modalField, modalPrimaryButton, modalSecondaryButton } from './modalStyles';

const QUICK_MED_SUGGESTIONS = [
  { name: 'Píldora anticonceptiva', type: 'pill' as const, dose: '1 comprimido' },
  { name: 'Ibuprofeno', type: 'medication' as const, dose: '400 mg' },
  { name: 'Paracetamol', type: 'medication' as const, dose: '1 g' },
  { name: 'Ácido fólico', type: 'supplement' as const, dose: '1 comprimido' },
  { name: 'Hierro', type: 'supplement' as const, dose: '1 cápsula' },
  { name: 'Magnesio', type: 'supplement' as const, dose: '1 dosis' },
];

export function MedicationTrackerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { selectedDate, logs, logMedicationsForDate } = useCycle();
  const toast = useToast();

  // Buscar tomas previamente registradas en cualquier fecha para ofrecer continuidad
  const knownMedications = useMemo(() => {
    const map = new Map<string, MedicationItem>();
    for (const log of Object.values(logs)) {
      if (log.medications) {
        for (const m of log.medications) {
          const key = m.name.toLowerCase().trim();
          if (!map.has(key)) {
            map.set(key, { ...m, taken: false, id: crypto.randomUUID() });
          }
        }
      }
    }
    return Array.from(map.values());
  }, [logs]);

  // Lista para la fecha seleccionada
  const [medications, setMedications] = useState<MedicationItem[]>(() => {
    const current = logs[selectedDate]?.medications;
    if (current && current.length > 0) {
      return current.map(item => ({ ...item }));
    }
    if (knownMedications.length > 0) {
      return knownMedications.map(item => ({ ...item }));
    }
    return [];
  });

  // Estado para el formulario / pantalla emergente
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<MedicationItem['type']>('medication');
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const resetForm = () => {
    setName('');
    setDose('');
    setTime('');
    setType('medication');
    setError('');
  };

  const addMedication = (markAsTaken = false) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Escribe el nombre del medicamento.');
      return false;
    }
    if (medications.some(item => item.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase() && item.time === (time || undefined))) {
      setError('Esta toma ya está en la lista. Puedes registrar otra hora.');
      return false;
    }
    const newItem: MedicationItem = {
      id: crypto.randomUUID(),
      name: trimmedName,
      dose: dose.trim() || undefined,
      time: time || undefined,
      type,
      taken: markAsTaken
    };
    setMedications(items => [...items, newItem]);
    resetForm();
    setShowAddModal(false);
    return true;
  };

  const save = () => {
    try {
      logMedicationsForDate(selectedDate, medications);
      toast.success('Tomas de medicación guardadas');
      onClose();
    } catch {
      setSaveError('No se han guardado las tomas. Vuelve a intentarlo.');
    }
  };

  const hasMedications = medications.length > 0;
  const takenCount = medications.filter(item => item.taken).length;
  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { dateStyle: 'long' });

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Pastillas y tomas"
      description={formattedDate}
      errorMessage={saveError || (!showAddModal && error ? error : null)}
      onClearError={() => { setSaveError(''); setError(''); }}
      footer={
        !hasMedications ? (
          <>
            <button type="button" onClick={onClose} className={modalSecondaryButton}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => addMedication(false)}
              className={modalPrimaryButton}
            >
              <Plus size={17} aria-hidden="true" /> Añadir toma
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className={modalSecondaryButton}>
              Cancelar
            </button>
            <button type="button" onClick={save} className={modalPrimaryButton}>
              <Check size={17} aria-hidden="true" /> Guardar tomas
            </button>
          </>
        )
      }
    >
      {!hasMedications ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-root)] p-4 text-center">
            <span className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <Pill size={20} />
            </span>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Registra tu primera pastilla o medicación
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Añade las pastillas, anticonceptivos o suplementos que tomas habitualmente para marcar tus tomas de cada día.
            </p>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Sugerencias habituales
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_MED_SUGGESTIONS.map(s => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    setName(s.name);
                    setType(s.type);
                    setDose(s.dose);
                    setError('');
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all active:scale-95"
                >
                  <Sparkles size={11} className="text-[var(--accent)]" />
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Datos de la pastilla
            </legend>
            <label className="block space-y-1 text-sm font-medium">
              Nombre
              <input
                value={name}
                onChange={event => { setName(event.target.value); setError(''); }}
                maxLength={120}
                placeholder="Ej. Píldora anticonceptiva, Ibuprofeno..."
                className={modalField}
                autoFocus
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                Dosis (opcional)
                <input
                  value={dose}
                  onChange={event => setDose(event.target.value)}
                  maxLength={80}
                  placeholder="Ej. 1 comprimido, 400 mg"
                  className={modalField}
                />
              </label>
              <label className="block space-y-1 text-sm">
                Hora (opcional)
                <input
                  type="time"
                  value={time}
                  onChange={event => setTime(event.target.value)}
                  className={modalField}
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              Tipo
              <select
                value={type}
                onChange={event => setType(event.target.value as MedicationItem['type'])}
                className={modalField}
              >
                <option value="medication">Medicación</option>
                <option value="pill">Anticonceptivo</option>
                <option value="supplement">Suplemento</option>
              </select>
            </label>

            {error && (
              <p role="alert" className="text-sm font-medium text-[var(--rose)] flex items-center gap-1.5 pt-1">
                <AlertCircle size={15} /> {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => addMedication(false)}
              className={modalPrimaryButton + ' w-full mt-2'}
            >
              <Plus size={17} aria-hidden="true" /> Añadir toma
            </button>
          </fieldset>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-root)] px-3.5 py-2.5">
            <span className="text-sm font-medium text-[var(--text-secondary)]" aria-live="polite">
              {takenCount === medications.length && medications.length > 0 ? (
                <span className="text-[var(--accent)] font-semibold flex items-center gap-1.5">
                  <Check size={16} /> Todas las tomas completadas ({takenCount}/{medications.length})
                </span>
              ) : (
                `${takenCount} de ${medications.length} tomas registradas`
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="aura-button sm flex items-center gap-1.5 text-xs font-semibold"
            >
              <Plus size={14} aria-hidden="true" /> Añadir toma
            </button>
          </div>

          <ul className="space-y-2">
            {medications.map(item => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 transition-all hover:border-[var(--accent)]"
              >
                <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={item.taken}
                    aria-label={item.name}
                    className="size-5 shrink-0 rounded accent-[var(--accent)] cursor-pointer"
                    onChange={() =>
                      setMedications(items =>
                        items.map(med => (med.id === item.id ? { ...med, taken: !med.taken } : med))
                      )
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${item.taken ? 'line-through opacity-70' : ''}`}>
                        {item.name}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-root)] text-[var(--text-secondary)]">
                        {item.type === 'pill' ? 'Anticonceptivo' : item.type === 'supplement' ? 'Suplemento' : 'Medicación'}
                      </span>
                    </div>
                    <span className="block text-xs text-[var(--text-secondary)]">
                      {[item.dose, item.time].filter(Boolean).join(' · ') || 'Sin detalles adicionales'}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 ${item.taken ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-[var(--bg-root)] text-[var(--text-secondary)]'}`}>
                    {item.taken ? '✓ Tomada' : 'Pendiente'}
                  </span>
                </label>
                <button
                  type="button"
                  className="aura-icon-button size-10 shrink-0 text-[var(--text-secondary)] hover:text-[var(--rose)] hover:bg-[var(--rose-soft)]"
                  aria-label={`Eliminar ${item.name}`}
                  title="Eliminar de hoy"
                  onClick={() => setMedications(items => items.filter(med => med.id !== item.id))}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="aura-button w-full flex items-center justify-center gap-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent)] py-3 text-sm font-medium text-[var(--text-primary)]"
          >
            <Plus size={16} aria-hidden="true" />
            Añadir otra pastilla o toma
          </button>
        </div>
      )}

      {saveError && (
        <p role="alert" className="text-sm text-[var(--rose)] font-medium flex items-center gap-1.5 pt-2">
          <AlertCircle size={15} /> {saveError}
        </p>
      )}

      {/* Pantalla emergente para añadir una nueva pastilla/toma */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-med-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Pill size={18} />
                </span>
                <div>
                  <h3 id="add-med-title" className="text-base font-semibold text-[var(--text-primary)]">
                    Añadir pastilla o toma
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">Incorporar al seguimiento de hoy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { resetForm(); setShowAddModal(false); }}
                className="aura-icon-button size-9"
                aria-label="Cerrar ventana"
              >
                <X size={17} />
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="modal-error-banner flex items-center justify-between gap-2.5 rounded-xl border border-[var(--rose)]/30 bg-[var(--rose-soft)] px-3.5 py-2 text-xs font-semibold text-[var(--rose)] animate-modal-shake"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle size={16} className="shrink-0 text-[var(--rose)]" />
                  <span className="break-words leading-snug">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError('')}
                  aria-label="Cerrar aviso de error"
                  className="shrink-0 rounded p-0.5 text-[var(--rose)] hover:bg-[var(--rose)]/20 active:scale-95"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Sugerencias habituales
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_MED_SUGGESTIONS.map(s => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      setName(s.name);
                      setType(s.type);
                      setDose(s.dose);
                      setError('');
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-root)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all active:scale-95"
                  >
                    <Sparkles size={11} className="text-[var(--accent)]" />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block space-y-1 text-sm font-medium">
                Nombre
                <input
                  value={name}
                  onChange={event => { setName(event.target.value); setError(''); }}
                  maxLength={120}
                  placeholder="Ej. Píldora anticonceptiva, Ibuprofeno..."
                  className={modalField}
                  autoFocus
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  Dosis (opcional)
                  <input
                    value={dose}
                    onChange={event => setDose(event.target.value)}
                    maxLength={80}
                    placeholder="Ej. 1 comprimido, 400 mg"
                    className={modalField}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  Hora (opcional)
                  <input
                    type="time"
                    value={time}
                    onChange={event => setTime(event.target.value)}
                    className={modalField}
                  />
                </label>
              </div>

              <label className="block space-y-1 text-sm">
                Tipo
                <select
                  value={type}
                  onChange={event => setType(event.target.value as MedicationItem['type'])}
                  className={modalField}
                >
                  <option value="medication">Medicación</option>
                  <option value="pill">Anticonceptivo</option>
                  <option value="supplement">Suplemento</option>
                </select>
              </label>

              {error && (
                <p role="alert" className="text-sm font-medium text-[var(--rose)] flex items-center gap-1.5">
                  <AlertCircle size={15} /> {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
              <button
                type="button"
                onClick={() => { resetForm(); setShowAddModal(false); }}
                className={modalSecondaryButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => addMedication(true)}
                className={modalPrimaryButton}
              >
                <Plus size={16} aria-hidden="true" /> Añadir toma
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalFrame>
  );
}
