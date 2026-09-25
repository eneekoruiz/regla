import type { ReactNode } from 'react';
import { ModalFrame } from '../Modals/ModalFrame';
import { modalPrimaryButton, modalSecondaryButton } from '../Modals/modalStyles';

export interface CatchupAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

export interface CatchupNotice {
  /** Identifica el tipo de aviso (también para recordar si se cerró hoy). */
  id: 'missed-period' | 'yesterday' | 'past-day';
  tone: 'urgent' | 'gold' | 'calm';
  /** Lo que la gota pregunta en su bocadillo, en pocas palabras ("¿Y ayer?"). */
  prompt: string;
  /** Lo que falta, en pocas palabras ("Ayer quedó sin registrar."). */
  message: string;
  /** La pregunta que lo resuelve ("¿Qué tal fue?"). */
  detail: string;
  /** Como mucho dos respuestas de un toque; la primera es la principal. */
  actions: CatchupAction[];
  /** Respuesta secundaria, por ejemplo hablarlo con el Confidente. */
  link?: CatchupAction;
}

/**
 * La pregunta de la gota sobre un día pendiente. Junto a la gota es su
 * bocadillo; sin gota (aún no hay ciclo), una línea discreta en la tarjeta.
 * No ocupa sitio en el diario: las respuestas se abren en una ventana.
 */
export function CatchupPrompt({ notice, placement, onOpen }: {
  notice: CatchupNotice;
  placement: 'bubble' | 'inline';
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`catchup-prompt is-${placement}`}
      data-tone={notice.tone}
      aria-haspopup="dialog"
      aria-label={`${notice.prompt} ${notice.message}`}
      onClick={onOpen}
    >
      <span className="catchup-prompt-dot" aria-hidden="true" />
      {notice.prompt}
    </button>
  );
}

/** Ventana con las respuestas de un toque; «Recordármelo mañana» la aparca hasta el día siguiente. */
export function CatchupSheet({ notice, isOpen, onClose, onDismiss }: {
  notice: CatchupNotice;
  isOpen: boolean;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const answer = (action: CatchupAction) => () => {
    onClose();
    action.onClick();
  };
  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title={notice.message}
      description={notice.detail}
      footer={(
        <button type="button" className={modalSecondaryButton} onClick={() => { onClose(); onDismiss(); }}>
          Recordármelo mañana
        </button>
      )}
    >
      <div className="catchup-sheet-actions">
        {notice.actions.map((action, index) => (
          <button key={action.label} type="button" className={index === 0 ? modalPrimaryButton : modalSecondaryButton} onClick={answer(action)}>
            {action.icon}
            {action.label}
          </button>
        ))}
        {notice.link && (
          <button type="button" className="catchup-sheet-link" onClick={answer(notice.link)}>
            {notice.link.icon}
            {notice.link.label}
          </button>
        )}
      </div>
    </ModalFrame>
  );
}
