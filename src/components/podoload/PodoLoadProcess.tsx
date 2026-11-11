import React, { useState, useEffect, useRef } from 'react';
import { Save, RotateCcw, Check, Sliders } from 'lucide-react';
import { FootCaptureData } from './PodoLoadCapture';
import { processHarrisMatScan } from '../../services/imageProcessingService';
import { dbService, DEFAULT_PROCESSING_PARAMETERS } from '../../services/dbService';
import { ProcessingParameters } from '../../types';

export type HeatmapBackgroundMode = 'black' | 'slate' | 'white';

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
  // Load persistent processing parameters from storage (persists across all exams until user explicitly updates)
  const [savedParams, setSavedParams] = useState<ProcessingParameters>(() => dbService.getProcessingParametersSync());
  const [smoothingStrength, setSmoothingStrength] = useState<number>(savedParams.smoothingStrength);
  const [intensityLevels, setIntensityLevels] = useState<string>(savedParams.intensityLevels);
  const [colorMap, setColorMap] = useState<string>(savedParams.colorMap);
  const [backgroundThreshold, setBackgroundThreshold] = useState<number>(savedParams.backgroundThreshold);
  const [flattenLighting, setFlattenLighting] = useState<boolean>(savedParams.flattenLighting);
  const [removePaperNoise, setRemovePaperNoise] = useState<boolean>(savedParams.removePaperNoise);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Background color customization (Default to clinical high-contrast Black, with choice of Dark Slate or Clean White)
  const [heatmapBg, setHeatmapBg] = useState<HeatmapBackgroundMode>(() => {
    try {
      return (localStorage.getItem('podoload_heatmap_bg') as HeatmapBackgroundMode) || 'black';
    } catch {
      return 'black';
    }
  });

  const handleBgChange = (mode: HeatmapBackgroundMode) => {
    setHeatmapBg(mode);
    try {
      localStorage.setItem('podoload_heatmap_bg', mode);
    } catch {}
  };

  const getViewportBgStyle = (mode: HeatmapBackgroundMode): React.CSSProperties => {
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

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const isFirstMount = useRef(true);

  // Save current parameters as persistent defaults for all subsequent exams
  const handleSaveDefaultSettings = () => {
    const newParams: ProcessingParameters = {
      smoothingStrength,
      intensityLevels,
      colorMap,
      backgroundThreshold,
      flattenLighting,
      removePaperNoise,
    };
    dbService.saveProcessingParameters(newParams);
    setSavedParams(newParams);
    setSaveNotification('✓ Parameters saved & persistent for all exams');
    setTimeout(() => setSaveNotification(null), 3000);
  };

  // Reset to standard clinical defaults
  const handleResetDefaults = () => {
    const def = { ...DEFAULT_PROCESSING_PARAMETERS };
    setSmoothingStrength(def.smoothingStrength);
    setIntensityLevels(def.intensityLevels);
    setColorMap(def.colorMap);
    setBackgroundThreshold(def.backgroundThreshold);
    setFlattenLighting(def.flattenLighting);
    setRemovePaperNoise(def.removePaperNoise);
    dbService.saveProcessingParameters(def);
    setSavedParams(def);
    setSaveNotification('✓ Restored and saved clinical defaults');
    setTimeout(() => setSaveNotification(null), 3000);
  };

  // Safe asynchronous image loader that handles caching and errors without hanging
  const loadImageSafe = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load scan image for processing'));
      img.src = src;
      if (img.complete && img.naturalWidth > 0) {
        resolve(img);
      }
    });
  };

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
        try {
          const leftImg = await loadImageSafe(leftFoot.rawDataUrl);
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
        } catch (err) {
          console.warn('[PodoLoadProcess] Left foot heatmap generation fallback:', err);
          leftUrl = leftFoot.rawDataUrl;
        }
      }

      if (rightFoot?.rawDataUrl) {
        try {
          const rightImg = await loadImageSafe(rightFoot.rawDataUrl);
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
        } catch (err) {
          console.warn('[PodoLoadProcess] Right foot heatmap generation fallback:', err);
          rightUrl = rightFoot.rawDataUrl;
        }
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

  // Run automatically on initial mount ONLY if heatmaps have not yet been generated
  useEffect(() => {
    const hasAnyScan = Boolean(leftFoot?.rawDataUrl || rightFoot?.rawDataUrl);
    const needsProcessing = (leftFoot?.rawDataUrl && !leftHeatmapUrl) || (rightFoot?.rawDataUrl && !rightHeatmapUrl);
    if (hasAnyScan && needsProcessing) {
      runProcessingPipeline();
    }
  }, [leftFoot, rightFoot]);

  // Live real-time reactive debounce: reprocesses heatmaps whenever any parameter changes and persists them
  useEffect(() => {
    // Prevent immediate re-execution on initial component mount to preserve existing generated heatmaps
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (!leftFoot?.rawDataUrl && !rightFoot?.rawDataUrl) return;

    // Automatically synchronize modified parameters to storage so they persist across navigation
    dbService.saveProcessingParameters({
      smoothingStrength,
      intensityLevels,
      colorMap,
      backgroundThreshold,
      flattenLighting,
      removePaperNoise,
    });

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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.65rem', minHeight: 0 }}>
      {/* Main Grid: Left Foot Card + Right Foot Card + Processing Parameters */}
      <div className="podoload-process-grid" style={{ minHeight: 0, flex: 1 }}>
        {/* ================= LEFT FOOT PROCESSED CARD ================= */}
        <div className="podoload-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.75rem 0.85rem', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0c2328' }}>Left foot</span>
              <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>Processed</span>
            </div>

            {/* Background Color Quick Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>BG:</span>
              <button
                type="button"
                onClick={() => handleBgChange('black')}
                title="Clinical Pitch Black (Maximum Pressure Contrast)"
                style={{
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  borderRadius: '3px',
                  border: heatmapBg === 'black' ? '1.5px solid #38bdf8' : '1px solid #94a3b8',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                ⬛ Black
              </button>
              <button
                type="button"
                onClick={() => handleBgChange('slate')}
                title="Dark Slate (Clinical Dark Mode)"
                style={{
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  borderRadius: '3px',
                  border: heatmapBg === 'slate' ? '1.5px solid #38bdf8' : '1px solid #cbd5e1',
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                }}
              >
                🌑 Slate
              </button>
              <button
                type="button"
                onClick={() => handleBgChange('white')}
                title="Clean White (Paper Simulation)"
                style={{
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  borderRadius: '3px',
                  border: heatmapBg === 'white' ? '1.5px solid #0891b2' : '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                ⬜ White
              </button>
            </div>
          </div>

          <div className="podoload-process-foot-preview" style={{ flex: 1, minHeight: 0 }}>
            {/* Heatmap Viewport Box (Responsive Fit - Zero Clipped Heel) */}
            <div
              className="podoload-process-viewport-box"
              style={{
                width: '100%',
                flex: 1,
                height: 'calc(100vh - 290px)',
                minHeight: '260px',
                maxHeight: '430px',
                borderStyle: 'solid',
                borderWidth: '1px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '0.5rem',
                position: 'relative',
                boxSizing: 'border-box',
                transition: 'background-color 0.2s ease, border-color 0.2s ease',
                ...getViewportBgStyle(heatmapBg),
              }}
            >
              {leftHeatmapUrl ? (
                <img
                  src={leftHeatmapUrl}
                  alt="Left Plantar Heatmap"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    display: 'block',
                    filter: heatmapBg === 'black' ? 'drop-shadow(0 0 12px rgba(14, 165, 233, 0.2))' : 'none',
                  }}
                />
              ) : (
                <div style={{ color: '#0ea5e9', fontSize: '0.74rem', fontWeight: 600 }}>Processing Heatmap...</div>
              )}
            </div>
            <span style={{ fontSize: '0.66rem', color: '#657e84', marginTop: '0.2rem', fontWeight: 600, textAlign: 'center' }}>
              Plantar Pressure Heatmap (Bilateral Calibration)
            </span>
          </div>
        </div>

        {/* ================= RIGHT FOOT PROCESSED CARD ================= */}
        <div className="podoload-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.75rem 0.85rem', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0c2328' }}>Right foot</span>
              <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>Processed</span>
            </div>

            {/* Background Color Quick Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>BG:</span>
              <button
                type="button"
                onClick={() => handleBgChange('black')}
                title="Clinical Pitch Black (Maximum Pressure Contrast)"
                style={{
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  borderRadius: '3px',
                  border: heatmapBg === 'black' ? '1.5px solid #38bdf8' : '1px solid #94a3b8',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                ⬛ Black
              </button>
              <button
                type="button"
                onClick={() => handleBgChange('slate')}
                title="Dark Slate (Clinical Dark Mode)"
                style={{
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  borderRadius: '3px',
                  border: heatmapBg === 'slate' ? '1.5px solid #38bdf8' : '1px solid #cbd5e1',
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                }}
              >
                🌑 Slate
              </button>
              <button
                type="button"
                onClick={() => handleBgChange('white')}
                title="Clean White (Paper Simulation)"
                style={{
                  padding: '1px 5px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  borderRadius: '3px',
                  border: heatmapBg === 'white' ? '1.5px solid #0891b2' : '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                ⬜ White
              </button>
            </div>
          </div>

          <div className="podoload-process-foot-preview" style={{ flex: 1, minHeight: 0 }}>
            {/* Heatmap Viewport Box (Responsive Fit - Zero Clipped Heel) */}
            <div
              className="podoload-process-viewport-box"
              style={{
                width: '100%',
                flex: 1,
                height: 'calc(100vh - 290px)',
                minHeight: '260px',
                maxHeight: '430px',
                borderStyle: 'solid',
                borderWidth: '1px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '0.5rem',
                position: 'relative',
                boxSizing: 'border-box',
                transition: 'background-color 0.2s ease, border-color 0.2s ease',
                ...getViewportBgStyle(heatmapBg),
              }}
            >
              {rightHeatmapUrl ? (
                <img
                  src={rightHeatmapUrl}
                  alt="Right Plantar Heatmap"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    display: 'block',
                    filter: heatmapBg === 'black' ? 'drop-shadow(0 0 12px rgba(14, 165, 233, 0.2))' : 'none',
                  }}
                />
              ) : (
                <div style={{ color: '#0ea5e9', fontSize: '0.74rem', fontWeight: 600 }}>Processing Heatmap...</div>
              )}
            </div>
            <span style={{ fontSize: '0.66rem', color: '#657e84', marginTop: '0.2rem', fontWeight: 600, textAlign: 'center' }}>
              Plantar Pressure Heatmap (Bilateral Calibration)
            </span>
          </div>
        </div>

        {/* ================= RIGHT PANEL: PROCESSING PARAMETERS ================= */}
        <div className="podoload-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.75rem 0.85rem', minHeight: 0, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem' }}>
            <h3 className="podoload-card-title" style={{ margin: 0 }}>PROCESSING PARAMETERS</h3>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                color: '#047857',
                backgroundColor: '#ecfdf5',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                border: '1px solid #a7f3d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title="Parameters are locked and saved for all future exams"
            >
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Persistent Settings</span>
            </span>
          </div>

          {saveNotification && (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #6ee7b7',
                color: '#065f46',
                padding: '0.4rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.15)',
              }}
            >
              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>{saveNotification}</span>
            </div>
          )}

          {/* Heatmap Background Preference */}
          <div className="podoload-form-group" style={{ marginBottom: '0.35rem' }}>
            <label className="podoload-label">Heatmap Viewport Background</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem', marginTop: '0.15rem' }}>
              <button
                type="button"
                onClick={() => handleBgChange('black')}
                style={{
                  padding: '0.35rem 0.25rem',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: heatmapBg === 'black' ? '2px solid #38bdf8' : '1px solid #334155',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ⬛ Black
              </button>
              <button
                type="button"
                onClick={() => handleBgChange('slate')}
                style={{
                  padding: '0.35rem 0.25rem',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: heatmapBg === 'slate' ? '2px solid #38bdf8' : '1px solid #cbd5e1',
                  backgroundColor: '#0f172a',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                🌑 Slate
              </button>
              <button
                type="button"
                onClick={() => handleBgChange('white')}
                style={{
                  padding: '0.35rem 0.25rem',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  border: heatmapBg === 'white' ? '2px solid #0891b2' : '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ⬜ White
              </button>
            </div>
          </div>

          <div className="podoload-form-group" style={{ marginBottom: '0.35rem' }}>
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

          <div className="podoload-form-group" style={{ marginBottom: '0.35rem' }}>
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

          <div className="podoload-form-group" style={{ marginBottom: '0.35rem' }}>
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

          <div className="podoload-form-group" style={{ marginBottom: '0.35rem' }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: '0.15rem 0' }}>
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

          <div style={{ fontSize: '0.74rem', marginTop: '0.15rem' }}>
            <span style={{ color: 'var(--podo-card-title)', fontWeight: 800 }}>IMAGE CONFIDENCE</span>
            <div style={{ marginTop: '0.15rem', fontWeight: 700, color: '#0c2328' }}>
              Left / Right <span style={{ color: '#0e7477' }}>{leftFoot?.confidence ?? 94}% / {rightFoot?.confidence ?? 88}%</span>
            </div>
          </div>

          {/* Action Buttons: Save Settings, Reset Defaults, Reprocess */}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
            <button
              type="button"
              className="podoload-btn-secondary podoload-btn-sm"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              onClick={handleSaveDefaultSettings}
              title="Save current parameters as persistent defaults for all future exams"
            >
              <Save className="w-3.5 h-3.5 text-teal-600" />
              <span>Save Setting</span>
            </button>

            <button
              type="button"
              className="podoload-btn-secondary podoload-btn-sm"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.35rem 0.55rem' }}
              onClick={handleResetDefaults}
              title="Reset parameters to standard clinical defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>

          <button
            type="button"
            className="podoload-btn-primary"
            style={{ width: '100%' }}
            onClick={runProcessingPipeline}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing Heatmaps...' : 'Reprocess Heatmaps'}
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
