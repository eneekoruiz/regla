import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { KNOWN_SYMPTOMS } from '../../utils/nlpParser';
import type { SymptomItem, SymptomCategory } from '../../types/cycle';
import { ModalFrame } from './ModalFrame';
import {
  modalCategoryPill,
  modalCategorySelected,
  modalCategoryUnselected,
  modalChoice,
  modalField,
  modalPrimaryButton,
  modalSelected,
  modalUnselected,
} from './modalStyles';

const groups: { id: string; label: string; emoji: string; categories: SymptomCategory[] }[] = [
  { id: 'all',      label: 'Todos',     emoji: '✨', categories: [] },
  { id: 'physical', label: 'Cuerpo',    emoji: '💪', categories: ['pain', 'digestion', 'skin', 'sleep', 'flow'] },
  { id: 'mood',     label: 'Ánimo',     emoji: '🌙', categories: ['mood', 'energy', 'cravings', 'general'] },
  { id: 'intimacy', label: 'Intimidad', emoji: '🌸', categories: ['intimacy', 'contraception', 'ovulation_test', 'mucus', 'libido'] },
];

export function SymptomPickerModal({
  isOpen,
  onClose,
  currentSymptoms,
  onToggleSymptom,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentSymptoms: SymptomItem[];
  onToggleSymptom: (symptom: SymptomItem) => void;
}) {
  const [group, setGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const selected = new Set(currentSymptoms.map(s => s.id));
  const categories = groups.find(g => g.id === group)?.categories || [];
  const normalize = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const filtered = KNOWN_SYMPTOMS.filter(
    item =>
      (!categories.length || categories.includes(item.category)) &&
      normalize(item.name).includes(normalize(search.trim()))
  );

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Síntomas y sensaciones"
      description={
        currentSymptoms.length === 0
          ? 'Toca una sensación para añadirla'
          : `${currentSymptoms.length} ${currentSymptoms.length === 1 ? 'registrado' : 'registrados'}`
      }
      errorMessage={error}
      onClearError={() => setError('')}
      footer={
        <button type="button" onClick={onClose} className={modalPrimaryButton}>
          <Check size={17} aria-hidden="true" />
          Listo
        </button>
      }
    >
      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Buscar síntoma…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`${modalField} pl-9`}
          aria-label="Buscar síntoma"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2" aria-label="Categorías">
        {groups.map(g => (
          <button
            key={g.id}
            type="button"
            aria-pressed={group === g.id}
            onClick={() => setGroup(g.id)}
            className={`${modalCategoryPill} ${group === g.id ? modalCategorySelected : modalCategoryUnselected}`}
          >
            <span aria-hidden="true">{g.emoji}</span>{' '}{g.label}
          </button>
        ))}
      </div>

      {/* Symptom grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filtered.map(item => {
          const isOn = selected.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isOn}
              onClick={() => {
                try {
                  onToggleSymptom({
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    emoji: item.emoji,
                    severity: 'moderate',
                  });
                  setError('');
                } catch {
                  setError('No se ha guardado el síntoma. Vuelve a intentarlo.');
                }
              }}
              className={`flex items-center justify-between gap-2 ${modalChoice} ${isOn ? modalSelected : modalUnselected}`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {item.emoji && <span aria-hidden="true" className="text-base leading-none shrink-0">{item.emoji}</span>}
                <span className="truncate">{item.name}</span>
              </span>
              {isOn && (
                <Check
                  size={16}
                  className="shrink-0 text-[var(--rose)]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p role="status" className="py-4 text-center text-sm text-[var(--text-secondary)]">
          No hay síntomas con ese nombre.
        </p>
      )}
    </ModalFrame>
  );
}
