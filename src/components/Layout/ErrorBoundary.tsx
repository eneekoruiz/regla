import { Component } from 'react';
import type { ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="app-error" role="alert"><h1>No pudimos abrir esta vista</h1><p>Recarga Aura para volver a intentarlo. Tus registros guardados seguirán en este dispositivo.</p><button type="button" className="aura-button primary" onClick={() => window.location.reload()}>Volver a abrir Aura</button></main>;
  }
}
