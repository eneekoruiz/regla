import type { ReactNode } from 'react';

export function MobileContainer({ children }: { children: ReactNode }) {
  return <div className="aura-app">{children}</div>;
}
