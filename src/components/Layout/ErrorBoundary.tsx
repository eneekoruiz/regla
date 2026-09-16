import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  failed: boolean;
  errorMessage?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false, errorMessage: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { failed: true, errorMessage: error?.message || 'Error inesperado' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ failed: false, errorMessage: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app-error" role="alert">
        <h1>{this.props.fallbackTitle || 'No pudimos abrir esta vista'}</h1>
        <p>Recarga Aura para volver a intentarlo. Tus registros guardados seguirán en este dispositivo.</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
          <button type="button" className="aura-button primary" onClick={this.handleRetry}>
            Volver a abrir Aura
          </button>
        </div>
      </main>
    );
  }
}

