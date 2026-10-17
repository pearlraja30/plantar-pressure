import React, { useState, useRef } from 'react';
import {
  Ruler,
  RotateCcw,
  Save,
  CheckCircle2,
  Sliders,
  FileText,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import {
  AnalysisCase,
  Patient,
  OrthoticLandmarks,
  OrthoticMeasurements,
} from '../types';
import { logAuditEvent } from '../services/auditService';
import { orthoticRuleEngine } from '../core/rules/OrthoticRuleEngine';

interface OrthoticMeasurementsViewProps {
  currentCase?: AnalysisCase;
  patient?: Patient;
  onUpdateCase: (updatedCase: AnalysisCase) => void;
  onGenerateReport: () => void;
  onOpenScanner?: () => void;
}

export const OrthoticMeasurementsView: React.FC<OrthoticMeasurementsViewProps> = ({
  currentCase,
  patient,
  onUpdateCase,
  onGenerateReport,
  onOpenScanner,
}) => {
  const [landmarks, setLandmarks] = useState<OrthoticLandmarks>(
    currentCase?.landmarks || {
      longestToe: { x: 280, y: 120 },
      metatarsal1: { x: 210, y: 320 },
      metatarsal5: { x: 350, y: 350 },
      archApex: { x: 240, y: 480 },
      heelMedial: { x: 230, y: 660 },
      heelLateral: { x: 330, y: 660 },
      heelCenter: { x: 280, y: 690 },
    }
  );
  const [activePin, setActivePin] = useState<keyof OrthoticLandmarks | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync landmarks whenever active case changes
  React.useEffect(() => {
    if (currentCase?.landmarks) {
      setLandmarks(currentCase.landmarks);
    }
  }, [currentCase?.id, currentCase?.landmarks]);

  if (!currentCase || !patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400 shadow-xl">
          <Ruler className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-bold text-slate-100">No Patient Scan Available Yet</h2>
          <p className="text-xs text-slate-400">
            Take a real Harris Mat footprint scan using the camera or file upload to automatically generate interactive orthotic landmarks and customized insole dimensions.
          </p>
          {onOpenScanner && (
            <div className="pt-2">
              <button
                className="btn-primary-sm px-4 py-2 text-xs font-bold shadow-lg"
                onClick={onOpenScanner}
              >
                📸 Launch Scanner Wizard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Calibration scale
  const scale = currentCase.orthoticMeasurements.scaleMmPerPixel;

  // Real-time calculated morphometric parameters from landmark coordinates
  const calculateLiveDimensions = (l: OrthoticLandmarks) => {
    // Length: heelCenter to longestToe
    const dyLen = Math.abs(l.heelCenter.y - l.longestToe.y);
    const footLengthMm = Math.round(dyLen * scale * 1.35);

    // Forefoot Width: metatarsal1 to metatarsal5
    const dxFore = Math.abs(l.metatarsal5.x - l.metatarsal1.x);
    const forefootWidthMm = Math.round(dxFore * scale * 1.85);

    // Heel Width: heelMedial to heelLateral
    const dxHeel = Math.abs(l.heelLateral.x - l.heelMedial.x);
    const heelWidthMm = Math.round(dxHeel * scale * 1.6);

    // Ball Girth formula estimate
    const ballGirthMm = Math.round(forefootWidthMm * 2.45);

    return {
      footLengthMm,
      forefootWidthMm,
      heelWidthMm,
      ballGirthMm,
    };
  };

  const liveDims = calculateLiveDimensions(landmarks);

  // Live dynamic prescription evaluation from OrthoticRuleEngine
  const liveRecommendations = orthoticRuleEngine.evaluateRecommendations(
    {
      ...currentCase,
      orthoticMeasurements: {
        ...currentCase.orthoticMeasurements,
        footLengthMm: liveDims.footLengthMm,
        forefootWidthMm: liveDims.forefootWidthMm,
        heelWidthMm: liveDims.heelWidthMm,
        ballGirthMm: liveDims.ballGirthMm,
      },
    },
    patient
  );
  const activeRecommendations =
    liveRecommendations.length > 0
      ? liveRecommendations
      : currentCase.orthoticMeasurements.recommendations;

  // Handle dragging pin on canvas (Mouse & Touch for Mobile Devices)
  const updatePinCoordinates = (clientX: number, clientY: number) => {
    if (!activePin || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width));
    const relY = Math.max(0.02, Math.min(0.98, (clientY - rect.top) / rect.height));

    // Internal canonical coordinate space is 560 x 760
    const x = Math.round(relX * 560);
    const y = Math.round(relY * 760);

    setLandmarks((prev) => ({
      ...prev,
      [activePin]: { x, y },
    }));
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updatePinCoordinates(e.clientX, e.clientY);
  };

  const handleContainerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      updatePinCoordinates(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMouseUp = () => {
    setActivePin(null);
  };

  const handleResetLandmarks = () => {
    if (currentCase?.landmarks) {
      setLandmarks(currentCase.landmarks);
    }
  };

  const handleSaveMeasurements = () => {
    const dynamicRecommendations = orthoticRuleEngine.evaluateRecommendations(
      {
        ...currentCase,
        orthoticMeasurements: {
          ...currentCase.orthoticMeasurements,
          footLengthMm: liveDims.footLengthMm,
          forefootWidthMm: liveDims.forefootWidthMm,
          heelWidthMm: liveDims.heelWidthMm,
          ballGirthMm: liveDims.ballGirthMm,
        },
      },
      patient
    );

    const updated: AnalysisCase = {
      ...currentCase,
      landmarks,
      orthoticMeasurements: {
        ...currentCase.orthoticMeasurements,
        footLengthMm: liveDims.footLengthMm,
        forefootWidthMm: liveDims.forefootWidthMm,
        heelWidthMm: liveDims.heelWidthMm,
        ballGirthMm: liveDims.ballGirthMm,
        recommendations: dynamicRecommendations,
        calibratedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    onUpdateCase(updated);
    logAuditEvent(
      'ORTHOTIC_LANDMARKS_UPDATED',
      `Updated landmarks: Length=${liveDims.footLengthMm}mm, Forefoot=${liveDims.forefootWidthMm}mm, Heel=${liveDims.heelWidthMm}mm`,
      'practitioner',
      currentCase.id
    );

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div
      className="orthotics-workspace-container"
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleContainerTouchMove}
      onTouchEnd={handleMouseUp}
    >
      {/* Top Banner */}
      <div className="workspace-subbar">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-bold text-slate-100">
            Orthotic Landmarking & Sizing (FR-10)
          </h2>
          <span className="badge-tag">ISO 13485</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-secondary-sm" onClick={handleResetLandmarks}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Auto-Detect
          </button>
          <button className="btn-primary-sm" onClick={handleSaveMeasurements}>
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Dimensions
          </button>
          {savedSuccess && (
            <span className="text-emerald-400 text-xs flex items-center gap-1 font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Saved!
            </span>
          )}
        </div>
      </div>

      {/* Main Landmarking Workspace */}
      <div className="orthotics-grid">
        {/* Interactive Landmark Canvas Box */}
        <div className="landmark-canvas-card">
          <div className="p-3 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">
              Interactive Landmark Overlay (Drag pins to reposition)
            </span>
            <span className="text-slate-400 text-[11px]">
              Scale: {scale.toFixed(4)} mm/px • Side: {currentCase.footSide}
            </span>
          </div>

          <div
            ref={containerRef}
            className="landmark-surface-wrapper"
          >
            {/* Background Footprint Image */}
            <img
              src={currentCase.processedHeatMapDataUrl || currentCase.rawScanDataUrl}
              alt="Footprint for landmarking"
              className="landmark-bg-img"
            />

            {/* SVG Geometric Measurement Vectors with responsive viewBox */}
            <svg className="landmark-svg-layer" viewBox="0 0 560 760">
              {/* Length Line (Heel Center to Longest Toe) */}
              <line
                x1={landmarks.heelCenter.x}
                y1={landmarks.heelCenter.y}
                x2={landmarks.longestToe.x}
                y2={landmarks.longestToe.y}
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />

              {/* Forefoot Width Line (M1 to M5) */}
              <line
                x1={landmarks.metatarsal1.x}
                y1={landmarks.metatarsal1.y}
                x2={landmarks.metatarsal5.x}
                y2={landmarks.metatarsal5.y}
                stroke="#eab308"
                strokeWidth="2.5"
              />

              {/* Heel Width Line */}
              <line
                x1={landmarks.heelMedial.x}
                y1={landmarks.heelMedial.y}
                x2={landmarks.heelLateral.x}
                y2={landmarks.heelLateral.y}
                stroke="#ec4899"
                strokeWidth="2.5"
              />
            </svg>

            {/* Draggable Pins (Responsive Percentage Placement with Mouse & Touch Listeners) */}
            {/* 1. Longest Toe */}
            <div
              className={`landmark-pin cyan ${activePin === 'longestToe' ? 'dragging' : ''}`}
              style={{
                left: `${(landmarks.longestToe.x / 560) * 100}%`,
                top: `${(landmarks.longestToe.y / 760) * 100}%`,
              }}
              onMouseDown={() => setActivePin('longestToe')}
              onTouchStart={() => setActivePin('longestToe')}
            >
              <div className="pin-tooltip">Longest Toe</div>
            </div>

            {/* 2. Metatarsal 1 */}
            <div
              className={`landmark-pin yellow ${activePin === 'metatarsal1' ? 'dragging' : ''}`}
              style={{
                left: `${(landmarks.metatarsal1.x / 560) * 100}%`,
                top: `${(landmarks.metatarsal1.y / 760) * 100}%`,
              }}
              onMouseDown={() => setActivePin('metatarsal1')}
              onTouchStart={() => setActivePin('metatarsal1')}
            >
              <div className="pin-tooltip">1st Met Head</div>
            </div>

            {/* 3. Metatarsal 5 */}
            <div
              className={`landmark-pin yellow ${activePin === 'metatarsal5' ? 'dragging' : ''}`}
              style={{
                left: `${(landmarks.metatarsal5.x / 560) * 100}%`,
                top: `${(landmarks.metatarsal5.y / 760) * 100}%`,
              }}
              onMouseDown={() => setActivePin('metatarsal5')}
              onTouchStart={() => setActivePin('metatarsal5')}
            >
              <div className="pin-tooltip">5th Met Head</div>
            </div>

            {/* 4. Heel Center */}
            <div
              className={`landmark-pin teal ${activePin === 'heelCenter' ? 'dragging' : ''}`}
              style={{
                left: `${(landmarks.heelCenter.x / 560) * 100}%`,
                top: `${(landmarks.heelCenter.y / 760) * 100}%`,
              }}
              onMouseDown={() => setActivePin('heelCenter')}
              onTouchStart={() => setActivePin('heelCenter')}
            >
              <div className="pin-tooltip">Heel Center</div>
            </div>

            {/* 5. Heel Medial */}
            <div
              className={`landmark-pin pink ${activePin === 'heelMedial' ? 'dragging' : ''}`}
              style={{
                left: `${(landmarks.heelMedial.x / 560) * 100}%`,
                top: `${(landmarks.heelMedial.y / 760) * 100}%`,
              }}
              onMouseDown={() => setActivePin('heelMedial')}
              onTouchStart={() => setActivePin('heelMedial')}
            >
              <div className="pin-tooltip">Heel Medial</div>
            </div>

            {/* 6. Heel Lateral */}
            <div
              className={`landmark-pin pink ${activePin === 'heelLateral' ? 'dragging' : ''}`}
              style={{
                left: `${(landmarks.heelLateral.x / 560) * 100}%`,
                top: `${(landmarks.heelLateral.y / 760) * 100}%`,
              }}
              onMouseDown={() => setActivePin('heelLateral')}
              onTouchStart={() => setActivePin('heelLateral')}
            >
              <div className="pin-tooltip">Heel Lateral</div>
            </div>
          </div>
        </div>

        {/* Live Morphometric Dimension Readout Card */}
        <div className="orthotics-sidebar space-y-4">
          <div className="sidebar-card">
            <h3 className="card-title mb-3">Live Morphometric Dimensions (FR-10)</h3>
            <div className="space-y-2.5 text-xs">
              <div className="metric-box flex items-center justify-between p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <div>
                  <div className="font-semibold text-slate-200">Foot Length (L)</div>
                  <div className="text-[11px] text-slate-400">Heel to longest toe apex</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-teal-400 font-mono">
                    {liveDims.footLengthMm} mm
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {(liveDims.footLengthMm / 25.4).toFixed(1)} inches
                  </div>
                </div>
              </div>

              <div className="metric-box flex items-center justify-between p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <div>
                  <div className="font-semibold text-slate-200">Forefoot Width (Wf)</div>
                  <div className="text-[11px] text-slate-400">1st to 5th metatarsal heads</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-amber-400 font-mono">
                    {liveDims.forefootWidthMm} mm
                  </div>
                  <div className="text-[10px] text-slate-400">Normal Range: 88-102 mm</div>
                </div>
              </div>

              <div className="metric-box flex items-center justify-between p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <div>
                  <div className="font-semibold text-slate-200">Heel Width (Wh)</div>
                  <div className="text-[11px] text-slate-400">Calcaneal bisection width</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-pink-400 font-mono">
                    {liveDims.heelWidthMm} mm
                  </div>
                  <div className="text-[10px] text-slate-400">Normal Range: 62-74 mm</div>
                </div>
              </div>

              <div className="metric-box flex items-center justify-between p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <div>
                  <div className="font-semibold text-slate-200">Ball Girth / Circumference</div>
                  <div className="text-[11px] text-slate-400">Metatarsal circumference estimate</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-cyan-400 font-mono">
                    {liveDims.ballGirthMm} mm
                  </div>
                </div>
              </div>

              <div className="metric-box flex items-center justify-between p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <div>
                  <div className="font-semibold text-slate-200">Arch Index (Cavanagh)</div>
                  <div className="text-[11px] text-slate-400">Midfoot / total contact ratio</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-100 font-mono">
                    {currentCase.regionalAnalysis.cavanaghArchIndex}
                  </div>
                  <div className="text-[10px] text-teal-400">
                    {currentCase.regionalAnalysis.archClassification}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Orthotic Fabrication Recommendations */}
          <div className="sidebar-card">
            <h3 className="card-title mb-2">Orthotic Fabrication Guidelines</h3>
            <div className="space-y-2 text-xs">
              {activeRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded text-slate-300 flex items-start gap-2"
                >
                  <span className="font-bold text-teal-400 mt-0.5">#{idx + 1}</span>
                  <span className="text-slate-200">{rec}</span>
                </div>
              ))}
            </div>

            <button
              className="btn-primary w-full mt-4 justify-center"
              onClick={onGenerateReport}
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Generate 4-Page Clinical Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
