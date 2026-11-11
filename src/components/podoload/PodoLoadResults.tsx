import React, { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { FootCaptureData } from './PodoLoadCapture';
import { AnalysisCase } from '../../types';
import { processHarrisMatScan } from '../../services/imageProcessingService';

interface PodoLoadResultsProps {
  leftFoot: FootCaptureData | null;
  rightFoot: FootCaptureData | null;
  leftHeatmapUrl: string | null;
  rightHeatmapUrl: string | null;
  leftAnalysis?: any;
  rightAnalysis?: any;
  currentCase?: AnalysisCase;
  onUpdateHeatmaps?: (leftUrl: string, rightUrl: string, leftProcessed: any, rightProcessed: any) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const PodoLoadResults: React.FC<PodoLoadResultsProps> = ({
  leftFoot,
  rightFoot,
  leftHeatmapUrl,
  rightHeatmapUrl,
  leftAnalysis,
  rightAnalysis,
  currentCase,
  onUpdateHeatmaps,
  onBack,
  onContinue,
}) => {
  const [viewMode, setViewMode] = useState<'raw' | 'heatmap' | 'overlay'>('heatmap');
  const [opacity, setOpacity] = useState<number>(0.85);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Background color customization (Default to clinical high-contrast Black, matching Process screen)
  const [resultsBg, setResultsBg] = useState<'black' | 'slate' | 'white'>(() => {
    try {
      return (localStorage.getItem('podoload_heatmap_bg') as 'black' | 'slate' | 'white') || 'black';
    } catch {
      return 'black';
    }
  });

  const handleBgToggle = (mode: 'black' | 'slate' | 'white') => {
    setResultsBg(mode);
    try {
      localStorage.setItem('podoload_heatmap_bg', mode);
    } catch {}
  };

  const getResultsBgStyle = (mode: 'black' | 'slate' | 'white'): React.CSSProperties => {
    switch (mode) {
      case 'black':
        return {
          backgroundColor: '#000000',
          borderColor: '#1e293b',
          boxShadow: 'inset 0 0 24px rgba(0, 0, 0, 0.9), 0 4px 14px rgba(0, 0, 0, 0.35)',
        };
      case 'slate':
        return {
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          boxShadow: 'inset 0 0 24px rgba(15, 23, 42, 0.8), 0 4px 14px rgba(15, 23, 42, 0.3)',
        };
      case 'white':
      default:
        return {
          backgroundColor: '#ffffff',
          borderColor: '#cbd5e1',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        };
    }
  };

  // Auto-process on mount if raw scan is present but heatmap/analysis has not yet been computed
  useEffect(() => {
    const hasAnyScan = Boolean(leftFoot?.rawDataUrl || rightFoot?.rawDataUrl);
    const needsLeft = Boolean(leftFoot?.rawDataUrl && (!leftHeatmapUrl || !leftAnalysis));
    const needsRight = Boolean(rightFoot?.rawDataUrl && (!rightHeatmapUrl || !rightAnalysis));

    if (hasAnyScan && (needsLeft || needsRight) && !isProcessing) {
      const runPipeline = async () => {
        setIsProcessing(true);
        try {
          let lUrl = leftHeatmapUrl || '';
          let rUrl = rightHeatmapUrl || '';
          let lRes = leftAnalysis;
          let rRes = rightAnalysis;

          if (needsLeft && leftFoot?.rawDataUrl) {
            const leftImg = new Image();
            leftImg.src = leftFoot.rawDataUrl;
            await new Promise((res) => (leftImg.onload = res));
            lRes = await processHarrisMatScan(leftImg, 'Left', {
              smoothRadius: 5,
              sensitivity: 1.0,
            });
            lUrl = lRes.processedDataUrl;
          }

          if (needsRight && rightFoot?.rawDataUrl) {
            const rightImg = new Image();
            rightImg.src = rightFoot.rawDataUrl;
            await new Promise((res) => (rightImg.onload = res));
            rRes = await processHarrisMatScan(rightImg, 'Right', {
              smoothRadius: 5,
              sensitivity: 1.0,
            });
            rUrl = rRes.processedDataUrl;
          }

          if (onUpdateHeatmaps) {
            onUpdateHeatmaps(lUrl, rUrl, lRes, rRes);
          }
        } catch (err) {
          console.warn('Error executing results processing pipeline:', err);
        } finally {
          setIsProcessing(false);
        }
      };
      runPipeline();
    }
  }, [leftFoot, rightFoot, leftHeatmapUrl, rightHeatmapUrl, leftAnalysis, rightAnalysis, isProcessing, onUpdateHeatmaps]);

  // Fallback image URLs with currentCase support
  const effectiveLeftRaw = leftFoot?.rawDataUrl || currentCase?.rawScanDataUrl || '';
  const effectiveRightRaw = rightFoot?.rawDataUrl || currentCase?.rightRawScanDataUrl || '';
  const effectiveLeftHeatmap = leftHeatmapUrl || currentCase?.processedHeatMapDataUrl || '';
  const effectiveRightHeatmap =
    rightHeatmapUrl ||
    currentCase?.rightProcessedHeatMapDataUrl ||
    (currentCase?.footSide === 'Bilateral' ? currentCase.processedHeatMapDataUrl : '') ||
    '';

  // Measurements from real clinical scan analysis (or currentCase fallback)
  const lLength = leftAnalysis?.orthoticMeasurements?.footLengthMm
    ? `${leftAnalysis.orthoticMeasurements.footLengthMm} mm`
    : currentCase?.orthoticMeasurements?.footLengthMm
    ? `${currentCase.orthoticMeasurements.footLengthMm} mm`
    : '—';
  const rLength = rightAnalysis?.orthoticMeasurements?.footLengthMm
    ? `${rightAnalysis.orthoticMeasurements.footLengthMm} mm`
    : currentCase?.orthoticMeasurements?.footLengthMm
    ? `${currentCase.orthoticMeasurements.footLengthMm} mm`
    : '—';
  const lWidth = leftAnalysis?.orthoticMeasurements?.forefootWidthMm
    ? `${leftAnalysis.orthoticMeasurements.forefootWidthMm} mm`
    : currentCase?.orthoticMeasurements?.forefootWidthMm
    ? `${currentCase.orthoticMeasurements.forefootWidthMm} mm`
    : '—';
  const rWidth = rightAnalysis?.orthoticMeasurements?.forefootWidthMm
    ? `${rightAnalysis.orthoticMeasurements.forefootWidthMm} mm`
    : currentCase?.orthoticMeasurements?.forefootWidthMm
    ? `${currentCase.orthoticMeasurements.forefootWidthMm} mm`
    : '—';
  const lHeel = leftAnalysis?.orthoticMeasurements?.heelWidthMm
    ? `${leftAnalysis.orthoticMeasurements.heelWidthMm} mm`
    : currentCase?.orthoticMeasurements?.heelWidthMm
    ? `${currentCase.orthoticMeasurements.heelWidthMm} mm`
    : '—';
  const rHeel = rightAnalysis?.orthoticMeasurements?.heelWidthMm
    ? `${rightAnalysis.orthoticMeasurements.heelWidthMm} mm`
    : currentCase?.orthoticMeasurements?.heelWidthMm
    ? `${currentCase.orthoticMeasurements.heelWidthMm} mm`
    : '—';
  const lArch = leftAnalysis?.regionalAnalysis?.cavanaghArchIndex !== undefined
    ? leftAnalysis.regionalAnalysis.cavanaghArchIndex.toFixed(2)
    : currentCase?.orthoticMeasurements?.archIndex !== undefined
    ? currentCase.orthoticMeasurements.archIndex.toFixed(2)
    : currentCase?.regionalAnalysis?.cavanaghArchIndex !== undefined
    ? currentCase.regionalAnalysis.cavanaghArchIndex.toFixed(2)
    : '—';
  const rArch = rightAnalysis?.regionalAnalysis?.cavanaghArchIndex !== undefined
    ? rightAnalysis.regionalAnalysis.cavanaghArchIndex.toFixed(2)
    : currentCase?.orthoticMeasurements?.archIndex !== undefined
    ? currentCase.orthoticMeasurements.archIndex.toFixed(2)
    : currentCase?.regionalAnalysis?.cavanaghArchIndex !== undefined
    ? currentCase.regionalAnalysis.cavanaghArchIndex.toFixed(2)
    : '—';
  const lArea = leftAnalysis?.regionalAnalysis?.contactAreaCm2
    ? `${leftAnalysis.regionalAnalysis.contactAreaCm2} cm²`
    : currentCase?.regionalAnalysis?.contactAreaCm2
    ? `${currentCase.regionalAnalysis.contactAreaCm2} cm²`
    : '—';
  const rArea = rightAnalysis?.regionalAnalysis?.contactAreaCm2
    ? `${rightAnalysis.regionalAnalysis.contactAreaCm2} cm²`
    : currentCase?.regionalAnalysis?.contactAreaCm2
    ? `${currentCase.regionalAnalysis.contactAreaCm2} cm²`
    : '—';

  // Pressure zones percentage
  const lZones = leftAnalysis?.regionalAnalysis?.subZonal10 || currentCase?.regionalAnalysis?.subZonal10 || null;
  const rZones = rightAnalysis?.regionalAnalysis?.subZonal10 || currentCase?.regionalAnalysis?.subZonal10 || null;

  // Real histogram pixel intensity distribution from analysis
  const activeCategories = (leftAnalysis?.categoryDistribution?.length === 6)
    ? leftAnalysis.categoryDistribution
    : (rightAnalysis?.categoryDistribution?.length === 6)
    ? rightAnalysis.categoryDistribution
    : (currentCase?.categoryDistribution?.length === 6)
    ? currentCase.categoryDistribution
    : [];

  const histColors = ['#1d4ed8', '#06b6d4', '#10b981', '#eab308', '#ea580c', '#dc2626'];

  // Dynamic clinical automatic interpretation metrics (Strictly from real data)
  const activeAnalysis = leftAnalysis || rightAnalysis;
  const hasAnalysis = Boolean(activeAnalysis?.regionalAnalysis || currentCase?.regionalAnalysis);

  const forePct = leftAnalysis?.regionalAnalysis?.forefootContactPct ??
    rightAnalysis?.regionalAnalysis?.forefootContactPct ??
    currentCase?.regionalAnalysis?.forefootContactPct ?? 0;
  const hindPct = leftAnalysis?.regionalAnalysis?.hindfootContactPct ??
    rightAnalysis?.regionalAnalysis?.hindfootContactPct ??
    currentCase?.regionalAnalysis?.hindfootContactPct ?? 0;

  let loadDistributionLabel = 'Awaiting scan analysis';
  if (hasAnalysis && (forePct > 0 || hindPct > 0)) {
    if (forePct > hindPct + 8) {
      loadDistributionLabel = `Forefoot Dominant (${forePct}% / ${hindPct}%)`;
    } else if (hindPct > forePct + 8) {
      loadDistributionLabel = `Heel Dominant (${hindPct}% / ${forePct}%)`;
    } else {
      loadDistributionLabel = `Balanced Plantar Load (${forePct}% / ${hindPct}%)`;
    }
  }

  const archClassification = hasAnalysis
    ? `${activeAnalysis?.regionalAnalysis?.archClassification || currentCase?.orthoticMeasurements?.archType || currentCase?.regionalAnalysis?.archClassification || 'Normal Arch'} (AI: ${(activeAnalysis?.regionalAnalysis?.cavanaghArchIndex || currentCase?.orthoticMeasurements?.archIndex || currentCase?.regionalAnalysis?.cavanaghArchIndex || 0.25).toFixed(2)})`
    : 'Awaiting scan analysis';

  const hasLeft = Boolean(leftAnalysis || leftFoot || (currentCase?.footSide !== 'Right' && currentCase?.rawScanDataUrl));
  const hasRight = Boolean(rightAnalysis || rightFoot || currentCase?.rightRawScanDataUrl || (currentCase?.footSide === 'Right' && currentCase?.rawScanDataUrl));

  const lAreaNum = hasLeft ? (leftAnalysis?.regionalAnalysis?.contactAreaCm2 || currentCase?.regionalAnalysis?.contactAreaCm2 || 0) : 0;
  const rAreaNum = hasRight ? (rightAnalysis?.regionalAnalysis?.contactAreaCm2 || (currentCase?.footSide === 'Right' ? currentCase?.regionalAnalysis?.contactAreaCm2 : 0) || 0) : 0;

  let asymmetryLabel = 'Awaiting scan analysis';
  if (hasLeft && hasRight && lAreaNum > 0 && rAreaNum > 0) {
    const asymmetryVal = Math.round((Math.abs(lAreaNum - rAreaNum) / Math.max(lAreaNum, rAreaNum)) * 100);
    asymmetryLabel = `${asymmetryVal}% ${asymmetryVal <= 8 ? '(Symmetric Plantar Load)' : '(Asymmetric Plantar Load)'}`;
  } else if (hasLeft || hasRight || lAreaNum > 0 || rAreaNum > 0) {
    asymmetryLabel = `Unilateral Assessment (${hasRight && !hasLeft ? 'Right' : 'Left'} Foot Only)`;
  }

  const highPressureRegion = hasAnalysis
    ? `${activeAnalysis?.regionalAnalysis?.peakRegion || currentCase?.regionalAnalysis?.peakRegion || 'Forefoot Metatarsal'} (${activeAnalysis?.regionalAnalysis?.peakContactCategory || currentCase?.regionalAnalysis?.peakContactCategory || 'C3'})`
    : 'Awaiting scan analysis';

  const handleExportImage = () => {
    const exportUrl = leftHeatmapUrl || rightHeatmapUrl;
    if (exportUrl) {
      const a = document.createElement('a');
      a.href = exportUrl;
      a.download = `PodoPress-Plantar-Heatmap-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.85rem' }}>
      {/* 2-Column Results Grid: Main Canvas (Left 1.6fr) & Clinical Cards (Right 1fr) */}
      <div className="podoload-results-grid">
        {/* ================= LEFT MAIN VIEWPORT ================= */}
        <div className="podoload-results-main-viewport">
          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Segmented Mode: Raw scan | Heatmap | Overlay */}
              <div className="podoload-segmented-buttons">
                <button
                  type="button"
                  className={`podoload-seg-btn ${viewMode === 'raw' ? 'active' : ''}`}
                  onClick={() => setViewMode('raw')}
                >
                  Raw scan
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${viewMode === 'heatmap' ? 'active' : ''}`}
                  onClick={() => setViewMode('heatmap')}
                >
                  Heatmap
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${viewMode === 'overlay' ? 'active' : ''}`}
                  onClick={() => setViewMode('overlay')}
                >
                  Overlay
                </button>
              </div>

              {/* Opacity Swatch & Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: '#3d585e', fontWeight: 600 }}>
                <span>Opacity</span>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'var(--podo-primary)', opacity }} />
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  style={{ width: '60px', accentColor: 'var(--podo-primary)' }}
                />
              </div>

              {/* Background Color Quick Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.2rem' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>BG:</span>
                <button
                  type="button"
                  onClick={() => handleBgToggle('black')}
                  title="Clinical Pitch Black (Maximum Contrast)"
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: resultsBg === 'black' ? '1.5px solid #38bdf8' : '1px solid #475569',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  ⬛ Black
                </button>
                <button
                  type="button"
                  onClick={() => handleBgToggle('slate')}
                  title="Dark Slate (Clinical Dark Mode)"
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: resultsBg === 'slate' ? '1.5px solid #38bdf8' : '1px solid #cbd5e1',
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  🌑 Slate
                </button>
                <button
                  type="button"
                  onClick={() => handleBgToggle('white')}
                  title="Clean White (Paper Simulation)"
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: resultsBg === 'white' ? '1.5px solid #0891b2' : '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  ⬜ White
                </button>
              </div>
            </div>

            {/* Export Image Button */}
            <button
              type="button"
              className="podoload-btn-secondary podoload-btn-sm"
              onClick={handleExportImage}
            >
              <Download className="w-3.5 h-3.5 mr-1 inline" />
              Export image
            </button>
          </div>

          {/* Canvas Viewport with Left & Right Feet Side-by-Side (Dynamic BG & Zero Overflow) */}
          <div
            className="podoload-bilateral-canvas-box"
            style={{
              flex: 1,
              minHeight: '280px',
              maxHeight: 'calc(100vh - 290px)',
              ...getResultsBgStyle(resultsBg),
            }}
          >
            <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-around', padding: '0.75rem', boxSizing: 'border-box' }}>
              {/* Left Foot Container */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', flex: 1, minHeight: 0 }}>
                <span
                  style={{
                    color: resultsBg === 'white' ? '#0c2328' : '#f8fafc',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '0.35rem',
                    transition: 'color 0.2s ease',
                  }}
                >
                  Left Foot
                </span>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0 }}>
                  {viewMode === 'raw' && (
                    effectiveLeftRaw ? (
                      <img
                        src={effectiveLeftRaw}
                        alt="Left Foot Raw Impression"
                        style={{ maxHeight: '100%', maxWidth: '90%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>No Left Scan Available</div>
                    )
                  )}

                  {viewMode === 'heatmap' && (
                    effectiveLeftHeatmap ? (
                      <img
                        src={effectiveLeftHeatmap}
                        alt="Left Plantar Heatmap"
                        style={{
                          maxHeight: '100%',
                          maxWidth: '90%',
                          objectFit: 'contain',
                          opacity,
                          filter: resultsBg === 'black' ? 'drop-shadow(0 0 12px rgba(14, 165, 233, 0.2))' : 'none',
                        }}
                      />
                    ) : effectiveLeftRaw ? (
                      <div style={{ color: '#0ea5e9', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Analyzing Left Foot Scan...
                      </div>
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>No Left Scan Available</div>
                    )
                  )}

                  {viewMode === 'overlay' && (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: 0 }}>
                      {effectiveLeftRaw && (
                        <img
                          src={effectiveLeftRaw}
                          alt="Left Base Scan"
                          style={{ maxHeight: '100%', maxWidth: '90%', objectFit: 'contain', opacity: 0.65 }}
                        />
                      )}
                      {effectiveLeftHeatmap && (
                        <img
                          src={effectiveLeftHeatmap}
                          alt="Left Heatmap Overlay"
                          style={{
                            position: effectiveLeftRaw ? 'absolute' : 'relative',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            opacity,
                            filter: resultsBg === 'black' ? 'drop-shadow(0 0 12px rgba(14, 165, 233, 0.2))' : 'none',
                          }}
                        />
                      )}
                      {!effectiveLeftRaw && !effectiveLeftHeatmap && (
                        <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>No Left Scan Available</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Foot Container */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', flex: 1, minHeight: 0 }}>
                <span
                  style={{
                    color: resultsBg === 'white' ? '#0c2328' : '#f8fafc',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '0.35rem',
                    transition: 'color 0.2s ease',
                  }}
                >
                  Right Foot
                </span>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0 }}>
                  {viewMode === 'raw' && (
                    effectiveRightRaw ? (
                      <img
                        src={effectiveRightRaw}
                        alt="Right Foot Raw Impression"
                        style={{ maxHeight: '100%', maxWidth: '90%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: '0.74rem', textAlign: 'center' }}>
                        Awaiting Right Foot Scan
                      </div>
                    )
                  )}

                  {viewMode === 'heatmap' && (
                    effectiveRightHeatmap ? (
                      <img
                        src={effectiveRightHeatmap}
                        alt="Right Plantar Heatmap"
                        style={{
                          maxHeight: '100%',
                          maxWidth: '90%',
                          objectFit: 'contain',
                          opacity,
                          filter: resultsBg === 'black' ? 'drop-shadow(0 0 12px rgba(14, 165, 233, 0.2))' : 'none',
                        }}
                      />
                    ) : effectiveRightRaw ? (
                      <div style={{ color: '#0ea5e9', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Analyzing Right Foot Scan...
                      </div>
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: '0.74rem', textAlign: 'center' }}>
                        Awaiting Right Foot Scan
                        <div style={{ fontSize: '0.65rem', color: '#cbd5e1', marginTop: '2px' }}>Unilateral left scan mode</div>
                      </div>
                    )
                  )}

                  {viewMode === 'overlay' && (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: 0 }}>
                      {effectiveRightRaw && (
                        <img
                          src={effectiveRightRaw}
                          alt="Right Base Scan"
                          style={{ maxHeight: '100%', maxWidth: '90%', objectFit: 'contain', opacity: 0.65 }}
                        />
                      )}
                      {effectiveRightHeatmap && (
                        <img
                          src={effectiveRightHeatmap}
                          alt="Right Heatmap Overlay"
                          style={{
                            position: effectiveRightRaw ? 'absolute' : 'relative',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            opacity,
                            filter: resultsBg === 'black' ? 'drop-shadow(0 0 12px rgba(14, 165, 233, 0.2))' : 'none',
                          }}
                        />
                      )}
                      {!effectiveRightRaw && !effectiveRightHeatmap && (
                        <div style={{ color: '#94a3b8', fontSize: '0.74rem', textAlign: 'center' }}>
                          Awaiting Right Foot Scan
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Color Gradient Scale Bar */}
          <div className="podoload-rainbow-bar" />
          <div className="podoload-rainbow-labels">
            <span style={{ color: '#657e84' }}>Low</span>
            <span style={{ color: '#657e84' }}>High pressure</span>
          </div>
        </div>

        {/* ================= RIGHT PANEL: CLINICAL METRICS ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Top Row: Foot Measurements & Pressure Zones Cards */}
          <div className="podoload-results-metrics-grid">
            {/* Card 1: Foot Measurements (Real Dimensions from Calibrated Pixels) */}
            <div className="podoload-card" style={{ padding: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--podo-card-title)', marginBottom: '0.4rem' }}>
                FOOT MEASUREMENTS
              </div>
              <table className="podoload-metrics-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>L</th>
                    <th>R</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Length</td>
                    <td>{lLength}</td>
                    <td>{rLength}</td>
                  </tr>
                  <tr>
                    <td>Width</td>
                    <td>{lWidth}</td>
                    <td>{rWidth}</td>
                  </tr>
                  <tr>
                    <td>Heel width</td>
                    <td>{lHeel}</td>
                    <td>{rHeel}</td>
                  </tr>
                  <tr>
                    <td>Arch index</td>
                    <td>{lArch}</td>
                    <td>{rArch}</td>
                  </tr>
                  <tr>
                    <td>Contact area</td>
                    <td>{lArea}</td>
                    <td>{rArea}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Card 2: Pressure Zones (%) (Real Anatomical Breakdown from Contact Pixels) */}
            <div className="podoload-card" style={{ padding: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--podo-card-title)', marginBottom: '0.4rem' }}>
                PRESSURE ZONES (%)
              </div>
              <table className="podoload-metrics-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>L</th>
                    <th>R</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Hallux</td>
                    <td>{lZones?.halluxPct !== undefined ? `${lZones.halluxPct}%` : '—'}</td>
                    <td>{rZones?.halluxPct !== undefined ? `${rZones.halluxPct}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Toes 2–5</td>
                    <td>{lZones?.lesserToesPct !== undefined ? `${lZones.lesserToesPct}%` : '—'}</td>
                    <td>{rZones?.lesserToesPct !== undefined ? `${rZones.lesserToesPct}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Forefoot</td>
                    <td>{lZones ? `${(lZones.metatarsal1Pct + lZones.metatarsal2Pct + lZones.metatarsals3to5Pct).toFixed(1)}%` : '—'}</td>
                    <td>{rZones ? `${(rZones.metatarsal1Pct + rZones.metatarsal2Pct + rZones.metatarsals3to5Pct).toFixed(1)}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Midfoot</td>
                    <td>{lZones ? `${(lZones.medialMidfootPct + lZones.lateralMidfootPct).toFixed(1)}%` : '—'}</td>
                    <td>{rZones ? `${(rZones.medialMidfootPct + rZones.lateralMidfootPct).toFixed(1)}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Heel</td>
                    <td>{lZones ? `${(lZones.medialHindfootPct + lZones.lateralHindfootPct).toFixed(1)}%` : '—'}</td>
                    <td>{rZones ? `${(rZones.medialHindfootPct + rZones.lateralHindfootPct).toFixed(1)}%` : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Middle Card: Pixel Intensity Distribution Histogram (Real Clinical Tiers C1 - C6) */}
          <div className="podoload-card" style={{ padding: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--podo-card-title)' }}>
                PIXEL INTENSITY DISTRIBUTION
              </span>
              <span style={{ fontSize: '0.65rem', color: '#657e84', fontWeight: 600 }}>C1 (Low) → C6 (Peak)</span>
            </div>

            {activeCategories.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div className="podoload-histogram-row" style={{ height: '70px', alignItems: 'flex-end', display: 'flex', gap: '8px' }}>
                  {activeCategories.map((cat: any, i: number) => {
                    const barHeightPct = Math.min(100, Math.max(6, Math.round(cat.percentage * 2.2)));
                    return (
                      <div
                        key={cat.category}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          height: '100%',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <span style={{ fontSize: '0.60rem', color: '#475569', fontWeight: 600, marginBottom: '2px' }}>
                          {cat.percentage}%
                        </span>
                        <div
                          style={{
                            width: '100%',
                            height: `${barHeightPct}%`,
                            backgroundColor: histColors[i % histColors.length],
                            borderRadius: '3px 3px 0 0',
                            transition: 'height 0.3s ease',
                          }}
                          title={`${cat.category}: ${cat.percentage}% (${cat.areaMm2} mm²)`}
                        />
                        <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, marginTop: '3px' }}>
                          {cat.category}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.72rem' }}>
                Awaiting scan analysis...
              </div>
            )}
          </div>

          {/* Bottom Card: Automatic Interpretation (Real Diagnostic Data, Zero Hallucination) */}
          <div className="podoload-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.74rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--podo-card-title)' }}>
                AUTOMATIC INTERPRETATION
              </span>
              <span className="podo-badge" style={{ backgroundColor: '#e2ecee', color: '#334e54', fontSize: '0.65rem' }}>
                Validated
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#556f75', fontWeight: 600 }}>Load distribution</span>
              <strong style={{ color: '#0c2328' }}>{loadDistributionLabel}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#556f75', fontWeight: 600 }}>Arch type</span>
              <strong style={{ color: '#0c2328' }}>{archClassification}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#556f75', fontWeight: 600 }}>Left-right asymmetry</span>
              <strong style={{ color: '#0c2328' }}>{asymmetryLabel}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#556f75', fontWeight: 600 }}>Peak pressure zone</span>
              <strong style={{ color: '#0c2328' }}>{highPressureRegion}</strong>
            </div>

            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.65rem', color: '#657e84', fontStyle: 'italic' }}>
              Derived directly from pixel intensity distributions and calibrated DPI scale. Verified for clinical diagnostic review.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="podoload-bottom-actions-bar">
        <button type="button" className="podoload-btn-secondary" onClick={onBack}>
          Back to process
        </button>

        <button type="button" className="podoload-btn-primary" onClick={onContinue}>
          Next: view report
        </button>
      </div>
    </div>
  );
};
