import { ModalFrame } from './ModalFrame';
const items = [
  ['Regla registrada', 'El rosa intenso marca un sangrado que has guardado en tu registro.', 'bg-[var(--rose)] text-[var(--accent-on)]'],
  ['Regla estimada', 'El rosa suave marca una fecha calculada a partir de tus registros y ajustes. Puede cambiar cuando añadas datos.', 'bg-[var(--rose-soft)] text-[var(--rose)]'],
  ['Fertilidad estimada', 'Los tonos verdes señalan estimaciones. Solo aparecen cuando hay datos suficientes del ciclo.', 'bg-[var(--accent-soft)] text-[var(--accent)]'],
  ['Fecha seleccionada', 'El borde marca el día que estás consultando.', 'border-2 border-[var(--accent)]'],
  ['Hoy', 'La fecha actual aparece subrayada.', 'underline underline-offset-4'],
  ['Con registros', 'Un punto indica que ese día tiene información guardada.', 'bg-[var(--bg-chip)]']
];
export function ColorLegendModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return <ModalFrame isOpen={isOpen} onClose={onClose} title="Leyenda del calendario" footer={<button type="button" onClick={onClose} className="aura-button primary">Entendido</button>}>
    <dl className="space-y-4">{items.map(([title, description, color]) => <div key={title} className="relative min-h-11 pl-14"><dt className="text-sm font-semibold"><span aria-hidden="true" className={`absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-sm ${color}`}>14{title === 'Con registros' ? '·' : ''}</span>{title}</dt><dd className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</dd></div>)}</dl>
  </ModalFrame>;
}
