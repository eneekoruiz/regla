import type { ReactNode } from 'react';

export function MobileContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`aura-app ${className}`.trim()}>{children}</div>;
}
