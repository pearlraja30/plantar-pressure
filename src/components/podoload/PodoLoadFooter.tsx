import React from 'react';

interface PodoLoadFooterProps {
  scannerModel?: string;
  scannerConnected?: boolean;
  resolutionDpi?: number;
  lastSyncTime?: string;
  onOpenAdmin?: () => void;
}

export const PodoLoadFooter: React.FC<PodoLoadFooterProps> = ({
  scannerModel,
  scannerConnected = false,
  resolutionDpi = 300,
  lastSyncTime = 'Just now',
  onOpenAdmin,
}) => {
  const modelText =
    scannerModel || (scannerConnected ? 'Optical Hardware Scanner' : 'No Scanner Attached');

  return (
    <footer className="podoload-system-status-bar" aria-label="System Hardware Status">
      <div className="podoload-status-left">
        <span>
          Scanner: <strong>{modelText}</strong> ·{' '}
          <span
            style={{
              color: scannerConnected ? '#10b981' : '#f59e0b',
              fontWeight: 600,
            }}
          >
            {scannerConnected ? 'Connected' : 'Offline'}
          </span>
        </span>
        <span>Resolution: {resolutionDpi} DPI</span>
        <span>Last sync: {lastSyncTime}</span>
      </div>

      <div className="podoload-status-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span>PodoPress · Technomind Healthcare</span>
        {onOpenAdmin && (
          <button
            type="button"
            className="podoload-footer-admin-btn"
            onClick={onOpenAdmin}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.7rem',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            title="Hospital Administrator Access (Master Password Required)"
            aria-label="Admin Portal"
          >
            Admin Portal
          </button>
        )}
      </div>
    </footer>
  );
};

