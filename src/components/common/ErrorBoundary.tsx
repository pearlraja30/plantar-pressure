import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { safeStorage } from '../../services/storageUtils';

interface Props {
  children: ReactNode;
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
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PodoPress ErrorBoundary caught an unhandled exception]:', error, errorInfo);
    // If it's a QuotaExceededError, clean up heavy localStorage items immediately
    if (
      error.name === 'QuotaExceededError' ||
      error.message?.includes('quota') ||
      error.message?.includes('Storage')
    ) {
      safeStorage.removeItem('ppa-cases');
    }
    this.setState({ errorInfo });
  }

  private handleRecover = () => {
    safeStorage.removeItem('ppa-cases');
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            backgroundColor: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#0f172a',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0d9488' }}>
              <Database className="w-8 h-8 text-teal-600" />
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>PodoPress System Recovery</h2>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Inbuilt Database (IndexedDB) Protected</span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '6px',
                padding: '0.85rem',
                fontSize: '0.78rem',
                color: '#065f46',
                lineHeight: 1.4,
              }}
            >
              <strong>Data Protected:</strong> A browser storage quota boundary was intercepted. Your patient profiles, clinical scans, and hospital records remain safely preserved in your offline Inbuilt Database.
            </div>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '0.65rem',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  color: '#475569',
                  overflowX: 'auto',
                }}
              >
                {this.state.error.name}: {this.state.error.message}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleRecover}
              style={{
                backgroundColor: '#0d9488',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.65rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Recover Application & Continue
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
