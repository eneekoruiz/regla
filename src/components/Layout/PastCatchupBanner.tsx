import type { ReactNode } from 'react';
import { Clock, X } from 'lucide-react';

export interface PastCatchupAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

/**
 * Shared "you might have missed something" banner used on the diary hero for three
 * cases: a likely-missed period a month ago, yesterday left unlogged, and any other
 * past day left unlogged. Also reused (with `onDismiss`) as the floating check-in
 * pop-up shown once per day on today's view, so the markup, accessibility
 * attributes and styling only need to be correct in one place.
 */
export function PastCatchupBanner({ tone, badge, title, sub, actions, onDismiss }: {
  tone?: 'gold';
  badge: ReactNode;
  title: string;
  sub: string;
  actions: PastCatchupAction[];
  onDismiss?: () => void;
}) {
  const goldStyle = tone === 'gold' ? { background: 'var(--gold-soft)', borderColor: 'var(--gold)', color: 'var(--gold)' } : undefined;
  return (
    <div className="past-catchup-banner" style={goldStyle} role="region" aria-label="Aviso de registro pasado">
      {onDismiss && (
        <button type="button" className="past-catchup-dismiss" onClick={onDismiss} aria-label="Cerrar aviso">
          <X size={15} aria-hidden="true" />
        </button>
      )}
      <div className="past-catchup-body">
        <div className="past-catchup-badge" style={tone === 'gold' ? { color: 'var(--gold)' } : undefined}>
          <Clock size={13} aria-hidden="true" />
          <span>{badge}</span>
        </div>
        <p className="past-catchup-title" style={tone === 'gold' ? { color: 'var(--gold)' } : undefined}>{title}</p>
        <p className="past-catchup-sub" style={tone === 'gold' ? { opacity: 0.9 } : undefined}>{sub}</p>
      </div>
      <div className="past-catchup-actions">
        {actions.map((action, index) => (
          <button
            key={action.label}
            type="button"
            className={`aura-button sm${index === 0 ? ' primary' : ''}`}
            style={tone === 'gold' && index === 0 ? { background: 'var(--gold)', color: '#fff', borderColor: 'var(--gold)' } : undefined}
            onClick={action.onClick}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
