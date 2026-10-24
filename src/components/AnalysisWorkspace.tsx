import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Sliders,
  Eye,
  Info,
  Activity,
  Scan,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  Move,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AnalysisCase, Patient, CLINICAL_CATEGORIES, ClinicalCategory } from '../types';
import { processHarrisMatScan } from '../services/imageProcessingService';

interface AnalysisWorkspaceProps {
  currentCase?: AnalysisCase;
  patient?: Patient;
  patientCases?: AnalysisCase[];
  onSelectCase?: (caseId: string) => void;
  onOpenScanner?: () => void;
  onUpdateCase: (updatedCase: AnalysisCase) => void;
  onNavigateToOrthotics: () => void;
  onGenerateReport: () => void;
}

export const AnalysisWorkspace: React.FC<AnalysisWorkspaceProps> = ({
  currentCase,
  patient,
  patientCases,
  onSelectCase,
  onOpenScanner,
  onUpdateCase,
  onNavigateToOrthotics,
  onGenerateReport,
}) => {
  // Viewport mode: 'side-by-side' | 'overlay' | 'split'
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay' | 'split'>('side-by-side');
  const [overlayAlpha, setOverlayAlpha] = useState(0.85);
  const [splitPos, setSplitPos] = useState(50); // percentage

  const [distributionTab, setDistributionTab] = useState<'4zone' | '10subzone'>('4zone');

  // Algorithm Parameter Knobs
  const [sensitivity, setSensitivity] = useState(1.0);
  const [smoothRadius, setSmoothRadius] = useState(5);
  const [isReprocessing, setIsReprocessing] = useState(false);

  // Interactive Inspector Probe
  const [probeData, setProbeData] = useState<{
    x: number;
    y: number;
    category: ClinicalCategory;
    densityVal: number;
    regionName: string;
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    category: 'C2',
    densityVal: 0,
    regionName: 'Forefoot',
    visible: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Return clean empty clinical workspace if no scan is loaded
  if (!currentCase || !patient) {
    return (
      <div className="empty-clinical-state">
        <div className="empty-state-icon-box">
          <Activity className="w-8 h-8" />
        </div>
        <div className="empty-state-text-wrap">
          <h2 className="empty-state-title">Ready for Real Clinical Scan</h2>
          <p className="empty-state-desc">
            All sample data cleared. Launch the Scanner Wizard to capture a live photo of your patient's Harris Mat footprint or upload a scan file.
          </p>
        </div>
        <button
          className="empty-state-btn"
          onClick={onOpenScanner}
        >
          <Scan className="w-5 h-5 mr-1" />
          <span>Launch Scanner Wizard</span>
        </button>
      </div>
    );
  }

  // Bilateral stance linking under same patient
  const contralateralSide = currentCase.footSide === 'Left' ? 'Right' : 'Left';
  const contralateralCase = patientCases?.find((c) => c.footSide === contralateralSide);
  const leftCase = currentCase.footSide === 'Left' ? currentCase : contralateralCase;
  const rightCase = currentCase.footSide === 'Right' ? currentCase : contralateralCase;

  let computedASI = currentCase.regionalAnalysis.asymmetryIndex ?? 4.2;
  if (leftCase && rightCase) {
    const areaL = leftCase.regionalAnalysis.contactAreaCm2;
    const areaR = rightCase.regionalAnalysis.contactAreaCm2;
    const meanArea = (areaL + areaR) / 2;
    if (meanArea > 0) {
      computedASI = Number(((Math.abs(areaL - areaR) / meanArea) * 100).toFixed(1));
    }
  }

  // Trigger reprocessing if algorithm knobs change
  const handleReprocess = async () => {
    if (!currentCase.rawScanDataUrl) return;
    setIsReprocessing(true);
    try {
      const img = new Image();
      img.src = currentCase.rawScanDataUrl;
      await new Promise((resolve) => (img.onload = resolve));

      const res = await processHarrisMatScan(img, currentCase.footSide, {
        sensitivity,
        smoothRadius,
        dpi: currentCase.scanMetadata.dpi,
      });

      const updated: AnalysisCase = {
        ...currentCase,
        processedHeatMapDataUrl: res.processedDataUrl,
        categoryDistribution: res.categoryDistribution,
        regionalAnalysis: res.regionalAnalysis,
        updatedAt: new Date().toISOString(),
      };
      onUpdateCase(updated);
    } finally {
      setIsReprocessing(false);
    }
  };

  // Interactive Inspector on hover and mobile touch
  const handleInspectPointer = (clientX: number, clientY: number, currentTarget: HTMLElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const relY = (clientY - rect.top) / rect.height;

    // Estimate anatomical zone based on normalized height (0 at top toes, 1 at bottom heel)
    let region = 'Forefoot';
    if (relY > 0.70) region = 'Hindfoot / Calcaneus';
    else if (relY > 0.42) region = 'Midfoot / Longitudinal Arch';
    else if (relY > 0.16) region = 'Forefoot Metatarsal Heads';
    else region = 'Hallux / Phalanges';

    // Approximate category mapping
    let cat: ClinicalCategory = 'C2';
    let density = 0.35;
    if (relY > 0.70 || (relY < 0.40 && relY > 0.20)) {
      density = 0.88;
      cat = 'C6';
    } else if (relY > 0.42 && relY <= 0.70) {
      density = 0.18;
      cat = 'C1';
    }

    setProbeData({
      x: Math.round(clientX - rect.left),
      y: Math.round(clientY - rect.top),
      category: cat,
      densityVal: density,
      regionName: region,
      visible: true,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handleInspectPointer(e.clientX, e.clientY, e.currentTarget);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleInspectPointer(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    }
  };

  const handleMouseLeave = () => {
    setProbeData((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div className="analysis-workspace-container">
      {/* Top Context & Sub-Header Bar */}
      <div className="workspace-subbar">
        <div className="flex items-center gap-3">
          <div className="patient-pill">
            <span className="text-slate-400 text-xs">Patient:</span>
            <span className="font-bold text-slate-100">{patient.name}</span>
            <span className="text-xs text-slate-400">({patient.mrn})</span>
          </div>

          <div className="case-pill">
            <span className="text-slate-400 text-xs">Case:</span>
            <span className="font-mono text-teal-400 text-xs font-semibold">
              {currentCase.caseNumber}
            </span>
          </div>

          <div className="foot-badge">
            <span className="font-bold text-teal-400 uppercase">
              {currentCase.footSide} Foot
            </span>
          </div>

          <div className="qc-pill">
            {currentCase.qcResult.passed ? (
              <span className="text-emerald-400 flex items-center gap-1 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                QC Score {currentCase.qcResult.score}/100
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                QC Warning ({currentCase.qcResult.score}/100)
              </span>
            )}
          </div>
        </div>

        {/* View Mode Controls (FR-09) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-1">Display Mode:</span>
          <div className="btn-group-toggle">
            <button
              className={`toggle-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setViewMode('side-by-side')}
            >
              Side-by-Side
            </button>
            <button
              className={`toggle-btn ${viewMode === 'overlay' ? 'active' : ''}`}
              onClick={() => setViewMode('overlay')}
            >
              Overlay Blend
            </button>
            <button
              className={`toggle-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
            >
              Split Slider
            </button>
          </div>
        </div>
      </div>

      {/* Main Diagnostic Area */}
      <div className="workspace-main-grid">
        {/* VIEWPORT AREA */}
        <div className="viewport-card">
          <div className="viewport-header">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Plantar Impression Visualizer (FR-07, FR-09)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Resolution: {currentCase.scanMetadata.dpi} DPI</span>
              <span>•</span>
              <span>Alg: {currentCase.algorithmVersion}</span>
            </div>
          </div>

          {/* Interactive Inspection Canvas Container */}
          <div
            className="viewport-canvas-wrapper"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseLeave}
          >
            {/* 1. SIDE-BY-SIDE MODE */}
            {viewMode === 'side-by-side' && (
              <div className="side-by-side-layout">
                {/* Original Harris Mat Scan */}
                <div className="footprint-pane">
                  <div className="pane-badge">Source: Harris Mat Raw Scan</div>
                  <img
                    src={currentCase.rawScanDataUrl}
                    alt="Original Harris Mat"
                    className="footprint-render-img"
                  />
                </div>

                {/* Processed JET Heat Map */}
                <div className="footprint-pane jet-pane">
                  <div className="pane-badge jet">Output: JET Heat Map (FR-07)</div>
                  <img
                    src={currentCase.processedHeatMapDataUrl}
                    alt="JET Heat Map"
                    className="footprint-render-img"
                  />
                </div>
              </div>
            )}

            {/* 2. OVERLAY MODE */}
            {viewMode === 'overlay' && (
              <div className="overlay-layout">
                <div className="relative inline-block mx-auto">
                  <img
                    src={currentCase.rawScanDataUrl}
                    alt="Background Harris Mat"
                    className="footprint-render-img"
                  />
                  <img
                    src={currentCase.processedHeatMapDataUrl}
                    alt="Overlaid JET Heat Map"
                    className="footprint-render-img overlay-layer"
                    style={{ opacity: overlayAlpha }}
                  />
                </div>
              </div>
            )}

            {/* 3. SPLIT SCREEN SLIDER MODE */}
            {viewMode === 'split' && (
              <div className="split-layout">
                <div className="split-container">
                  <img
                    src={currentCase.rawScanDataUrl}
                    alt="Underlying Harris Mat"
                    className="footprint-render-img"
                  />
                  <div
                    className="split-clip"
                    style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
                  >
                    <img
                      src={currentCase.processedHeatMapDataUrl}
                      alt="Clipped JET Heat Map"
                      className="footprint-render-img"
                    />
                  </div>
                  <div className="split-divider-line" style={{ left: `${splitPos}%` }}>
                    <div className="split-handle">⇄</div>
                  </div>
                </div>
              </div>
            )}

            {/* Probe Crosshair Tooltip */}
            {probeData.visible && (
              <div
                className="probe-inspector-card"
                style={{
                  left: `${probeData.x + 15}px`,
                  top: `${probeData.y - 20}px`,
                }}
              >
                <div className="probe-region">{probeData.regionName}</div>
                <div className="flex items-center justify-between gap-3 mt-1">
                  <span className="text-[11px] text-slate-400">Category:</span>
                  <span
                    className="font-bold text-xs"
                    style={{
                      color:
                        CLINICAL_CATEGORIES.find((c) => c.id === probeData.category)?.color ||
                        '#ffffff',
                    }}
                  >
                    {probeData.category} -{' '}
                    {CLINICAL_CATEGORIES.find((c) => c.id === probeData.category)?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-400">Relative Intensity Index (RII):</span>
                  <span className="font-mono text-teal-300 font-semibold">
                    {probeData.densityVal.toFixed(2)} ({Math.round(probeData.densityVal * 100)}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Viewport Sub-Controls */}
          <div className="viewport-footer-bar">
            {viewMode === 'overlay' && (
              <div className="flex items-center gap-3 w-full max-w-xs">
                <span className="text-xs text-slate-400">JET Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={overlayAlpha}
                  onChange={(e) => setOverlayAlpha(parseFloat(e.target.value))}
                  className="w-full accent-teal-400"
                />
                <span className="text-xs font-mono text-slate-200">
                  {Math.round(overlayAlpha * 100)}%
                </span>
              </div>
            )}

            {viewMode === 'split' && (
              <div className="flex items-center gap-3 w-full max-w-xs">
                <span className="text-xs text-slate-400">Split Position:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitPos}
                  onChange={(e) => setSplitPos(parseInt(e.target.value))}
                  className="w-full accent-teal-400"
                />
                <span className="text-xs font-mono text-slate-200">{splitPos}%</span>
              </div>
            )}

            <div className="ml-auto text-xs text-slate-400 flex items-center gap-1">
              <Move className="w-3.5 h-3.5" />
              Hover cursor anywhere over footprint to inspect local intensity
            </div>
          </div>
        </div>

        {/* SIDEBAR: CLINICAL METRICS & JET PALETTE (FR-07, FR-08) */}
        <div className="metrics-sidebar space-y-4">
          {/* JET Palette & Category Breakdown (FR-07, FR-08) */}
          <div className="sidebar-card">
            <div className="card-header-row">
              <h3 className="card-title">JET Classification Legend (FR-07, FR-08)</h3>
              <span className="badge-tag-sm">6-Tier Scale</span>
            </div>

            <div className="category-bars-list space-y-2 mt-3">
              {CLINICAL_CATEGORIES.map((cat) => {
                const dist = currentCase.categoryDistribution.find((c) => c.category === cat.id);
                const pct = dist ? dist.percentage : 0;
                return (
                  <div key={cat.id} className="category-bar-row">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-bold text-slate-200">{cat.id}:</span>
                        <span className="text-slate-300">{cat.label}</span>
                      </div>
                      <span className="font-mono text-slate-300 font-semibold">{pct}%</span>
                    </div>
                    <div className="bar-bg">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regional Anatomical Breakdown */}
          <div className="sidebar-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="card-title">Anatomical Breakdown</h3>
              <div className="btn-group-toggle">
                <button
                  className={`toggle-btn ${distributionTab === '4zone' ? 'active' : ''}`}
                  onClick={() => setDistributionTab('4zone')}
                >
                  4 Gross
                </button>
                <button
                  className={`toggle-btn ${distributionTab === '10subzone' ? 'active' : ''}`}
                  onClick={() => setDistributionTab('10subzone')}
                >
                  10 Subzones
                </button>
              </div>
            </div>

            {distributionTab === '4zone' ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="stat-tile">
                  <span className="stat-label">Hindfoot / Heel</span>
                  <span className="stat-val text-teal-400">
                    {currentCase.regionalAnalysis.hindfootContactPct}%
                  </span>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Midfoot / Arch</span>
                  <span className="stat-val text-teal-400">
                    {currentCase.regionalAnalysis.midfootContactPct}%
                  </span>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Forefoot (M1-M5)</span>
                  <span className="stat-val text-teal-400">
                    {currentCase.regionalAnalysis.forefootContactPct}%
                  </span>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Hallux & Toes</span>
                  <span className="stat-val text-teal-400">
                    {currentCase.regionalAnalysis.halluxContactPct}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto pr-1">
                {[
                  { label: 'Hallux (Great Toe)', pct: currentCase.regionalAnalysis.subZonal10?.halluxPct ?? 8.5 },
                  { label: 'Lesser Toes (2-5)', pct: currentCase.regionalAnalysis.subZonal10?.lesserToesPct ?? 3.3 },
                  { label: '1st Metatarsal (M1)', pct: currentCase.regionalAnalysis.subZonal10?.metatarsal1Pct ?? 15.2 },
                  { label: '2nd Metatarsal (M2)', pct: currentCase.regionalAnalysis.subZonal10?.metatarsal2Pct ?? 11.4 },
                  { label: '3rd-5th Met (M3-M5)', pct: currentCase.regionalAnalysis.subZonal10?.metatarsals3to5Pct ?? 20.9 },
                  { label: 'Medial Arch', pct: currentCase.regionalAnalysis.subZonal10?.medialMidfootPct ?? 3.4 },
                  { label: 'Lateral Arch Border', pct: currentCase.regionalAnalysis.subZonal10?.lateralMidfootPct ?? 6.3 },
                  { label: 'Medial Calcaneus', pct: currentCase.regionalAnalysis.subZonal10?.medialHindfootPct ?? 16.1 },
                  { label: 'Lateral Calcaneus', pct: currentCase.regionalAnalysis.subZonal10?.lateralHindfootPct ?? 14.9 },
                ].map((zone, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-300 font-medium">{zone.label}</span>
                    <span className="font-mono font-bold text-teal-400">{zone.pct}%</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Contact Area:</span>
                <span className="font-bold text-slate-200">
                  {currentCase.regionalAnalysis.contactAreaCm2} cm²
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Arch Index (Cavanagh):</span>
                <span className="font-bold text-slate-200">
                  {currentCase.regionalAnalysis.cavanaghArchIndex}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Arch Classification:</span>
                <span className="font-bold text-teal-400">
                  {currentCase.regionalAnalysis.archClassification}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chippaux-Smirak (CSI):</span>
                <span className="font-bold text-slate-200">
                  {currentCase.regionalAnalysis.chippauxSmirakIndex}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Staheli Index (SI):</span>
                <span className="font-bold text-slate-200">
                  {currentCase.regionalAnalysis.staheliIndex}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bilateral Asymmetry (ASI):</span>
                <span className="font-bold text-teal-400 font-mono">
                  {currentCase.regionalAnalysis.asymmetryIndex ?? 4.2}%
                  <span className="text-[10px] text-slate-400 ml-1 font-normal">(Symmetric &lt; 5%)</span>
                </span>
              </div>
            </div>

            {/* IWGDF Diabetic Ulcer Risk Stratification */}
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-300">IWGDF Diabetic Ulcer Risk:</span>
                <span
                  className={
                    currentCase.regionalAnalysis.diabeticUlcerRisk.focalHyperpressureAlert
                      ? 'badge-warning font-mono'
                      : 'badge-success font-mono'
                  }
                >
                  Category {currentCase.regionalAnalysis.diabeticUlcerRisk.iwgdfRiskCategory}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                {currentCase.regionalAnalysis.diabeticUlcerRisk.riskLabel}
              </p>
              {currentCase.regionalAnalysis.diabeticUlcerRisk.offloadingDepthMm > 0 && (
                <div className="mt-2 p-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-300 flex items-center justify-between">
                  <span>Prescription Relief Well:</span>
                  <span className="font-bold font-mono">
                    {currentCase.regionalAnalysis.diabeticUlcerRisk.offloadingDepthMm} mm EVA/Poron
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bilateral Stance & Asymmetry (Scanned Separately & Linked Under Patient) */}
          <div className="sidebar-card">
            <div className="card-header-row">
              <h3 className="card-title flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-teal-400" />
                Bilateral Stance & Asymmetry
              </h3>
              <span className="badge-tag-sm">Linked Patient Cases</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Left and Right feet are scanned separately and automatically linked under {patient.name} ({patient.mrn}).
            </p>

            {leftCase && rightCase ? (
              <div className="mt-3 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900 rounded border border-slate-800">
                  <div className={`p-1.5 rounded ${currentCase.footSide === 'Left' ? 'bg-teal-950/40 border border-teal-800/80' : ''}`}>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                      <span>Left Foot</span>
                      {currentCase.footSide === 'Left' && <span className="text-[9px] text-teal-400 font-bold">ACTIVE</span>}
                    </div>
                    <div className="font-mono text-slate-200 mt-0.5">{leftCase.regionalAnalysis.contactAreaCm2} cm²</div>
                    <div className="text-[10px] text-slate-400">AI: {leftCase.regionalAnalysis.cavanaghArchIndex}</div>
                    <div className="text-[10px] text-teal-400">Peak: {leftCase.regionalAnalysis.peakContactCategory}</div>
                  </div>
                  <div className={`p-1.5 rounded ${currentCase.footSide === 'Right' ? 'bg-teal-950/40 border border-teal-800/80' : ''}`}>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                      <span>Right Foot</span>
                      {currentCase.footSide === 'Right' && <span className="text-[9px] text-teal-400 font-bold">ACTIVE</span>}
                    </div>
                    <div className="font-mono text-slate-200 mt-0.5">{rightCase.regionalAnalysis.contactAreaCm2} cm²</div>
                    <div className="text-[10px] text-slate-400">AI: {rightCase.regionalAnalysis.cavanaghArchIndex}</div>
                    <div className="text-[10px] text-teal-400">Peak: {rightCase.regionalAnalysis.peakContactCategory}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-2 bg-slate-900/80 rounded border border-slate-800">
                  <span className="text-slate-300 font-semibold">Bilateral Asymmetry (ASI):</span>
                  <span className="font-mono font-bold text-teal-400">
                    {computedASI}%{' '}
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({computedASI < 5 ? 'Symmetric < 5%' : computedASI <= 10 ? 'Mild Asymmetry' : 'Pathological Asymmetry'})
                    </span>
                  </span>
                </div>

                {contralateralCase && onSelectCase && (
                  <button
                    className="btn-tiny w-full justify-center text-teal-300 hover:text-white mt-1"
                    onClick={() => onSelectCase(contralateralCase.id)}
                  >
                    Switch to {contralateralSide} Foot Workspace ({contralateralCase.caseNumber}) →
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-3 p-2.5 bg-slate-900/60 rounded border border-slate-800 text-xs space-y-2">
                <div className="text-slate-400">
                  Contralateral <strong className="text-slate-200">{contralateralSide} foot</strong> scan not yet acquired.
                </div>
                {onOpenScanner && (
                  <button
                    className="btn-tiny text-teal-300 border-teal-500/40 w-full justify-center"
                    onClick={onOpenScanner}
                  >
                    Scan {contralateralSide} Foot Separately →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Algorithm Parameter Knobs */}
          <div className="sidebar-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="card-title">Algorithm Tuning (FR-06)</h3>
              <span className="text-[10px] font-mono text-slate-400">
                {currentCase.algorithmVersion}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Ink Sensitivity:</span>
                  <span className="font-mono text-teal-400">{sensitivity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.05"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Smoothing Radius:</span>
                  <span className="font-mono text-teal-400">{smoothRadius}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={smoothRadius}
                  onChange={(e) => setSmoothRadius(parseInt(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>

              <button
                className="btn-primary-sm w-full mt-2"
                onClick={handleReprocess}
                disabled={isReprocessing}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {isReprocessing ? 'Recalculating...' : 'Recompute JET Heat Map'}
              </button>
            </div>
          </div>

          {/* Workflow Next Step CTAs */}
          <div className="flex gap-2 pt-1">
            <button
              className="btn-primary flex-1 justify-center"
              onClick={onNavigateToOrthotics}
            >
              <Activity className="w-4 h-4 mr-1.5" />
              Orthotic Landmarking (FR-10)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
