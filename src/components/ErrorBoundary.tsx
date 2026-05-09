import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log essential pieces to avoid circular structure crash if console.error stringifies
    console.error('Uncaught error:', error.message || String(error));
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fee2e2', color: '#991b1b', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Application Error</h1>
          <p style={{ marginBottom: '20px' }}>The preview encountered an unexpected error.</p>
          <div style={{ padding: '15px', backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', maxWidth: '800px', width: '100%', overflowX: 'auto' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>{this.state.error && this.state.error.toString()}</h3>
            <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }} onClick={() => window.location.reload()}>
            Reload Preview
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
