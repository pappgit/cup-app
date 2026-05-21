import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[cup] render error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ margin: '2rem 1rem' }}>
          <h2>Noe gikk galt</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--grey-600)' }}>
            Appen stoppet med en uventet feil. Prøv å laste siden på nytt.
          </p>
          <pre
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'var(--grey-50)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => window.location.reload()}
          >
            Last siden på nytt
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
