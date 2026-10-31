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

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Process both scans (or single available foot) using clinical imageProcessingService
  const runProcessingPipeline = async () => {
    if (!leftFoot?.rawDataUrl && !rightFoot?.rawDataUrl) return;

    setIsProcessing(true);

    try {
      let leftResult: any = null;
      let rightResult: any = null;
      let leftUrl = leftHeatmapUrl || '';
      let rightUrl = rightHeatmapUrl || '';

      if (leftFoot?.rawDataUrl) {
        const leftImg = new Image();
        leftImg.src = leftFoot.rawDataUrl;
        await new Promise((res) => (leftImg.onload = res));

        leftResult = await processHarrisMatScan(leftImg, 'Left', {
          smoothRadius: smoothingStrength,
          intensityLevels,
          colorMap,
          backgroundThreshold,
          flattenLighting,
          removePaperNoise,
          sensitivity: 1.0,
        });
        leftUrl = leftResult.processedDataUrl;
      }

      if (rightFoot?.rawDataUrl) {
        const rightImg = new Image();
        rightImg.src = rightFoot.rawDataUrl;
        await new Promise((res) => (rightImg.onload = res));

        rightResult = await processHarrisMatScan(rightImg, 'Right', {
          smoothRadius: smoothingStrength,
          intensityLevels,
          colorMap,
          backgroundThreshold,
          flattenLighting,
          removePaperNoise,
          sensitivity: 1.0,
        });
        rightUrl = rightResult.processedDataUrl;
      }

      onUpdateHeatmaps(
        leftUrl,
        rightUrl,
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
    const hasAnyScan = Boolean(leftFoot?.rawDataUrl || rightFoot?.rawDataUrl);
    const needsProcessing = (leftFoot?.rawDataUrl && !leftHeatmapUrl) || (rightFoot?.rawDataUrl && !rightHeatmapUrl);
    if (hasAnyScan && needsProcessing) {
      runProcessingPipeline();
    }
  }, [leftFoot, rightFoot]);

  // Live real-time reactive debounce: reprocesses heatmaps whenever any parameter changes
  useEffect(() => {
    if (!leftFoot?.rawDataUrl && !rightFoot?.rawDataUrl) return;

    const timer = setTimeout(() => {
      runProcessingPipeline();
    }, 250);

    return () => clearTimeout(timer);
  }, [
    smoothingStrength,
    intensityLevels,
    colorMap,
    backgroundThreshold,
    flattenLighting,
    removePaperNoise,
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.85rem' }}>
      {/* Main Grid: Left Foot Card + Right Foot Card + Processing Parameters */}
      <div className="podoload-process-grid">
        {/* ================= LEFT FOOT PROCESSED CARD ================= */}
        <div className="podoload-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0c2328' }}>Left foot</span>
            <span className="podo-badge podo-badge-green">Processed</span>
          </div>

          <div className="podoload-process-foot-preview">
            {/* Heatmap Viewport Box (Zero Black Background) */}
            <div
              style={{
                width: '100%',
                flex: 1,
                minHeight: '290px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '0.5rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                position: 'relative',
              }}
            >
              {leftHeatmapUrl ? (
                <img
                  src={leftHeatmapUrl}
                  alt="Left Plantar Heatmap"
                  style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ color: '#0ea5e9', fontSize: '0.74rem', fontWeight: 600 }}>Processing Heatmap...</div>
              )}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#657e84', marginTop: '0.35rem', fontWeight: 600, textAlign: 'center' }}>
              Plantar Pressure Heatmap
            </span>
          </div>
        </div>

        {/* ================= RIGHT FOOT PROCESSED CARD ================= */}
        <div className="podoload-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0c2328' }}>Right foot</span>
            <span className="podo-badge podo-badge-green">Processed</span>
          </div>

          <div className="podoload-process-foot-preview">
            {/* Heatmap Viewport Box (Zero Black Background) */}
            <div
              style={{
                width: '100%',
                flex: 1,
                minHeight: '290px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '0.5rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                position: 'relative',
              }}
            >
              {rightHeatmapUrl ? (
                <img
                  src={rightHeatmapUrl}
                  alt="Right Plantar Heatmap"
                  style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ color: '#0ea5e9', fontSize: '0.74rem', fontWeight: 600 }}>Processing Heatmap...</div>
              )}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#657e84', marginTop: '0.35rem', fontWeight: 600, textAlign: 'center' }}>
              Plantar Pressure Heatmap
            </span>
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
              <option value="Jet">Jet (Diagnostic standard)</option>
              <option value="Turbo">Turbo (High-contrast accessible)</option>
              <option value="Parula">Parula (Blue to Yellow)</option>
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
              Left / Right <span style={{ color: '#0e7477' }}>{leftFoot?.confidence ?? 94}% / {rightFoot?.confidence ?? 88}%</span>
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

      {/* Bottom Action Footer */}
      <div className="podoload-bottom-actions-bar">
        <button type="button" className="podoload-btn-secondary" onClick={onBack}>
          Back to capture
        </button>

        <button
          type="button"
          className="podoload-btn-primary"
          onClick={onContinue}
          disabled={
            isProcessing ||
            !(
              (leftFoot ? Boolean(leftHeatmapUrl) : false) ||
              (rightFoot ? Boolean(rightHeatmapUrl) : false)
            )
          }
        >
          Next: view results
        </button>
      </div>
    </div>
  );
};
