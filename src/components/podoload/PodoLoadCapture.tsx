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
  onOpenLiveScannerWizard?: (side?: 'Left' | 'Right') => void;
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
  const [scannerModel, setScannerModel] = useState('Epson Perfection V39 II / HD Camera');
  const [resolutionDpi, setResolutionDpi] = useState('300 DPI');
  const [colourMode, setColourMode] = useState('Grayscale');
  const [sheetSize, setSheetSize] = useState('A4');

  // Foot acquisition modes: Camera | Scanner | Import file
  const [leftMode, setLeftMode] = useState<'camera' | 'scanner' | 'import'>('camera');
  const [rightMode, setRightMode] = useState<'camera' | 'scanner' | 'import'>('camera');

  const leftFileInputRef = useRef<HTMLInputElement | null>(null);
  const rightFileInputRef = useRef<HTMLInputElement | null>(null);

  // Generate sample footprint for demo/testing mode
  const handleLoadSample = (side: 'Left' | 'Right') => {
    const sample = generateHarrisMatFootprint(side, 'normal', 720, 1080);
    const data: FootCaptureData = {
      rawDataUrl: sample,
      capturedAt: new Date().toTimeString().slice(0, 8),
      sizePx: '1240 × 1754 px',
      scalePxMm: '11.8 px/mm',
      confidence: side === 'Left' ? 94 : 88,
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
            <option value="Epson Perfection V39 II / HD Camera">Epson Perfection V39 II / HD Camera</option>
            <option value="Built-in HD Camera">Built-in HD Camera</option>
            <option value="Mobile Camera Scanner">Mobile Camera Scanner</option>
            <option value="USB Flatbed Scanner">USB Flatbed Scanner</option>
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
          onClick={() => onOpenLiveScannerWizard?.('Left')}
        >
          Calibrate
        </button>

        <button
          type="button"
          className="podoload-btn-secondary"
          style={{ height: '32px' }}
          onClick={() => onOpenLiveScannerWizard?.('Left')}
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
                if (onOpenLiveScannerWizard) onOpenLiveScannerWizard('Left');
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
              <div>Size: <span style={{ color: '#0c2328', fontWeight: 600 }}>{leftFoot?.sizePx || '1240 × 1754 px'}</span></div>
              <div>Scale: <span style={{ color: '#0c2328', fontWeight: 600 }}>{leftFoot?.scalePxMm || '11.8 px/mm'}</span></div>
              <div>Captured: <span style={{ color: '#0c2328', fontWeight: 600 }}>{leftFoot?.capturedAt || 'Ready'}</span></div>

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
                CONFIDENCE <span style={{ color: '#0c2328' }}>{leftFoot?.confidence || 94}%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons for Left Foot */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="podoload-btn-primary podoload-btn-sm"
                onClick={() => onOpenLiveScannerWizard?.('Left')}
                title="Launch camera alignment and scanner wizard"
              >
                <Camera className="w-3.5 h-3.5 mr-1 inline" />
                Camera
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => leftFileInputRef.current?.click()}
              >
                Import image
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => handleLoadSample('Left')}
                title="Load sample Harris Mat imprint for testing"
              >
                Sample scan
              </button>
            </div>

            {leftFoot && (
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => onUpdateLeftFoot(null)}
                title="Delete scan"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* ================= RIGHT FOOT PANEL ================= */}
        <div className="podoload-foot-card">
          <div className="podoload-foot-header">
            <span className="podoload-foot-title">RIGHT FOOT</span>
            {rightFoot ? (
              <span className="podo-badge podo-badge-green">Captured</span>
            ) : (
              <span className="podo-badge podo-badge-amber">Ready</span>
            )}
          </div>

          {/* Sub-tabs: Camera | Scanner | Import file */}
          <div className="podoload-segmented-buttons">
            <button
              type="button"
              className={`podoload-seg-btn ${rightMode === 'camera' ? 'active' : ''}`}
              onClick={() => {
                setRightMode('camera');
                if (onOpenLiveScannerWizard) onOpenLiveScannerWizard('Right');
              }}
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
                {/* 4 Corner Markers */}
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
                  /* Dashed Foot Alignment Guide Outline */
                  <div className="podoload-dashed-guide" />
                )}
              </div>

              {!rightFoot && (
                <div style={{ color: '#d97706', fontSize: '0.65rem', fontWeight: 600, marginTop: '0.4rem', textAlign: 'center' }}>
                  Position sheet until all 4 corner markers are visible
                </div>
              )}
            </div>

            {/* Right Side: Image Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.74rem' }}>
              <span style={{ color: 'var(--podo-card-title)', fontWeight: 800, fontSize: '0.72rem' }}>
                IMAGE INFO
              </span>
              <div>Size: <span style={{ color: '#0c2328', fontWeight: 600 }}>{rightFoot?.sizePx || '1240 × 1754 px'}</span></div>
              <div>Scale: <span style={{ color: '#0c2328', fontWeight: 600 }}>{rightFoot?.scalePxMm || '11.8 px/mm'}</span></div>
              <div>Captured: <span style={{ color: '#0c2328', fontWeight: 600 }}>{rightFoot?.capturedAt || 'Ready'}</span></div>

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
                CONFIDENCE <span style={{ color: '#0c2328' }}>{rightFoot?.confidence || 88}%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons for Right Foot */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="podoload-btn-primary podoload-btn-sm"
                onClick={() => onOpenLiveScannerWizard?.('Right')}
                title="Launch camera alignment and scanner wizard"
              >
                <Camera className="w-3.5 h-3.5 mr-1 inline" />
                Camera
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => rightFileInputRef.current?.click()}
              >
                Import image
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => handleLoadSample('Right')}
                title="Load sample Harris Mat imprint for testing"
              >
                Sample scan
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
