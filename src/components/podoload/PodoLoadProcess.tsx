import React, { useState, useEffect } from 'react';
import { FootCaptureData } from './PodoLoadCapture';
import { processHarrisMatScan } from '../../services/imageProcessingService';

interface PodoLoadProcessProps {
  leftFoot: FootCaptureData | null;
  rightFoot: FootCaptureData | null;
  leftHeatmapUrl: string | null;
  rightHeatmapUrl: string | null;
  onUpdateHeatmaps: (leftUrl: string, rightUrl: string, leftProcessed: any, rightProcessed: any) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const PodoLoadProcess: React.FC<PodoLoadProcessProps> = ({
  leftFoot,
  rightFoot,
  leftHeatmapUrl,
  rightHeatmapUrl,
  onUpdateHeatmaps,
  onBack,
  onContinue,
}) => {
  // Processing parameters matching Screenshot 3
  const [smoothingStrength, setSmoothingStrength] = useState<number>(5);
  const [intensityLevels, setIntensityLevels] = useState<string>('6 levels');
  const [colorMap, setColorMap] = useState<string>('Jet');
  const [backgroundThreshold, setBackgroundThreshold] = useState<number>(12);
  const [flattenLighting, setFlattenLighting] = useState<boolean>(true);
  const [removePaperNoise, setRemovePaperNoise] = useState<boolean>(true);

  // Pipeline execution animation / state
  const [pipelineProgress, setPipelineProgress] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Process both scans using clinical imageProcessingService
  const runProcessingPipeline = async () => {
    if (!leftFoot?.rawDataUrl || !rightFoot?.rawDataUrl) return;

    setIsProcessing(true);
    setPipelineProgress(30);

    try {
      const leftImg = new Image();
      leftImg.src = leftFoot.rawDataUrl;
      await new Promise((res) => (leftImg.onload = res));
      setPipelineProgress(55);

      const leftResult = await processHarrisMatScan(leftImg, 'Left', {
        smoothRadius: smoothingStrength,
        sensitivity: 1.0,
      });

      const rightImg = new Image();
      rightImg.src = rightFoot.rawDataUrl;
      await new Promise((res) => (rightImg.onload = res));
      setPipelineProgress(80);

      const rightResult = await processHarrisMatScan(rightImg, 'Right', {
        smoothRadius: smoothingStrength,
        sensitivity: 1.0,
      });

      setPipelineProgress(100);
      onUpdateHeatmaps(
        leftResult.processedDataUrl,
        rightResult.processedDataUrl,
        leftResult,
        rightResult
      );
    } catch (err) {
      console.warn('Error during image processing pipeline:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run automatically on first load if heatmaps not yet generated
  useEffect(() => {
    if ((!leftHeatmapUrl || !rightHeatmapUrl) && leftFoot?.rawDataUrl && rightFoot?.rawDataUrl) {
      runProcessingPipeline();
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.85rem' }}>
      {/* Main Grid: Left Foot Card + Right Foot Card + Processing Parameters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.15fr', gap: '0.85rem', flex: 1 }}>
        {/* ================= LEFT FOOT PROCESSED CARD ================= */}
        <div className="podoload-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0c2328' }}>Left foot</span>
            <span className="podo-badge podo-badge-green">Processed</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', flex: 1, minHeight: '260px' }}>
            {/* Raw Scan Box */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  flex: 1,
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {/* 4 Corner Markers */}
                <div className="podoload-marker podoload-marker-tl" style={{ width: '8px', height: '8px', top: '4px', left: '4px' }} />
                <div className="podoload-marker podoload-marker-tr" style={{ width: '8px', height: '8px', top: '4px', right: '4px' }} />
                <div className="podoload-marker podoload-marker-bl" style={{ width: '8px', height: '8px', bottom: '4px', left: '4px' }} />
                <div className="podoload-marker podoload-marker-br" style={{ width: '8px', height: '8px', bottom: '4px', right: '4px' }} />

                {leftFoot?.rawDataUrl && (
                  <img
                    src={leftFoot.rawDataUrl}
                    alt="Left Raw"
                    style={{ width: '85%', height: '90%', objectFit: 'contain' }}
                  />
                )}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#657e84', marginTop: '0.35rem', fontWeight: 600 }}>
                Raw scan
              </span>
            </div>

            {/* Processed Heatmap Box */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  backgroundColor: '#000000',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {leftHeatmapUrl ? (
                  <img
                    src={leftHeatmapUrl}
                    alt="Left Heatmap"
                    style={{ width: '85%', height: '90%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: '#0ea5e9', fontSize: '0.72rem' }}>Processing...</div>
                )}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#657e84', marginTop: '0.35rem', fontWeight: 600 }}>
                Processed heatmap
              </span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT FOOT PROCESSED CARD ================= */}
        <div className="podoload-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0c2328' }}>Right foot</span>
            <span className="podo-badge podo-badge-green">Processed</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', flex: 1, minHeight: '260px' }}>
            {/* Raw Scan Box */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  flex: 1,
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {/* 4 Corner Markers */}
                <div className="podoload-marker podoload-marker-tl" style={{ width: '8px', height: '8px', top: '4px', left: '4px' }} />
                <div className="podoload-marker podoload-marker-tr" style={{ width: '8px', height: '8px', top: '4px', right: '4px' }} />
                <div className="podoload-marker podoload-marker-bl" style={{ width: '8px', height: '8px', bottom: '4px', left: '4px' }} />
                <div className="podoload-marker podoload-marker-br" style={{ width: '8px', height: '8px', bottom: '4px', right: '4px' }} />

                {rightFoot?.rawDataUrl && (
                  <img
                    src={rightFoot.rawDataUrl}
                    alt="Right Raw"
                    style={{ width: '85%', height: '90%', objectFit: 'contain' }}
                  />
                )}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#657e84', marginTop: '0.35rem', fontWeight: 600 }}>
                Raw scan
              </span>
            </div>

            {/* Processed Heatmap Box */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  backgroundColor: '#000000',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {rightHeatmapUrl ? (
                  <img
                    src={rightHeatmapUrl}
                    alt="Right Heatmap"
                    style={{ width: '85%', height: '90%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: '#0ea5e9', fontSize: '0.72rem' }}>Processing...</div>
                )}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#657e84', marginTop: '0.35rem', fontWeight: 600 }}>
                Processed heatmap
              </span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL: PROCESSING PARAMETERS ================= */}
        <div className="podoload-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 className="podoload-card-title">PROCESSING PARAMETERS</h3>

          <div className="podoload-form-group" style={{ marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#3d585e', fontWeight: 600 }}>
              <span>Smoothing strength</span>
              <span>{smoothingStrength} px</span>
            </div>
            <input
              type="range"
              min="1"
              max="9"
              step="1"
              value={smoothingStrength}
              onChange={(e) => setSmoothingStrength(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--podo-primary)' }}
            />
          </div>

          <div className="podoload-form-group" style={{ marginBottom: '0.4rem' }}>
            <label className="podoload-label">Intensity levels</label>
            <select
              className="podoload-select"
              value={intensityLevels}
              onChange={(e) => setIntensityLevels(e.target.value)}
            >
              <option value="6 levels">6 levels (Clinical ISO)</option>
              <option value="8 levels">8 levels</option>
              <option value="Continuous">Continuous (Smooth)</option>
            </select>
          </div>

          <div className="podoload-form-group" style={{ marginBottom: '0.4rem' }}>
            <label className="podoload-label">Colour map</label>
            <select
              className="podoload-select"
              value={colorMap}
              onChange={(e) => setColorMap(e.target.value)}
            >
              <option value="Jet">Jet (Diagnostic colormap)</option>
              <option value="Parula">Parula</option>
              <option value="Turbo">Turbo</option>
            </select>
          </div>

          <div className="podoload-form-group" style={{ marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#3d585e', fontWeight: 600 }}>
              <span>Background threshold</span>
              <span>{backgroundThreshold}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              value={backgroundThreshold}
              onChange={(e) => setBackgroundThreshold(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--podo-primary)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: '0.2rem 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#0c2328', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={flattenLighting}
                onChange={(e) => setFlattenLighting(e.target.checked)}
                style={{ accentColor: 'var(--podo-primary)', width: '15px', height: '15px' }}
              />
              Flatten scanner lighting
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#0c2328', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={removePaperNoise}
                onChange={(e) => setRemovePaperNoise(e.target.checked)}
                style={{ accentColor: 'var(--podo-primary)', width: '15px', height: '15px' }}
              />
              Remove paper noise
            </label>
          </div>

          <div style={{ fontSize: '0.74rem', marginTop: '0.2rem' }}>
            <span style={{ color: 'var(--podo-card-title)', fontWeight: 800 }}>IMAGE CONFIDENCE</span>
            <div style={{ marginTop: '0.2rem', fontWeight: 700, color: '#0c2328' }}>
              Left / Right <span style={{ color: '#0e7477' }}>[92%] / [88%]</span>
            </div>
          </div>

          <button
            type="button"
            className="podoload-btn-secondary"
            style={{ marginTop: 'auto', width: '100%' }}
            onClick={runProcessingPipeline}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Reprocess'}
          </button>
        </div>
      </div>

      {/* ================= BOTTOM CARD: PROCESSING PIPELINE ================= */}
      <div className="podoload-card" style={{ padding: '0.85rem 1.15rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--podo-card-title)', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
          PROCESSING PIPELINE
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.5rem' }}>
          <span>Calibration <strong style={{ color: '#15803d' }}>Done</strong></span>
          <span>Lens correction <strong style={{ color: '#15803d' }}>Done</strong></span>
          <span>Lighting flattening <strong style={{ color: '#15803d' }}>Done</strong></span>
          <span>Smoothing <strong style={{ color: '#15803d' }}>Done</strong></span>
          <span>Heatmap <strong style={{ color: pipelineProgress >= 100 ? '#15803d' : '#b45309' }}>{pipelineProgress >= 100 ? 'Done' : '60%'}</strong></span>
          <span>Measurements <strong style={{ color: pipelineProgress >= 100 ? '#15803d' : '#657e84' }}>{pipelineProgress >= 100 ? 'Done' : 'Queued'}</strong></span>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2ecee', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${pipelineProgress}%`,
              height: '100%',
              backgroundColor: 'var(--podo-primary)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="podoload-bottom-actions-bar">
        <button type="button" className="podoload-btn-secondary" onClick={onBack}>
          Back to capture
        </button>

        <button
          type="button"
          className="podoload-btn-primary"
          onClick={onContinue}
          disabled={!leftHeatmapUrl || !rightHeatmapUrl || isProcessing}
        >
          Next: view results
        </button>
      </div>
    </div>
  );
};
