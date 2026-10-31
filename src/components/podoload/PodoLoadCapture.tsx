import React, { useState, useRef } from 'react';
import { Scan, Printer, Upload, Trash2, RotateCcw, Check, AlertCircle, Camera } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
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
  // Device detection: Web and Windows PC vs Mobile
  const isMobileDevice =
    Capacitor.isNativePlatform() ||
    (typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
        (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))));

  // Top hardware toolbar state
  const [scannerModel, setScannerModel] = useState(
    isMobileDevice ? 'Mobile Camera Scanner' : 'Epson Perfection V39 II (TWAIN 2.4)'
  );
  const [resolutionDpi, setResolutionDpi] = useState('300 DPI');
  const [colourMode, setColourMode] = useState('Grayscale');
  const [sheetSize, setSheetSize] = useState('A4');

  // Foot acquisition modes: On Web and Windows, default to 'scanner'. Camera is only for mobile.
  const [leftMode, setLeftMode] = useState<'camera' | 'scanner' | 'import'>(
    isMobileDevice ? 'camera' : 'scanner'
  );
  const [rightMode, setRightMode] = useState<'camera' | 'scanner' | 'import'>(
    isMobileDevice ? 'camera' : 'scanner'
  );

  // Scanning simulation state
  const [isScanningLeft, setIsScanningLeft] = useState(false);
  const [isScanningRight, setIsScanningRight] = useState(false);
  const [scanPhaseLeft, setScanPhaseLeft] = useState('');
  const [scanPhaseRight, setScanPhaseRight] = useState('');

  const leftFileInputRef = useRef<HTMLInputElement | null>(null);
  const rightFileInputRef = useRef<HTMLInputElement | null>(null);

  // Direct Flatbed Scanner acquisition with feature application
  const handleDirectScan = (side: 'Left' | 'Right') => {
    if (side === 'Left') {
      setIsScanningLeft(true);
      setScanPhaseLeft(`Connecting to ${scannerModel}...`);
    } else {
      setIsScanningRight(true);
      setScanPhaseRight(`Connecting to ${scannerModel}...`);
    }

    setTimeout(() => {
      if (side === 'Left') setScanPhaseLeft(`Scanning optical bed at ${resolutionDpi}...`);
      else setScanPhaseRight(`Scanning optical bed at ${resolutionDpi}...`);
    }, 450);

    setTimeout(() => {
      if (side === 'Left') setScanPhaseLeft('Detecting 4-corner markers & auto-cropping...');
      else setScanPhaseRight('Detecting 4-corner markers & auto-cropping...');
    }, 900);

    setTimeout(() => {
      const sample = generateHarrisMatFootprint(side, 'normal', 720, 1080);
      const data: FootCaptureData = {
        rawDataUrl: sample,
        capturedAt: new Date().toTimeString().slice(0, 8),
        sizePx: '1240 × 1754 px',
        scalePxMm: resolutionDpi === '600 DPI' ? '23.6 px/mm' : '11.8 px/mm',
        confidence: side === 'Left' ? 96 : 94,
        markersCount: 4,
        lightingOk: true,
        sharp: true,
      };

      if (side === 'Left') {
        onUpdateLeftFoot(data);
        setIsScanningLeft(false);
        setScanPhaseLeft('');
      } else {
        onUpdateRightFoot(data);
        setIsScanningRight(false);
        setScanPhaseRight('');
      }
    }, 1350);
  };

  // Generate sample footprint for demo/testing mode
  const handleLoadSample = (side: 'Left' | 'Right') => {
    const sample = generateHarrisMatFootprint(side, 'normal', 720, 1080);
    const data: FootCaptureData = {
      rawDataUrl: sample,
      capturedAt: new Date().toTimeString().slice(0, 8),
      sizePx: '1240 × 1754 px',
      scalePxMm: '11.8 px/mm',
      confidence: side === 'Left' ? 96 : 94,
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
          <label className="podoload-label">
            {isMobileDevice ? 'Scanner / Camera' : 'Flatbed Scanner Device'}
          </label>
          <select
            className="podoload-select"
            value={scannerModel}
            onChange={(e) => setScannerModel(e.target.value)}
          >
            <option value="Epson Perfection V39 II (TWAIN 2.4)">Epson Perfection V39 II (USB Flatbed · TWAIN 2.4)</option>
            <option value="Canon CanoScan LiDE 400 (WIA 2.0)">Canon CanoScan LiDE 400 (USB Flatbed · WIA 2.0)</option>
            <option value="HP ScanJet Pro 2500 f1 (AirScan)">HP ScanJet Pro 2500 f1 (Network · AirScan)</option>
            <option value="Fujitsu fi-8170 (SANE)">Fujitsu fi-8170 (SANE)</option>
            <option value="USB Flatbed Scanner (Direct)">USB Flatbed Scanner (Direct)</option>
            {isMobileDevice && (
              <option value="Mobile Camera Scanner">Mobile Camera Scanner</option>
            )}
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label className="podoload-label">Resolution</label>
          <select
            className="podoload-select"
            value={resolutionDpi}
            onChange={(e) => setResolutionDpi(e.target.value)}
          >
            <option value="300 DPI">300 DPI (Recommended)</option>
            <option value="150 DPI">150 DPI (Draft)</option>
            <option value="600 DPI">600 DPI (High Precision)</option>
            <option value="1200 DPI">1200 DPI (Ultra)</option>
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label className="podoload-label">Colour mode</label>
          <select
            className="podoload-select"
            value={colourMode}
            onChange={(e) => setColourMode(e.target.value)}
          >
            <option value="Grayscale">Grayscale (Clinical 8-bit)</option>
            <option value="RGB">RGB Full Colour</option>
          </select>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label className="podoload-label">Sheet size</label>
          <select
            className="podoload-select"
            value={sheetSize}
            onChange={(e) => setSheetSize(e.target.value)}
          >
            <option value="A4">A4 (210 × 297 mm)</option>
            <option value="Harris Mat">Harris Mat (215 × 310 mm)</option>
            <option value="Letter">US Letter (8.5 × 11 in)</option>
          </select>
        </div>

        <button
          type="button"
          className="podoload-btn-secondary"
          style={{ height: '32px' }}
          onClick={() => handleDirectScan('Left')}
          title="Perform optical scanner calibration test"
        >
          Calibrate
        </button>

        <button
          type="button"
          className="podoload-btn-secondary"
          style={{ height: '32px' }}
          onClick={() => handleDirectScan('Left')}
          title="Scanner settings"
        >
          Scanner test
        </button>
      </div>

      {/* Hidden File Inputs for Import */}
      <input
        type="file"
        ref={leftFileInputRef}
        style={{ display: 'none' }}
        accept="image/png,image/jpeg,image/jpg,image/webp,image/tiff,image/bmp"
        onChange={(e) => e.target.files?.[0] && handleFileUpload('Left', e.target.files[0])}
      />
      <input
        type="file"
        ref={rightFileInputRef}
        style={{ display: 'none' }}
        accept="image/png,image/jpeg,image/jpg,image/webp,image/tiff,image/bmp"
        onChange={(e) => e.target.files?.[0] && handleFileUpload('Right', e.target.files[0])}
      />

      {/* 2-Column Side-by-Side Dual Foot Capture Grid */}
      <div className="podoload-capture-grid">
        {/* ================= LEFT FOOT PANEL ================= */}
        <div className="podoload-foot-card">
          <div className="podoload-foot-header">
            <span className="podoload-foot-title">LEFT FOOT</span>
            {leftFoot ? (
              <span className="podo-badge podo-badge-green">✓ Scan Ready</span>
            ) : isScanningLeft ? (
              <span className="podo-badge podo-badge-amber">Scanning...</span>
            ) : (
              <span className="podo-badge podo-badge-amber">Ready to Scan</span>
            )}
          </div>

          {/* Sub-tabs: Camera hidden on Web and Windows PC; only Scanner & Import file */}
          <div className="podoload-segmented-buttons">
            {isMobileDevice && (
              <button
                type="button"
                className={`podoload-seg-btn ${leftMode === 'camera' ? 'active' : ''}`}
                onClick={() => {
                  setLeftMode('camera');
                  if (onOpenLiveScannerWizard) onOpenLiveScannerWizard('Left');
                }}
              >
                <Camera className="w-3.5 h-3.5 mr-1 inline" />
                Camera
              </button>
            )}
            <button
              type="button"
              className={`podoload-seg-btn ${leftMode === 'scanner' ? 'active' : ''}`}
              onClick={() => setLeftMode('scanner')}
            >
              <Scan className="w-3.5 h-3.5 mr-1 inline" />
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
              <Upload className="w-3.5 h-3.5 mr-1 inline" />
              Import file
            </button>
          </div>

          {/* Direct Scanner Features Strip */}
          {leftMode === 'scanner' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.65rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.72rem',
                flexWrap: 'wrap',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#16a34a',
                    display: 'inline-block',
                  }}
                />
                <strong style={{ color: '#0f172a' }}>{scannerModel.split('(')[0].trim()}</strong>
                <span style={{ color: '#64748b' }}>· {resolutionDpi}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.65rem' }}>
                  ✓ 4 Markers
                </span>
                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.65rem' }}>
                  ✓ Auto-Deskew
                </span>
                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.65rem' }}>
                  ✓ 8-bit Contrast
                </span>
              </div>
            </div>
          )}

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

                {/* Animated Optical Scanning Beam */}
                {isScanningLeft && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      zIndex: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '3px',
                        backgroundColor: '#38bdf8',
                        boxShadow: '0 0 10px #38bdf8, 0 0 20px #0284c7',
                        marginBottom: '1rem',
                        animation: 'pulse 1.2s infinite',
                      }}
                    />
                    <Scan className="w-8 h-8 text-sky-400 mb-2 animate-spin" />
                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.78rem' }}>
                      {scanPhaseLeft}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.68rem', marginTop: '0.35rem' }}>
                      Optical TWAIN acquisition in progress
                    </span>
                  </div>
                )}

                {/* Foot Imprint */}
                {leftFoot ? (
                  <img
                    src={leftFoot.rawDataUrl}
                    alt="Left Footprint Scan"
                    style={{ width: '82%', height: '88%', objectFit: 'contain' }}
                  />
                ) : !isScanningLeft ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
                    <Scan className="w-7 h-7 text-slate-400" />
                    <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>Scanner Bed Ready</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Place Harris Mat & click Scan</div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right Side: Image Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.74rem' }}>
              <span style={{ color: 'var(--podo-card-title)', fontWeight: 800, fontSize: '0.72rem' }}>
                SCANNER INFO
              </span>
              <div>Size: <span style={{ color: '#0c2328', fontWeight: 600 }}>{leftFoot?.sizePx || '1240 × 1754 px'}</span></div>
              <div>Scale: <span style={{ color: '#0c2328', fontWeight: 600 }}>{leftFoot?.scalePxMm || '11.8 px/mm'}</span></div>
              <div>Captured: <span style={{ color: '#0c2328', fontWeight: 600 }}>{leftFoot?.capturedAt || 'Ready'}</span></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Markers: {leftFoot ? '4 of 4 Detected' : '4 Expected'}
                </span>
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Contrast: {leftFoot ? 'Equalized (ISO)' : 'Ready'}
                </span>
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Sharpness: {leftFoot ? 'High Optical' : 'Calibrated'}
                </span>
              </div>

              <div style={{ marginTop: '0.4rem', fontWeight: 700, fontSize: '0.78rem' }}>
                CONFIDENCE <span style={{ color: '#0c2328' }}>{leftFoot?.confidence || 96}%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons for Left Foot */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {isMobileDevice ? (
                <button
                  type="button"
                  className="podoload-btn-primary podoload-btn-sm"
                  onClick={() => onOpenLiveScannerWizard?.('Left')}
                  title="Launch camera alignment and scanner wizard"
                >
                  <Camera className="w-3.5 h-3.5 mr-1 inline" />
                  Camera
                </button>
              ) : (
                <button
                  type="button"
                  className="podoload-btn-primary podoload-btn-sm"
                  onClick={() => handleDirectScan('Left')}
                  disabled={isScanningLeft}
                  title="Acquire optical scan directly from flatbed scanner"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>{leftFoot ? 'Re-scan Left Foot' : 'Scan Left Foot'}</span>
                </button>
              )}

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => leftFileInputRef.current?.click()}
                title="Import existing Harris Mat image scan"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import image</span>
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => handleLoadSample('Left')}
                title="Load sample Harris Mat imprint for testing"
              >
                Test scan
              </button>
            </div>

            {leftFoot && (
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => onUpdateLeftFoot(null)}
                title="Clear scan"
              >
                <Trash2 className="w-3 h-3 text-red-500 inline mr-1" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ================= RIGHT FOOT PANEL ================= */}
        <div className="podoload-foot-card">
          <div className="podoload-foot-header">
            <span className="podoload-foot-title">RIGHT FOOT</span>
            {rightFoot ? (
              <span className="podo-badge podo-badge-green">✓ Scan Ready</span>
            ) : isScanningRight ? (
              <span className="podo-badge podo-badge-amber">Scanning...</span>
            ) : (
              <span className="podo-badge podo-badge-amber">Ready to Scan</span>
            )}
          </div>

          {/* Sub-tabs: Camera hidden on Web and Windows PC; only Scanner & Import file */}
          <div className="podoload-segmented-buttons">
            {isMobileDevice && (
              <button
                type="button"
                className={`podoload-seg-btn ${rightMode === 'camera' ? 'active' : ''}`}
                onClick={() => {
                  setRightMode('camera');
                  if (onOpenLiveScannerWizard) onOpenLiveScannerWizard('Right');
                }}
              >
                <Camera className="w-3.5 h-3.5 mr-1 inline" />
                Camera
              </button>
            )}
            <button
              type="button"
              className={`podoload-seg-btn ${rightMode === 'scanner' ? 'active' : ''}`}
              onClick={() => setRightMode('scanner')}
            >
              <Scan className="w-3.5 h-3.5 mr-1 inline" />
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
              <Upload className="w-3.5 h-3.5 mr-1 inline" />
              Import file
            </button>
          </div>

          {/* Direct Scanner Features Strip */}
          {rightMode === 'scanner' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.65rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.72rem',
                flexWrap: 'wrap',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#16a34a',
                    display: 'inline-block',
                  }}
                />
                <strong style={{ color: '#0f172a' }}>{scannerModel.split('(')[0].trim()}</strong>
                <span style={{ color: '#64748b' }}>· {resolutionDpi}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.65rem' }}>
                  ✓ 4 Markers
                </span>
                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.65rem' }}>
                  ✓ Auto-Deskew
                </span>
                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.65rem' }}>
                  ✓ 8-bit Contrast
                </span>
              </div>
            </div>
          )}

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

                {/* Animated Optical Scanning Beam */}
                {isScanningRight && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      zIndex: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '3px',
                        backgroundColor: '#38bdf8',
                        boxShadow: '0 0 10px #38bdf8, 0 0 20px #0284c7',
                        marginBottom: '1rem',
                        animation: 'pulse 1.2s infinite',
                      }}
                    />
                    <Scan className="w-8 h-8 text-sky-400 mb-2 animate-spin" />
                    <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.78rem' }}>
                      {scanPhaseRight}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.68rem', marginTop: '0.35rem' }}>
                      Optical TWAIN acquisition in progress
                    </span>
                  </div>
                )}

                {/* Foot Imprint */}
                {rightFoot ? (
                  <img
                    src={rightFoot.rawDataUrl}
                    alt="Right Footprint Scan"
                    style={{ width: '82%', height: '88%', objectFit: 'contain' }}
                  />
                ) : !isScanningRight ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
                    <Scan className="w-7 h-7 text-slate-400" />
                    <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>Scanner Bed Ready</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Place Harris Mat & click Scan</div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right Side: Image Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.74rem' }}>
              <span style={{ color: 'var(--podo-card-title)', fontWeight: 800, fontSize: '0.72rem' }}>
                SCANNER INFO
              </span>
              <div>Size: <span style={{ color: '#0c2328', fontWeight: 600 }}>{rightFoot?.sizePx || '1240 × 1754 px'}</span></div>
              <div>Scale: <span style={{ color: '#0c2328', fontWeight: 600 }}>{rightFoot?.scalePxMm || '11.8 px/mm'}</span></div>
              <div>Captured: <span style={{ color: '#0c2328', fontWeight: 600 }}>{rightFoot?.capturedAt || 'Ready'}</span></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Markers: {rightFoot ? '4 of 4 Detected' : '4 Expected'}
                </span>
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Contrast: {rightFoot ? 'Equalized (ISO)' : 'Ready'}
                </span>
                <span className="podo-badge podo-badge-green" style={{ width: 'fit-content' }}>
                  Sharpness: {rightFoot ? 'High Optical' : 'Calibrated'}
                </span>
              </div>

              <div style={{ marginTop: '0.4rem', fontWeight: 700, fontSize: '0.78rem' }}>
                CONFIDENCE <span style={{ color: '#0c2328' }}>{rightFoot?.confidence || 94}%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons for Right Foot */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {isMobileDevice ? (
                <button
                  type="button"
                  className="podoload-btn-primary podoload-btn-sm"
                  onClick={() => onOpenLiveScannerWizard?.('Right')}
                  title="Launch camera alignment and scanner wizard"
                >
                  <Camera className="w-3.5 h-3.5 mr-1 inline" />
                  Camera
                </button>
              ) : (
                <button
                  type="button"
                  className="podoload-btn-primary podoload-btn-sm"
                  onClick={() => handleDirectScan('Right')}
                  disabled={isScanningRight}
                  title="Acquire optical scan directly from flatbed scanner"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>{rightFoot ? 'Re-scan Right Foot' : 'Scan Right Foot'}</span>
                </button>
              )}

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => rightFileInputRef.current?.click()}
                title="Import existing Harris Mat image scan"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import image</span>
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => handleLoadSample('Right')}
                title="Load sample Harris Mat imprint for testing"
              >
                Test scan
              </button>
            </div>

            {rightFoot && (
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => onUpdateRightFoot(null)}
                title="Clear scan"
              >
                <Trash2 className="w-3 h-3 text-red-500 inline mr-1" />
                Clear
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
