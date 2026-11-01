import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Copy,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  Database,
  Cpu,
  ShieldAlert,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { safeStorage } from '../../services/storageUtils';
import { diagnosticsLogger, DiagnosticErrorLog } from '../../services/diagnosticsLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  diagnosticLog: DiagnosticErrorLog | null;
  showTechDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    diagnosticLog: null,
    showTechDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log exception into persistent diagnostics store
    const log = diagnosticsLogger.logError(error, errorInfo.componentStack || undefined);

    // If quota-related, clean up heavy localStorage items immediately
    if (
      error.name === 'QuotaExceededError' ||
      error.message?.includes('quota') ||
      error.message?.includes('Storage')
    ) {
      safeStorage.removeItem('ppa-cases');
    }

    this.setState({ errorInfo, diagnosticLog: log });
  }

  private handleCopyLog = () => {
    if (this.state.diagnosticLog) {
      const json = diagnosticsLogger.exportLogsJson(this.state.diagnosticLog);
      navigator.clipboard.writeText(json).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      });
    }
  };

  private handleDownloadLog = () => {
    if (this.state.diagnosticLog) {
      const json = diagnosticsLogger.exportLogsJson(this.state.diagnosticLog);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PodoPress-Diagnostic-Error-${this.state.diagnosticLog.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  private handleAutoRepair = () => {
    // Clean up transient state while preserving IndexedDB
    safeStorage.removeItem('ppa-cases');
    this.setState({ hasError: false, error: null, errorInfo: null, diagnosticLog: null });
  };

  private handleFullReload = () => {
    safeStorage.removeItem('ppa-cases');
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const log = this.state.diagnosticLog;
      const error = this.state.error;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1.5rem',
            backgroundColor: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#0f172a',
          }}
        >
          <div
            style={{
              maxWidth: '680px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0c2328' }}>
                    Clinical System Diagnostic Interception
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '2px' }}>
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#ccfbf1',
                        color: '#0f766e',
                      }}
                    >
                      {log?.categoryLabel || 'Runtime Safety Guard Active'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      Log ID: <code>{log?.id || 'DIAG-SESSION'}</code>
                    </span>
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                }}
              >
                Inbuilt Database (IndexedDB) Protected
              </span>
            </div>

            {/* Error Message Box */}
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1.5px solid #fecdd3',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.8rem',
                color: '#9f1239',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Terminal className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <code style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {error?.name || 'Error'}: {error?.message || 'Unexpected application exception'}
              </code>
            </div>

            {/* Diagnostic Reason & Root Cause Explanation */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                fontSize: '0.78rem',
              }}
            >
              <div>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                  Diagnostic Reason & Root Cause Analysis:
                </strong>
                <p style={{ margin: 0, color: '#334155', lineHeight: 1.45 }}>
                  {log?.reasonExplanation ||
                    'An unhandled exception occurred during clinical analysis rendering. Medical records in your Inbuilt Database remain fully secure and unaffected.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                  Safety & Recovery Action Taken:
                </strong>
                <p style={{ margin: 0, color: '#0f766e', fontWeight: 600, lineHeight: 1.4 }}>
                  {log?.suggestedRemedy ||
                    'Application state isolation active. Click "Auto-Repair & Resume Session" to recover.'}
                </p>
              </div>
            </div>

            {/* Collapsible Technical Details / Stack Trace */}
            <div>
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showTechDetails: !prev.showTechDetails }))}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#0f766e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                {this.state.showTechDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>
                  {this.state.showTechDetails
                    ? 'Hide Technical Stack Trace & Environment Details'
                    : 'Show Detailed Technical Trace for IT / Bioengineering Analysis'}
                </span>
              </button>

              {this.state.showTechDetails && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                  }}
                >
                  <div style={{ color: '#38bdf8' }}>// SYSTEM ENVIRONMENT PARAMETERS</div>
                  <div>App Version: {log?.systemState.appVersion || '1.0.53'}</div>
                  <div>Station ID: {log?.deviceInfo.id} ({log?.deviceInfo.platform})</div>
                  <div>Active Facility: {log?.systemState.activeHospital}</div>
                  <div>Timestamp: {log?.timestamp}</div>
                  <div style={{ color: '#38bdf8', marginTop: '0.35rem' }}>// ERROR STACK TRACE</div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#f87171' }}>
                    {error?.stack || 'No JavaScript error stack captured.'}
                  </pre>
                  {log?.componentStack && (
                    <>
                      <div style={{ color: '#38bdf8', marginTop: '0.35rem' }}>// REACT COMPONENT TRACE</div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
                        {log.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Diagnostic Export Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={this.handleCopyLog}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{this.state.copied ? 'Log Copied to Clipboard!' : 'Copy Diagnostic Log'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleDownloadLog}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Diagnostic Report (.json)</span>
              </button>
            </div>

            {/* Recovery Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1rem',
                marginTop: '0.25rem',
              }}
            >
              <button
                type="button"
                onClick={this.handleFullReload}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.55rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Reload Application
              </button>

              <button
                type="button"
                onClick={this.handleAutoRepair}
                style={{
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.55rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)',
                }}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Auto-Repair & Resume Session</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
