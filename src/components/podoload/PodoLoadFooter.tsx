import React from 'react';

interface PodoLoadFooterProps {
  scannerModel?: string;
  scannerConnected?: boolean;
  resolutionDpi?: number;
  lastSyncTime?: string;
}

export const PodoLoadFooter: React.FC<PodoLoadFooterProps> = ({
  scannerModel,
  scannerConnected = false,
  resolutionDpi = 300,
  lastSyncTime = 'Just now',
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

      <div className="podoload-status-right">
        PodoPress · Technomind Healthcare
      </div>
    </footer>
  );
};
