import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { DropMascot } from '../Mascot/DropMascot';

export interface PastCatchupAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

export interface PastCatchupNotice {
  /** Identifica el tipo de aviso (también para recordar si se cerró hoy). */
  id: 'missed-period' | 'yesterday' | 'past-day';
  tone: 'urgent' | 'gold' | 'calm';
  /** Lo que falta, en pocas palabras ("Ayer quedó sin registrar"). */
  message: string;
  /** La pregunta que lo resuelve ("¿Qué tal fue?"). */
  detail: string;
  /** Como mucho dos respuestas de un toque; la primera es la principal. */
  actions: PastCatchupAction[];
  /** Enlace secundario, por ejemplo para hablarlo con el Confidente. */
  link?: PastCatchupAction;
}

/**
 * Recordatorio compacto de "ponte al día": una sola línea discreta sobre la
 * tarjeta principal, con la voz del Confidente, que se resuelve con un toque
 * y se puede cerrar hasta mañana. Deliberadamente más ligero que el registro
 * de hoy, que es lo principal de la pantalla.
 */
export function PastCatchupBanner({ notice, onDismiss }: { notice: PastCatchupNotice; onDismiss?: () => void }) {
  const textId = `catchup-${notice.id}-text`;
  return (
    <motion.section
      className={`past-catchup-banner is-${notice.tone}`}
      role="region"
      aria-labelledby={textId}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, delay: 0.15 }}
    >
      <span className="past-catchup-avatar" aria-hidden="true">
        <DropMascot size={15} mood="calm" />
      </span>
      <p className="past-catchup-text" id={textId}>
        <strong>{notice.message}</strong> <span>{notice.detail}</span>
      </p>
      <div className="past-catchup-actions">
        {notice.actions.map((action, index) => (
          <button
            key={action.label}
            type="button"
            className={`past-catchup-action${index === 0 ? ' is-primary' : ''}`}
            onClick={action.onClick}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        {notice.link && (
          <button type="button" className="past-catchup-link" onClick={notice.link.onClick} aria-label={notice.link.label}>
            {notice.link.icon}
            <span className="past-catchup-link-label">{notice.link.label}</span>
          </button>
        )}
      </div>
      {onDismiss && (
        <button type="button" className="past-catchup-dismiss" onClick={onDismiss} aria-label="Ocultar recordatorio hasta mañana">
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </motion.section>
  );
}
