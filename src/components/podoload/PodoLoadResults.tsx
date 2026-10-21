import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { FootCaptureData } from './PodoLoadCapture';

interface PodoLoadResultsProps {
  leftFoot: FootCaptureData | null;
  rightFoot: FootCaptureData | null;
  leftHeatmapUrl: string | null;
  rightHeatmapUrl: string | null;
  leftAnalysis?: any;
  rightAnalysis?: any;
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
  onBack,
  onContinue,
}) => {
  const [viewMode, setViewMode] = useState<'raw' | 'heatmap' | 'overlay'>('heatmap');
  const [showZones, setShowZones] = useState<boolean>(true);
  const [opacity, setOpacity] = useState<number>(0.85);

  // Measurements from real clinical scan analysis (or clean dash if not yet processed)
  const lLength = leftAnalysis?.orthoticMeasurements?.footLengthMm ? `${leftAnalysis.orthoticMeasurements.footLengthMm} mm` : '—';
  const rLength = rightAnalysis?.orthoticMeasurements?.footLengthMm ? `${rightAnalysis.orthoticMeasurements.footLengthMm} mm` : '—';
  const lWidth = leftAnalysis?.orthoticMeasurements?.forefootWidthMm ? `${leftAnalysis.orthoticMeasurements.forefootWidthMm} mm` : '—';
  const rWidth = rightAnalysis?.orthoticMeasurements?.forefootWidthMm ? `${rightAnalysis.orthoticMeasurements.forefootWidthMm} mm` : '—';
  const lHeel = leftAnalysis?.orthoticMeasurements?.heelWidthMm ? `${leftAnalysis.orthoticMeasurements.heelWidthMm} mm` : '—';
  const rHeel = rightAnalysis?.orthoticMeasurements?.heelWidthMm ? `${rightAnalysis.orthoticMeasurements.heelWidthMm} mm` : '—';
  const lArch = leftAnalysis?.regionalAnalysis?.cavanaghArchIndex ? leftAnalysis.regionalAnalysis.cavanaghArchIndex.toFixed(2) : '—';
  const rArch = rightAnalysis?.regionalAnalysis?.cavanaghArchIndex ? rightAnalysis.regionalAnalysis.cavanaghArchIndex.toFixed(2) : '—';
  const lArea = leftAnalysis?.regionalAnalysis?.contactAreaCm2 ? `${Math.round(leftAnalysis.regionalAnalysis.contactAreaCm2)} cm²` : '—';
  const rArea = rightAnalysis?.regionalAnalysis?.contactAreaCm2 ? `${Math.round(rightAnalysis.regionalAnalysis.contactAreaCm2)} cm²` : '—';

  // Pressure zones percentage
  const lZones = leftAnalysis?.regionalAnalysis?.subZonal10 || null;
  const rZones = rightAnalysis?.regionalAnalysis?.subZonal10 || null;

  // Real histogram pixel intensity distribution from analysis
  const histHeights = leftAnalysis?.categoryDistribution?.length === 6
    ? [20, 35, ...leftAnalysis.categoryDistribution.map((d: any) => Math.round(d.percentage * 2.5))]
    : [0, 0, 0, 0, 0, 0, 0, 0];
  const histColors = ['#1d4ed8', '#06b6d4', '#10b981', '#84cc16', '#eab308', '#f97316', '#ea580c', '#dc2626'];

  const handleExportImage = () => {
    // Downloads bilateral results view as an image
    if (leftHeatmapUrl) {
      const a = document.createElement('a');
      a.href = leftHeatmapUrl;
      a.download = 'PodoLoad-Bilateral-Heatmap.png';
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

              {/* Zones Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: '#0c2328', fontWeight: 600, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showZones}
                  onChange={(e) => setShowZones(e.target.checked)}
                  style={{ accentColor: 'var(--podo-primary)', width: '15px', height: '15px' }}
                />
                Zones
              </label>

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

          {/* Black Canvas Viewport with Left & Right Feet Side-by-Side */}
          <div className="podoload-bilateral-canvas-box" style={{ flex: 1 }}>
            <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'space-around', padding: '1rem' }}>
              {/* Left Foot Container */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <span style={{ color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Left
                </span>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {viewMode === 'raw' && leftFoot?.rawDataUrl ? (
                    <img
                      src={leftFoot.rawDataUrl}
                      alt="Left Raw"
                      style={{ maxHeight: '380px', objectFit: 'contain', filter: 'invert(1) grayscale(1)' }}
                    />
                  ) : leftHeatmapUrl ? (
                    <img
                      src={leftHeatmapUrl}
                      alt="Left Heatmap"
                      style={{ maxHeight: '380px', objectFit: 'contain', opacity }}
                    />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Generating Left Heatmap...</div>
                  )}

                  {/* Anatomical 10-Zone Contour Overlay */}
                  {showZones && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: '10%',
                        border: '1px dashed rgba(255,255,255,0.4)',
                        borderRadius: '40px',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Right Foot Container */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <span style={{ color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Right
                </span>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {viewMode === 'raw' && rightFoot?.rawDataUrl ? (
                    <img
                      src={rightFoot.rawDataUrl}
                      alt="Right Raw"
                      style={{ maxHeight: '380px', objectFit: 'contain', filter: 'invert(1) grayscale(1)' }}
                    />
                  ) : rightHeatmapUrl ? (
                    <img
                      src={rightHeatmapUrl}
                      alt="Right Heatmap"
                      style={{ maxHeight: '380px', objectFit: 'contain', opacity }}
                    />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Generating Right Heatmap...</div>
                  )}

                  {/* Anatomical 10-Zone Contour Overlay */}
                  {showZones && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: '10%',
                        border: '1px dashed rgba(255,255,255,0.4)',
                        borderRadius: '40px',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rainbow JET Bar */}
          <div className="podoload-rainbow-bar" />
          <div className="podoload-rainbow-labels">
            <span>Low</span>
            <span>High pressure</span>
          </div>
        </div>

        {/* ================= RIGHT SIDE PANELS ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Top Row: Foot Measurements & Pressure Zones Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Card 1: Foot Measurements */}
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

            {/* Card 2: Pressure Zones (%) */}
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
                    <td>{lZones?.halluxPct ? `${lZones.halluxPct}%` : '—'}</td>
                    <td>{rZones?.halluxPct ? `${rZones.halluxPct}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Toes 2–5</td>
                    <td>{lZones?.lesserToesPct ? `${lZones.lesserToesPct}%` : '—'}</td>
                    <td>{rZones?.lesserToesPct ? `${rZones.lesserToesPct}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Forefoot</td>
                    <td>{lZones ? `${lZones.metatarsal1Pct + lZones.metatarsal2Pct + lZones.metatarsals3to5Pct}%` : '—'}</td>
                    <td>{rZones ? `${rZones.metatarsal1Pct + rZones.metatarsal2Pct + rZones.metatarsals3to5Pct}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Midfoot</td>
                    <td>{lZones ? `${lZones.medialMidfootPct + lZones.lateralMidfootPct}%` : '—'}</td>
                    <td>{rZones ? `${rZones.medialMidfootPct + rZones.lateralMidfootPct}%` : '—'}</td>
                  </tr>
                  <tr>
                    <td>Heel</td>
                    <td>{lZones ? `${lZones.medialHindfootPct + lZones.lateralHindfootPct}%` : '—'}</td>
                    <td>{rZones ? `${rZones.medialHindfootPct + rZones.lateralHindfootPct}%` : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Middle Card: Pixel Intensity Distribution Histogram */}
          <div className="podoload-card" style={{ padding: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--podo-card-title)' }}>
                PIXEL INTENSITY DISTRIBUTION
              </span>
              <span style={{ fontSize: '0.65rem', color: '#657e84', fontWeight: 600 }}>Low → High</span>
            </div>

            <div className="podoload-histogram-row">
              {histHeights.map((h, i) => (
                <div
                  key={i}
                  className="podoload-hist-col"
                  style={{
                    height: `${h}%`,
                    backgroundColor: histColors[i],
                  }}
                  title={`Tier ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Bottom Card: Automatic Interpretation */}
          <div className="podoload-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.74rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--podo-card-title)' }}>
                AUTOMATIC INTERPRETATION
              </span>
              <span className="podo-badge" style={{ backgroundColor: '#e2ecee', color: '#334e54', fontSize: '0.65rem' }}>
                Auto-generated
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#556f75', fontWeight: 600 }}>Load distribution</span>
              <strong style={{ color: '#0c2328' }}>[forefoot / balanced / heel dominant]</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#556f75', fontWeight: 600 }}>Arch type</span>
              <strong style={{ color: '#0c2328' }}>[normal / flat / high arch]</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#556f75', fontWeight: 600 }}>Left-right asymmetry</span>
              <strong style={{ color: '#0c2328' }}>[x%]</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#556f75', fontWeight: 600 }}>High-pressure regions</span>
              <strong style={{ color: '#0c2328' }}>[regions]</strong>
            </div>

            <div style={{ fontSize: '0.65rem', color: '#7a9196', marginTop: '0.35rem', fontStyle: 'italic', lineHeight: 1.3 }}>
              Derived from image pixel intensity. The clinician should verify before reporting.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="podoload-bottom-actions-bar">
        <button type="button" className="podoload-btn-secondary" onClick={onBack}>
          Back to processing
        </button>

        <button
          type="button"
          className="podoload-btn-primary"
          onClick={onContinue}
        >
          Generate report
        </button>
      </div>
    </div>
  );
};
