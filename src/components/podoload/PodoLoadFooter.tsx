import React from 'react';

interface PodoLoadFooterProps {
  scannerModel?: string;
  scannerConnected?: boolean;
  resolutionDpi?: number;
  lastSyncTime?: string;
}

export const PodoLoadFooter: React.FC<PodoLoadFooterProps> = ({
  scannerModel = '[Scanner model]',
  scannerConnected = true,
  resolutionDpi = 300,
  lastSyncTime = '[time]',
}) => {
  return (
    <footer className="podoload-system-status-bar" aria-label="System Hardware Status">
      <div className="podoload-status-left">
        <span>
          Scanner: <strong>{scannerModel}</strong> · {scannerConnected ? 'Connected' : 'Offline'}
        </span>
        <span>Resolution: {resolutionDpi} DPI</span>
        <span>Last sync: {lastSyncTime}</span>
      </div>

      <div className="podoload-status-right">
        PodoLoad · Technomind Healthcare
      </div>
    </footer>
  );
};
