import type { ComponentType } from 'react';
import { Droplets, Heart, NotebookPen, Pill } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface QuickLogItem {
  id: string;
  /** Nombre completo: etiqueta en pantallas amplias y nombre accesible siempre. */
  label: string;
  /** Palabra clave que se ve en móvil. */
  shortLabel: string;
  title: string;
  icon: ComponentType<LucideProps>;
  pressed: boolean;
  onClick: () => void;
  className?: string;
}

function QuickLogButton({ item }: { item: QuickLogItem }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`quick-log${item.className ? ` ${item.className}` : ''}`}
      aria-pressed={item.pressed}
      aria-label={item.label}
      onClick={item.onClick}
      title={item.title}
    >
      <Icon size={18} aria-hidden="true" />
      <span className="quick-log-long">{item.label}</span>
      <span className="quick-log-short" aria-hidden="true">{item.shortLabel}</span>
    </button>
  );
}

/**
 * Los cuatro registros de hoy a un toque, siempre en el mismo orden. El
 * sangrado es la acción principal del diario y se distingue del resto.
 */
export function QuickLogBar({ hasBleeding, hasNotes, hasIntimacy, hasMedications, onOpenDaily, onOpenIntimacy, onOpenMedication }: {
  hasBleeding: boolean;
  hasNotes: boolean;
  hasIntimacy: boolean;
  hasMedications: boolean;
  onOpenDaily: () => void;
  onOpenIntimacy: () => void;
  onOpenMedication: () => void;
}) {
  const items: QuickLogItem[] = [
    {
      id: 'bleeding',
      label: hasBleeding ? 'Sangrado registrado' : 'Registro de sangrado',
      shortLabel: hasBleeding ? 'Registrado' : 'Sangrado',
      title: 'Registro de sangrado (normal, irregular o sin sangrado)',
      icon: Droplets,
      pressed: hasBleeding,
      onClick: onOpenDaily,
      className: 'period',
    },
    { id: 'notes', label: 'Síntomas y notas', shortLabel: 'Síntomas', title: 'Síntomas y notas', icon: NotebookPen, pressed: hasNotes, onClick: onOpenDaily },
    { id: 'intimacy', label: 'Intimidad', shortLabel: 'Intimidad', title: 'Intimidad', icon: Heart, pressed: hasIntimacy, onClick: onOpenIntimacy },
    { id: 'medication', label: 'Pastillas', shortLabel: 'Pastillas', title: 'Pastillas y tomas', icon: Pill, pressed: hasMedications, onClick: onOpenMedication },
  ];
  return (
    <section className="quick-log-section" aria-labelledby="quick-log-heading">
      <h3 id="quick-log-heading" className="quick-log-heading">Tu registro de hoy</h3>
      <div className="quick-log-grid">
        {items.map(item => <QuickLogButton key={item.id} item={item} />)}
      </div>
    </section>
  );
}
