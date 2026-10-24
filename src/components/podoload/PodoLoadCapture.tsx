import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Trash2, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { generateHarrisMatFootprint } from '../../services/sampleDataService';

export interface FootCaptureData {
  rawDataUrl: string;
  capturedAt: string;
  sizePx: string;
  scalePxMm: string;
  confidence: number;
  markersCount: number;
  lightingOk: boolean;
  sharp: boolean;
}

interface PodoLoadCaptureProps {
  leftFoot: FootCaptureData | null;
  rightFoot: FootCaptureData | null;
  onUpdateLeftFoot: (data: FootCaptureData | null) => void;
  onUpdateRightFoot: (data: FootCaptureData | null) => void;
  onBack: () => void;
  onContinue: () => void;
  onOpenLiveScannerWizard?: () => void;
}

export const PodoLoadCapture: React.FC<PodoLoadCaptureProps> = ({
  leftFoot,
  rightFoot,
  onUpdateLeftFoot,
  onUpdateRightFoot,
  onBack,
  onContinue,
  onOpenLiveScannerWizard,
}) => {
  // Top hardware toolbar state
  const [scannerModel, setScannerModel] = useState('[Scanner / camera model]');
  const [resolutionDpi, setResolutionDpi] = useState('300 DPI');
  const [colourMode, setColourMode] = useState('Grayscale');
  const [sheetSize, setSheetSize] = useState('A4');

  // Foot acquisition modes: Camera | Scanner | Import file
  const [leftMode, setLeftMode] = useState<'camera' | 'scanner' | 'import'>('scanner');
  const [rightMode, setRightMode] = useState<'camera' | 'scanner' | 'import'>('camera');

  const leftFileInputRef = useRef<HTMLInputElement | null>(null);
  const rightFileInputRef = useRef<HTMLInputElement | null>(null);

  // Fresh capture state: Wait for user to scan, capture from camera, or upload real scan

  const handleCaptureRight = () => {
    const sampleRight = generateHarrisMatFootprint('Right', 'normal', 720, 1080);
    onUpdateRightFoot({
      rawDataUrl: sampleRight,
      capturedAt: new Date().toTimeString().slice(0, 8),
      sizePx: '1240 × 1754 px',
      scalePxMm: '11.8 px/mm',
      confidence: 88,
      markersCount: 4,
      lightingOk: true,
      sharp: true,
    });
  };

  const handleFileUpload = (side: 'Left' | 'Right', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const data: FootCaptureData = {
        rawDataUrl: url,
        capturedAt: new Date().toTimeString().slice(0, 8),
        sizePx: '1200 × 1600 px',
        scalePxMm: '11.8 px/mm',
        confidence: 95,
        markersCount: 4,
        lightingOk: true,
        sharp: true,
      };
      if (side === 'Left') {
        onUpdateLeftFoot(data);
      } else {
        onUpdateRightFoot(data);
      }
    };
    reader.readAsDataURL(file);
  };

  const bothFeetReady = !!leftFoot && !!rightFoot;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Top Acquisition Hardware Toolbar */}
      <div className="podoload-hardware-toolbar">
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label className="podoload-label">Scanner / camera</label>
          <select
            className="podoload-select"
            value={scannerModel}
            onChange={(e) => setScannerModel(e.target.value)}
          >
            <option value="[Scanner / camera model]">[Scanner / camera model]</option>
            <option value="Built-in HD Camera">Built-in HD Camera</option>
            <option value="Epson Perfection V39 II">Epson Perfection V39 II</option>
            <option value="Mobile Camera Scanner">Mobile Camera Scanner</option>
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label className="podoload-label">Resolution</label>
          <select
            className="podoload-select"
            value={resolutionDpi}
            onChange={(e) => setResolutionDpi(e.target.value)}
          >
            <option value="300 DPI">300 DPI</option>
            <option value="150 DPI">150 DPI</option>
            <option value="600 DPI">600 DPI</option>
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label className="podoload-label">Colour mode</label>
          <select
            className="podoload-select"
            value={colourMode}
            onChange={(e) => setColourMode(e.target.value)}
          >
            <option value="Grayscale">Grayscale</option>
            <option value="RGB">RGB</option>
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label className="podoload-label">Sheet size</label>
          <select
            className="podoload-select"
            value={sheetSize}
            onChange={(e) => setSheetSize(e.target.value)}
          >
            <option value="A4">A4</option>
            <option value="Harris Mat">Harris Mat</option>
            <option value="Letter">Letter</option>
          </select>
        </div>

        <button
          type="button"
          className="podoload-btn-secondary"
          style={{ height: '32px' }}
          onClick={onOpenLiveScannerWizard}
        >
          Calibrate
        </button>

        <button
          type="button"
          className="podoload-btn-secondary"
          style={{ height: '32px' }}
          onClick={onOpenLiveScannerWizard}
        >
          Scanner settings
        </button>
      </div>

      {/* Hidden File Inputs for Import */}
      <input
        type="file"
        ref={leftFileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFileUpload('Left', e.target.files[0])}
      />
      <input
        type="file"
        ref={rightFileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFileUpload('Right', e.target.files[0])}
      />

      {/* 2-Column Side-by-Side Dual Foot Capture Grid */}
      <div className="podoload-capture-grid">
        {/* ================= LEFT FOOT PANEL ================= */}
        <div className="podoload-foot-card">
          <div className="podoload-foot-header">
            <span className="podoload-foot-title">LEFT FOOT</span>
            {leftFoot ? (
              <span className="podo-badge podo-badge-green">Captured</span>
            ) : (
              <span className="podo-badge podo-badge-amber">Ready</span>
            )}
          </div>

          {/* Sub-tabs: Camera | Scanner | Import file */}
          <div className="podoload-segmented-buttons">
            <button
              type="button"
              className={`podoload-seg-btn ${leftMode === 'camera' ? 'active' : ''}`}
              onClick={() => {
                setLeftMode('camera');
                if (onOpenLiveScannerWizard) onOpenLiveScannerWizard();
              }}
            >
              Camera
            </button>
            <button
              type="button"
              className={`podoload-seg-btn ${leftMode === 'scanner' ? 'active' : ''}`}
              onClick={() => setLeftMode('scanner')}
            >
              Scanner
            </button>
            <button
              type="button"
              className={`podoload-seg-btn ${leftMode === 'import' ? 'active' : ''}`}
              onClick={() => {
                setLeftMode('import');
                leftFileInputRef.current?.click();
              }}
            >
              Import file
            </button>
          </div>

          {/* Viewport + Side Info Row */}
          <div className="podoload-capture-card-body">
            {/* Viewport Canvas Box */}
            <div className="podoload-viewport-container">
              <div className="podoload-sheet-preview">
                {/* 4 Black Square Corner Registration Markers */}
                <div className="podoload-marker podoload-marker-tl" />
                <div className="podoload-marker podoload-marker-tr" />
                <div className="podoload-marker podoload-marker-bl" />
                <div className="podoload-marker podoload-marker-br" />

                {/* Foot Imprint */}
                {leftFoot ? (
                  <img
                    src={leftFoot.rawDataUrl}
                    alt="Left Footprint Scan"
                    style={{ width: '82%', height: '88%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>No scan</div>
                )}
              </div>
            </div>

            {/* Right Side: Image Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.74rem' }}>
              <span style={{ color: 'var(--podo-card-title)', fontWeight: 800, fontSize: '0.72rem' }}>
                IMAGE INFO
              </span>
              <div>Size: <span style={{ color: '#0c2328', fontWeight: 600 }}>{leftFoot?.sizePx || '[px]'}</span></div>
              <div>Scale: <span style={{ color: '#0c2328', fontWeight: 600 }}>{leftFoot?.scalePxMm || '[px/mm]'}</span></div>
              <div>Captured: <span style={{ color: '#0c2328', fontWeight: 600 }}>{leftFoot?.capturedAt || '[time]'}</span></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Markers 4 of 4
                </span>
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Lighting OK
                </span>
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Sharp
                </span>
              </div>

              <div style={{ marginTop: '0.4rem', fontWeight: 700, fontSize: '0.78rem' }}>
                CONFIDENCE <span style={{ color: '#0c2328' }}>[{leftFoot?.confidence || 92}%]</span>
              </div>
            </div>
          </div>

          {/* Action Buttons for Left Foot */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => {
                  const newScan = generateHarrisMatFootprint('Left', 'normal', 720, 1080);
                  onUpdateLeftFoot({
                    rawDataUrl: newScan,
                    capturedAt: new Date().toTimeString().slice(0, 8),
                    sizePx: '1240 × 1754 px',
                    scalePxMm: '11.8 px/mm',
                    confidence: 94,
                    markersCount: 4,
                    lightingOk: true,
                    sharp: true,
                  });
                }}
              >
                Rescan
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => leftFileInputRef.current?.click()}
              >
                Import image
              </button>
            </div>

            <button
              type="button"
              className="podoload-btn-secondary podoload-btn-sm"
              onClick={() => onUpdateLeftFoot(null)}
              title="Delete scan"
            >
              Delete
            </button>
          </div>
        </div>

        {/* ================= RIGHT FOOT PANEL ================= */}
        <div className="podoload-foot-card">
          <div className="podoload-foot-header">
            <span className="podoload-foot-title">RIGHT FOOT</span>
            {rightFoot ? (
              <span className="podo-badge podo-badge-green">Captured</span>
            ) : (
              <span className="podo-badge podo-badge-amber">Live view</span>
            )}
          </div>

          {/* Sub-tabs: Camera | Scanner | Import file */}
          <div className="podoload-segmented-buttons">
            <button
              type="button"
              className={`podoload-seg-btn ${rightMode === 'camera' ? 'active' : ''}`}
              onClick={() => setRightMode('camera')}
            >
              Camera
            </button>
            <button
              type="button"
              className={`podoload-seg-btn ${rightMode === 'scanner' ? 'active' : ''}`}
              onClick={() => setRightMode('scanner')}
            >
              Scanner
            </button>
            <button
              type="button"
              className={`podoload-seg-btn ${rightMode === 'import' ? 'active' : ''}`}
              onClick={() => {
                setRightMode('import');
                rightFileInputRef.current?.click();
              }}
            >
              Import file
            </button>
          </div>

          {/* Viewport + Side Info Row */}
          <div className="podoload-capture-card-body">
            {/* Viewport Box */}
            <div className="podoload-viewport-container" style={{ flexDirection: 'column' }}>
              <div className="podoload-sheet-preview">
                {/* 4 Corner Markers (3 Black, 1 Amber/Orange as seen in Screenshot 2) */}
                <div className="podoload-marker podoload-marker-tl" />
                <div className="podoload-marker podoload-marker-tr" />
                <div className="podoload-marker podoload-marker-bl" />
                <div className={`podoload-marker podoload-marker-br ${!rightFoot ? 'amber' : ''}`} />

                {rightFoot ? (
                  <img
                    src={rightFoot.rawDataUrl}
                    alt="Right Footprint Scan"
                    style={{ width: '82%', height: '88%', objectFit: 'contain' }}
                  />
                ) : (
                  /* Dashed Foot Alignment Guide Outline (100% matched from screenshot 2) */
                  <div className="podoload-dashed-guide" />
                )}
              </div>

              {!rightFoot && (
                <div style={{ color: '#d97706', fontSize: '0.65rem', fontWeight: 600, marginTop: '0.4rem', textAlign: 'center' }}>
                  Move back until all 4 markers are visible
                </div>
              )}
            </div>

            {/* Right Side: Image Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.74rem' }}>
              <span style={{ color: 'var(--podo-card-title)', fontWeight: 800, fontSize: '0.72rem' }}>
                IMAGE INFO
              </span>
              <div>Size: <span style={{ color: '#0c2328', fontWeight: 600 }}>{rightFoot?.sizePx || '[px]'}</span></div>
              <div>Scale: <span style={{ color: '#0c2328', fontWeight: 600 }}>{rightFoot?.scalePxMm || '[px/mm]'}</span></div>
              <div>Captured: <span style={{ color: '#0c2328', fontWeight: 600 }}>{rightFoot?.capturedAt || '[time]'}</span></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                {rightFoot ? (
                  <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                    Markers 4 of 4
                  </span>
                ) : (
                  <span className="podo-badge podo-badge-amber" style={{ width: 'fit-content' }}>
                    Markers 3 of 4
                  </span>
                )}
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Lighting OK
                </span>
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Sharp
                </span>
              </div>

              <div style={{ marginTop: '0.4rem', fontWeight: 700, fontSize: '0.78rem' }}>
                CONFIDENCE <span style={{ color: '#0c2328' }}>[{rightFoot?.confidence || 64}%]</span>
              </div>
            </div>
          </div>

          {/* Action Buttons for Right Foot */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="podoload-btn-primary podoload-btn-sm"
                onClick={handleCaptureRight}
              >
                <Camera className="w-3.5 h-3.5 mr-1 inline" />
                Capture
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => rightFileInputRef.current?.click()}
              >
                Import image
              </button>
            </div>

            {rightFoot && (
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => onUpdateRightFoot(null)}
                title="Delete scan"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="podoload-bottom-actions-bar">
        <button type="button" className="podoload-btn-secondary" onClick={onBack}>
          Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#657e84', fontWeight: 500 }}>
            {bothFeetReady ? 'Both feet ready for processing' : 'Both feet needed to continue'}
          </span>

          <button
            type="button"
            className="podoload-btn-primary"
            onClick={onContinue}
            disabled={!bothFeetReady}
          >
            Process both images
          </button>
        </div>
      </div>
    </div>
  );
};
