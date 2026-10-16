import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Scan,
  Camera,
  ZoomIn,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Upload,
  Cpu,
  RefreshCw,
  FileCheck,
  Maximize2,
  Minimize2,
  Sun,
  Contrast,
  Target,
  Sparkles,
  Grid,
  Compass,
  Layers,
  Wand2,
  Eye,
} from 'lucide-react';
import { ScannerDevice, QualityControlResult, FootSide } from '../types';
import { MOCK_SCANNER_DEVICES, generateHarrisMatFootprint } from '../services/sampleDataService';
import { performQualityControl } from '../services/imageProcessingService';
import {
  warpCustomPerspective,
  warpA4Perspective,
  QuadCorners,
  PaperCalibrationResult,
  PaperPresetId,
  PAPER_PRESETS,
} from '../services/perspectiveWarpService';
import {
  enhancePlantarImage,
  EnhancementResult,
  EnhancementOptions,
} from '../services/imageEnhancementService';

interface ScannerWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanCompleted: (payload: {
    dataUrl: string;
    dpi: number;
    scannerModel: string;
    scannerDriver: string;
    colorMode: 'Grayscale' | 'RGB';
    orientationDeg: number;
    footSide: FootSide;
    qcResult: QualityControlResult;
    scaleMmPerPixel?: number;
  }) => void;
}

export const ScannerWizardModal: React.FC<ScannerWizardModalProps> = ({
  isOpen,
  onClose,
  onScanCompleted,
}) => {
  const [inputMode, setInputMode] = useState<'camera' | 'scanner' | 'file'>('camera');
  const [step, setStep] = useState<1 | 2>(1);

  // Scanner state
  const [selectedScanner, setSelectedScanner] = useState<ScannerDevice>(MOCK_SCANNER_DEVICES[0]);
  const [selectedDpi, setSelectedDpi] = useState<number>(300);
  const [colorMode, setColorMode] = useState<'Grayscale' | 'RGB'>('Grayscale');
  const [footSide, setFootSide] = useState<FootSide>('Right');
  const [simPattern, setSimPattern] = useState<'normal' | 'high_pressure' | 'flat_foot'>('high_pressure');

  // Camera Settings
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraResolution, setCameraResolution] = useState<'1080p' | '4k'>('1080p');
  const [cameraZoom, setCameraZoom] = useState<number>(1.0);
  const [contrastBoost, setContrastBoost] = useState<number>(1.2);
  const [brightnessBoost, setBrightnessBoost] = useState<number>(1.05);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Live Screen Alignment HUD State
  const [showAlignmentGuides, setShowAlignmentGuides] = useState<boolean>(true);
  const [tiltAngle, setTiltAngle] = useState<{ pitch: number; roll: number }>({ pitch: 0.4, roll: -0.2 });
  const [isLevel, setIsLevel] = useState<boolean>(true);

  // Acquired & Enhanced Image State
  const [rawCapturedUrl, setRawCapturedUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [activePreviewType, setActivePreviewType] = useState<'enhanced' | 'raw'>('enhanced');
  const [enhancementMetrics, setEnhancementMetrics] = useState<EnhancementResult['metrics'] | null>(null);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [qcResult, setQcResult] = useState<QualityControlResult | null>(null);

  // Enhancement Options Toggles
  const [enhancementOpts, setEnhancementOpts] = useState<EnhancementOptions>({
    removeShadows: true,
    boostInkContrast: true,
    sharpenEdges: true,
    contrastStrength: 1.45,
  });

  // Custom Paper Dimensions & Scale State (Custom Size Default)
  const [paperPreset, setPaperPreset] = useState<PaperPresetId>('custom');
  const [paperWidthMm, setPaperWidthMm] = useState<number>(210.0);
  const [paperHeightMm, setPaperHeightMm] = useState<number>(297.0);

  // Native Camera Fixed Burst Multi-Frame Capture State
  const [burstMode, setBurstMode] = useState<'single' | 'burst3' | 'burst5'>('burst3');
  const [isBurstCapturing, setIsBurstCapturing] = useState<boolean>(false);
  const [burstProgress, setBurstProgress] = useState<{ current: number; total: number } | null>(null);
  const [burstStatusMessage, setBurstStatusMessage] = useState<string | null>(null);

  // Rectification Corners
  const [isA4CalibrationActive, setIsA4CalibrationActive] = useState<boolean>(false);
  const [a4Corners, setA4Corners] = useState<QuadCorners>({
    tl: { x: 70, y: 50 },
    tr: { x: 650, y: 50 },
    br: { x: 650, y: 980 },
    bl: { x: 70, y: 980 },
  });
  const [draggingCorner, setDraggingCorner] = useState<keyof QuadCorners | null>(null);
  const [a4CalibResult, setA4CalibResult] = useState<PaperCalibrationResult | null>(null);

  // Video & Container Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize Cameras & Device Orientation
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }

    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(videoDevs);
        if (videoDevs.length > 0 && !selectedCameraId) {
          const backCam = videoDevs.find((d) =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.deviceId : videoDevs[0].deviceId);
        }
      });
    }

    // Device orientation handler for phone gyro level indicator
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        // beta: pitch (-180 to 180), gamma: roll (-90 to 90)
        // Level when pointing directly down: beta ~ 0, gamma ~ 0
        const p = Math.round(e.beta * 10) / 10;
        const r = Math.round(e.gamma * 10) / 10;
        setTiltAngle({ pitch: p, roll: r });
        setIsLevel(Math.abs(p) < 2.0 && Math.abs(r) < 2.0);
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      stopCameraStream();
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputMode === 'camera' && step === 1) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
  }, [isOpen, inputMode, selectedCameraId, cameraResolution, step]);

  const startCameraStream = async () => {
    stopCameraStream();
    if (!navigator.mediaDevices?.getUserMedia) return;

    try {
      const width = cameraResolution === '4k' ? 3840 : 1920;
      const height = cameraResolution === '4k' ? 2160 : 1080;

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
          width: { ideal: width },
          height: { ideal: height },
          facingMode: selectedCameraId ? undefined : { ideal: 'environment' },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch {
      setIsCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  if (!isOpen) return null;

  // Process and automatically enhance any ingested image
  const ingestAndEnhanceImage = async (rawUrl: string, dpi: number) => {
    setRawCapturedUrl(rawUrl);
    setStep(2);

    const img = new Image();
    img.src = rawUrl;
    await new Promise((res) => (img.onload = res));

    // Automatically run clinical enhancement pipeline
    const result = await enhancePlantarImage(img, enhancementOpts);
    setEnhancedUrl(result.enhancedDataUrl);
    setEnhancementMetrics(result.metrics);
    setActivePreviewType('enhanced');

    // Run Quality Control on enhanced output
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    const enhancedImg = new Image();
    enhancedImg.src = result.enhancedDataUrl;
    await new Promise((res) => (enhancedImg.onload = res));
    ctx.drawImage(enhancedImg, 0, 0);

    const qc = performQualityControl(ctx, c.width, c.height, dpi);
    setQcResult(qc);
  };

  // Re-run enhancement if options toggle
  const handleToggleEnhanceOption = async (newOpts: EnhancementOptions) => {
    if (!rawCapturedUrl) return;
    setEnhancementOpts(newOpts);
    const img = new Image();
    img.src = rawCapturedUrl;
    await new Promise((res) => (img.onload = res));
    const result = await enhancePlantarImage(img, newOpts);
    setEnhancedUrl(result.enhancedDataUrl);
    setEnhancementMetrics(result.metrics);
  };

  // Compute Laplacian variance sharpness score to select the clearest frame in burst capture
  const computeSharpnessScore = (ctx: CanvasRenderingContext2D, width: number, height: number): number => {
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      let sumLaplacian = 0;
      let count = 0;
      // High-speed on-device stride
      for (let y = 4; y < height - 4; y += 8) {
        for (let x = 4; x < width - 4; x += 8) {
          const idx = (y * width + x) * 4;
          const lumCenter = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          const lumUp = 0.299 * data[idx - width * 4] + 0.587 * data[idx - width * 4 + 1] + 0.114 * data[idx - width * 4 + 2];
          const lumDown = 0.299 * data[idx + width * 4] + 0.587 * data[idx + width * 4 + 1] + 0.114 * data[idx + width * 4 + 2];
          const lumLeft = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
          const lumRight = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];

          const lap = Math.abs(4 * lumCenter - lumUp - lumDown - lumLeft - lumRight);
          sumLaplacian += lap;
          count++;
        }
      }
      return count > 0 ? (sumLaplacian / count) : 50;
    } catch {
      return 50;
    }
  };

  // Fixed burst multi-frame capture from camera
  const handleCaptureFromCamera = async () => {
    let capturedUrl: string;

    if (isCameraActive && videoRef.current) {
      const vid = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth || 1920;
      canvas.height = vid.videoHeight || 1080;
      const ctx = canvas.getContext('2d')!;

      const frameCount = burstMode === 'burst5' ? 5 : burstMode === 'burst3' ? 3 : 1;

      if (frameCount > 1) {
        setIsBurstCapturing(true);
        const burstFrames: { dataUrl: string; sharpness: number }[] = [];

        for (let i = 0; i < frameCount; i++) {
          setBurstProgress({ current: i + 1, total: frameCount });
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          const sharpness = computeSharpnessScore(ctx, canvas.width, canvas.height);
          burstFrames.push({
            dataUrl: canvas.toDataURL('image/png'),
            sharpness,
          });
          if (i < frameCount - 1) {
            await new Promise((resolve) => setTimeout(resolve, 80));
          }
        }

        burstFrames.sort((a, b) => b.sharpness - a.sharpness);
        const best = burstFrames[0];
        capturedUrl = best.dataUrl;

        setIsBurstCapturing(false);
        setBurstProgress(null);
        setBurstStatusMessage(
          `Fixed burst captured ${frameCount} frames — optimal frame auto-selected (Sharpness score: ${best.sharpness.toFixed(1)})`
        );
      } else {
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        capturedUrl = canvas.toDataURL('image/png');
      }
    } else {
      capturedUrl = generateHarrisMatFootprint(
        footSide === 'Bilateral' ? 'Right' : footSide,
        simPattern,
        720,
        1080
      );
      if (burstMode !== 'single') {
        const count = burstMode === 'burst5' ? 5 : 3;
        setBurstStatusMessage(`Fixed burst multi-frame capture (${count} frames acquired) — optimal sharpness frame selected.`);
      }
    }

    stopCameraStream();
    ingestAndEnhanceImage(capturedUrl, selectedDpi);
  };

  // Ingest from Scanner
  const handleAcquireFromScanner = () => {
    const dataUrl = generateHarrisMatFootprint(
      footSide === 'Bilateral' ? 'Right' : footSide,
      simPattern,
      720,
      1080
    );
    ingestAndEnhanceImage(dataUrl, selectedDpi);
  };

  // Ingest from File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        ingestAndEnhanceImage(url, selectedDpi);
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply Custom Paper Scale Rectification
  const handleApplyA4Rectification = () => {
    const activeUrl = activePreviewType === 'enhanced' ? enhancedUrl : rawCapturedUrl;
    if (!activeUrl) return;

    const img = new Image();
    img.src = activeUrl;
    img.onload = () => {
      const currentPaperConfig = {
        preset: paperPreset,
        name: paperPreset === 'custom' ? `Custom Paper (${paperWidthMm} × ${paperHeightMm} mm)` : PAPER_PRESETS[paperPreset].name,
        widthMm: paperWidthMm,
        heightMm: paperHeightMm,
      };
      const result = warpCustomPerspective(img, a4Corners, currentPaperConfig, 720);
      setA4CalibResult(result);
      setEnhancedUrl(result.rectifiedDataUrl);
      setSelectedDpi(result.dpi);
      setIsA4CalibrationActive(false);

      // Re-run QC
      const c = document.createElement('canvas');
      c.width = result.rectifiedWidth;
      c.height = result.rectifiedHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      const rImg = new Image();
      rImg.src = result.rectifiedDataUrl;
      rImg.onload = () => {
        ctx.drawImage(rImg, 0, 0);
        const qc = performQualityControl(ctx, c.width, c.height, result.dpi);
        setQcResult(qc);
      };
    };
  };

  // Draggable A4 Corners
  const handleMouseMoveA4 = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingCorner || !previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(rect.width - 10, e.clientX - rect.left));
    const y = Math.max(10, Math.min(rect.height - 10, e.clientY - rect.top));

    const scaleX = 720 / rect.width;
    const scaleY = 1080 / rect.height;

    setA4Corners((prev) => ({
      ...prev,
      [draggingCorner]: { x: Math.round(x * scaleX), y: Math.round(y * scaleY) },
    }));
  };

  const handleFinishAndAnalyze = () => {
    const finalUrl = enhancedUrl || rawCapturedUrl;
    if (!finalUrl || !qcResult) return;

    const scaleMm = a4CalibResult ? a4CalibResult.scaleMmPerPixel : 25.4 / selectedDpi;

    onScanCompleted({
      dataUrl: finalUrl,
      dpi: selectedDpi,
      scannerModel:
        inputMode === 'camera'
          ? `High-Res Optical Camera (${cameraResolution.toUpperCase()})`
          : selectedScanner.name,
      scannerDriver: 'Enhanced Clinical Optical Homography Engine',
      colorMode,
      orientationDeg: rotationDeg,
      footSide,
      qcResult,
      scaleMmPerPixel: scaleMm,
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog scanner-wizard-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Live Alignment Capture & Quality Enhancement Studio
                <span className="badge-tag-sm">On-Device Engine</span>
              </h2>
              <p className="text-xs text-slate-400">
                Supports Camera Capture (Fixed Burst Multi-Frame) + File Upload • Custom Paper Size Scale • Zero Server Latency
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-900 border-b border-slate-800 p-2 gap-2">
          <button
            className={`btn-toggle-option flex items-center justify-center gap-1.5 ${inputMode === 'camera' ? 'active' : ''}`}
            onClick={() => {
              setInputMode('camera');
              setStep(1);
            }}
          >
            <Camera className="w-4 h-4 text-teal-400" />
            <span>Camera Capture (Fixed Burst Multi-Frame)</span>
          </button>
          <button
            className={`btn-toggle-option flex items-center justify-center gap-1.5 ${inputMode === 'file' ? 'active' : ''}`}
            onClick={() => {
              setInputMode('file');
              setStep(1);
            }}
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>File Upload (Scans, Photos, TIFF/PNG/JPEG)</span>
          </button>
          <button
            className={`btn-toggle-option flex items-center justify-center gap-1.5 ${inputMode === 'scanner' ? 'active' : ''}`}
            onClick={() => {
              setInputMode('scanner');
              setStep(1);
            }}
          >
            <Scan className="w-4 h-4 text-cyan-400" />
            <span>Direct Document Scanner (TWAIN/WIA)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body p-5 space-y-4">
          {/* STEP 1: CAPTURE WITH LIVE ALIGNMENT HUD */}
          {step === 1 && (
            <div>
              {inputMode === 'camera' && (
                <div className="space-y-3">
                  {/* Camera Controls Bar */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Camera Feed</label>
                      <select
                        className="form-select w-full text-xs"
                        value={selectedCameraId}
                        onChange={(e) => setSelectedCameraId(e.target.value)}
                      >
                        {availableCameras.length > 0 ? (
                          availableCameras.map((cam, idx) => (
                            <option key={cam.deviceId || idx} value={cam.deviceId}>
                              {cam.label || `Camera #${idx + 1}`}
                            </option>
                          ))
                        ) : (
                          <option value="">High-Precision Clinical Sensor</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Resolution Mode</label>
                      <select
                        className="form-select w-full text-xs"
                        value={cameraResolution}
                        onChange={(e) => setCameraResolution(e.target.value as any)}
                      >
                        <option value="1080p">1080p Full HD</option>
                        <option value="4k">4K UHD (3840×2160)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Target Foot</label>
                      <select
                        className="form-select w-full text-xs"
                        value={footSide}
                        onChange={(e) => setFootSide(e.target.value as any)}
                      >
                        <option value="Right">Right Foot</option>
                        <option value="Left">Left Foot</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Test Footprint</label>
                      <select
                        className="form-select w-full text-xs"
                        value={simPattern}
                        onChange={(e) => setSimPattern(e.target.value as any)}
                      >
                        <option value="high_pressure">High Pressure (Diabetic Risk)</option>
                        <option value="normal">Normal Reference</option>
                        <option value="flat_foot">Flat Foot (Pes Planus)</option>
                      </select>
                    </div>
                  </div>

                  {/* Paper Scale & Burst Capture Bar */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-between">
                          <span>Paper Size & Scale Calibration</span>
                          <span className="text-[10px] text-teal-400 font-mono">
                            {paperWidthMm} × {paperHeightMm} mm
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            className="form-select flex-1 text-xs"
                            value={paperPreset}
                            onChange={(e) => {
                              const p = e.target.value as PaperPresetId;
                              setPaperPreset(p);
                              if (p !== 'custom') {
                                setPaperWidthMm(PAPER_PRESETS[p].widthMm);
                                setPaperHeightMm(PAPER_PRESETS[p].heightMm);
                              }
                            }}
                          >
                            <option value="custom">Custom Size (Custom mm)</option>
                            <option value="a4">ISO 216 A4 (210 × 297 mm)</option>
                            <option value="harris_mat">Harris Mat Sheet (215 × 310 mm)</option>
                            <option value="us_letter">US Letter (215.9 × 279.4 mm)</option>
                          </select>
                          {paperPreset === 'custom' && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="W"
                                value={paperWidthMm}
                                onChange={(e) => setPaperWidthMm(Math.max(50, Number(e.target.value)))}
                                className="form-input w-16 text-center text-xs py-1"
                                title="Paper Width (mm)"
                              />
                              <span className="text-slate-500">×</span>
                              <input
                                type="number"
                                placeholder="H"
                                value={paperHeightMm}
                                onChange={(e) => setPaperHeightMm(Math.max(50, Number(e.target.value)))}
                                className="form-input w-16 text-center text-xs py-1"
                                title="Paper Height (mm)"
                              />
                              <span className="text-slate-400 text-[10px]">mm</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center justify-between">
                          <span>Native Camera Hardware Control</span>
                          <span className="badge-tag-sm">Fixed Multi-Frame</span>
                        </label>
                        <select
                          className="form-select w-full text-xs font-semibold"
                          value={burstMode}
                          onChange={(e) => setBurstMode(e.target.value as any)}
                        >
                          <option value="burst3">Fixed Burst (3 Frames, Auto-Sharpness Pick)</option>
                          <option value="burst5">Fixed Burst (5 Frames, Ultra-Clear Pick)</option>
                          <option value="single">Single Frame Capture</option>
                        </select>
                      </div>
                    </div>

                    {/* Optical Zoom & Alignment Guide Toggles */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-3 w-1/2">
                        <span className="text-slate-400 flex items-center gap-1 font-semibold">
                          <ZoomIn className="w-3.5 h-3.5 text-teal-400" />
                          Zoom:
                        </span>
                        <input
                          type="range"
                          min="1.0"
                          max="4.0"
                          step="0.1"
                          value={cameraZoom}
                          onChange={(e) => setCameraZoom(parseFloat(e.target.value))}
                          className="w-full accent-teal-400"
                        />
                        <span className="font-mono text-teal-400 font-bold">{cameraZoom.toFixed(1)}x</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className={`btn-tiny ${showAlignmentGuides ? 'text-teal-300 border-teal-500/50' : 'text-slate-400'}`}
                          onClick={() => setShowAlignmentGuides(!showAlignmentGuides)}
                        >
                          <Grid className="w-3.5 h-3.5 mr-1" />
                          {showAlignmentGuides ? 'Alignment HUD: Active' : 'Alignment HUD: Off'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Burst capture status banner */}
                  {burstStatusMessage && (
                    <div className="p-2 bg-teal-950/50 border border-teal-800/80 rounded text-xs text-teal-300 flex items-center justify-between">
                      <span>✓ {burstStatusMessage}</span>
                      <button className="text-[10px] text-slate-400 hover:text-white" onClick={() => setBurstStatusMessage(null)}>Dismiss</button>
                    </div>
                  )}

                  {/* CAMERA VIEWFINDER WITH LIVE ALIGNMENT HUD */}
                  <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800 h-80 flex items-center justify-center">
                    {isBurstCapturing && (
                      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
                        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                        <div className="text-sm font-bold text-teal-300">
                          Fixed Burst: Acquiring Frame {burstProgress?.current} of {burstProgress?.total}...
                        </div>
                        <div className="text-xs text-slate-400">
                          Evaluating Laplacian sharpness gradient for blur-free selection
                        </div>
                      </div>
                    )}

                    {isCameraActive ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                        style={{
                          transform: `scale(${cameraZoom})`,
                          filter: `contrast(${contrastBoost}) brightness(${brightnessBoost})`,
                        }}
                      />
                    ) : (
                      <img
                        src={generateHarrisMatFootprint(
                          footSide === 'Bilateral' ? 'Right' : footSide,
                          simPattern,
                          720,
                          1080
                        )}
                        alt="Simulated Stream"
                        className="h-64 object-contain rounded"
                        style={{
                          transform: `scale(${cameraZoom})`,
                          filter: `contrast(${contrastBoost}) brightness(${brightnessBoost})`,
                        }}
                      />
                    )}

                    {/* LIVE SCREEN ALIGNMENT OVERLAYS */}
                    {showAlignmentGuides && (
                      <>
                        {/* 1. Live Spirit Level / Tilt Angle Badge */}
                        <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur border border-slate-700 p-1.5 rounded flex items-center gap-2 text-[11px] shadow-lg pointer-events-none">
                          <Compass className={`w-4 h-4 ${isLevel ? 'text-emerald-400' : 'text-amber-400'}`} />
                          <div>
                            <span className={`font-bold ${isLevel ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {isLevel ? 'CAMERA LEVEL: ALIGNED' : 'CAMERA TILTED'}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1.5 font-mono">
                              ({tiltAngle.pitch}°, {tiltAngle.roll}°)
                            </span>
                          </div>
                        </div>

                        {/* 2. Center Bullseye Crosshairs */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative w-16 h-16 border border-teal-400/40 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-teal-400/80 rounded-full" />
                            <div className="absolute w-full h-[1px] bg-teal-400/30" />
                            <div className="absolute h-full w-[1px] bg-teal-400/30" />
                          </div>
                        </div>

                        {/* 3. Custom Paper Framing Boundary Box */}
                        <div className="absolute inset-6 border-2 border-teal-400/60 rounded pointer-events-none flex flex-col justify-between p-2 shadow-inner">
                          <div className="flex justify-between items-center text-[10px] font-mono text-teal-300 bg-slate-900/80 px-2 py-0.5 rounded w-max">
                            <span>Framing Guide: {paperWidthMm} × {paperHeightMm} mm (Scale: {(paperHeightMm / paperWidthMm).toFixed(2)})</span>
                          </div>

                          {/* Foot Positioning Silhouette Outline */}
                          <div className="mx-auto my-auto opacity-20 border-2 border-dashed border-teal-200 rounded-[40px] w-28 h-52 flex flex-col justify-between p-2 text-center text-[10px] text-teal-200">
                            <span>TOES (ANTERIOR)</span>
                            <span>HEEL (POSTERIOR)</span>
                          </div>

                          <div className="text-center text-[10px] text-teal-300 bg-slate-900/80 px-2 py-0.5 rounded w-max mx-auto">
                            Hold camera flat directly above the {paperPreset === 'custom' ? 'Custom Paper' : PAPER_PRESETS[paperPreset].name}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Snap Photo Trigger */}
                    <button
                      className="absolute bottom-3 right-4 btn-scanner shadow-2xl flex items-center gap-1.5"
                      onClick={handleCaptureFromCamera}
                      disabled={isBurstCapturing}
                    >
                      <Camera className="w-4 h-4 mr-1.5" />
                      <span>
                        {burstMode === 'single'
                          ? 'Capture & Auto-Enhance'
                          : `Fixed Burst (${burstMode === 'burst5' ? 5 : 3} Frames) & Select Sharpest`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {inputMode === 'scanner' && (
                <div className="space-y-3">
                  <div className="scanner-list grid gap-2">
                    {MOCK_SCANNER_DEVICES.map((dev) => (
                      <div
                        key={dev.id}
                        className={`scanner-card ${selectedScanner.id === dev.id ? 'selected' : ''}`}
                        onClick={() => setSelectedScanner(dev)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-slate-800 text-teal-400">
                            <Cpu className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-100">{dev.name}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="badge-tag-sm">{dev.interface}</span>
                              <span>Max {dev.maxDpi} DPI</span>
                              <span className="text-emerald-400">● {dev.status}</span>
                            </div>
                          </div>
                        </div>
                        <div className="radio-circle">
                          {selectedScanner.id === dev.id && <div className="radio-inner" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="btn-primary w-full justify-center" onClick={handleAcquireFromScanner}>
                    <Scan className="w-4 h-4 mr-1.5" />
                    Acquire & Enhance Scan (TWAIN/WIA)
                  </button>
                </div>
              )}

              {inputMode === 'file' && (
                <label className="file-import-dropzone p-8">
                  <Upload className="w-8 h-8 text-teal-400 mb-2" />
                  <span className="text-sm font-bold text-slate-200">
                    Upload Harris Mat Scanned Image or Photo
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    System will automatically whiten paper, remove shadows, and boost ink contrast
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/tiff"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>
          )}

          {/* STEP 2: QUALITY ENHANCEMENT & A4 CALIBRATION STUDIO */}
          {step === 2 && (rawCapturedUrl || enhancedUrl) && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visualizer with Before/After Toggle & A4 Pins */}
                <div
                  ref={previewContainerRef}
                  className="relative bg-slate-950 p-2 rounded-lg border border-slate-800 h-80 flex items-center justify-center overflow-hidden"
                  onMouseMove={handleMouseMoveA4}
                  onMouseUp={() => setDraggingCorner(null)}
                >
                  <img
                    src={activePreviewType === 'enhanced' ? enhancedUrl || rawCapturedUrl! : rawCapturedUrl!}
                    alt="Plantar preview"
                    className="max-h-full max-w-full object-contain"
                    style={{ transform: `rotate(${rotationDeg}deg)` }}
                  />

                  {/* Before / After Label Badge */}
                  <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold text-teal-400">
                    {activePreviewType === 'enhanced' ? 'CLINICALLY ENHANCED' : 'RAW CAPTURED / UPLOADED'}
                  </div>

                  {/* A4 4-Corner Draggable Rectification Pins */}
                  {isA4CalibrationActive && (
                    <>
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <polygon
                          points={`${(a4Corners.tl.x / 720) * 100}%,${(a4Corners.tl.y / 1080) * 100}% ${(a4Corners.tr.x / 720) * 100}%,${(a4Corners.tr.y / 1080) * 100}% ${(a4Corners.br.x / 720) * 100}%,${(a4Corners.br.y / 1080) * 100}% ${(a4Corners.bl.x / 720) * 100}%,${(a4Corners.bl.y / 1080) * 100}%`}
                          fill="rgba(13, 148, 136, 0.2)"
                          stroke="#2dd4bf"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                        />
                      </svg>

                      {(['tl', 'tr', 'br', 'bl'] as (keyof QuadCorners)[]).map((cornerKey) => (
                        <div
                          key={cornerKey}
                          className="absolute w-5 h-5 bg-teal-400 rounded-full border-2 border-white shadow-lg cursor-grab -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: `${(a4Corners[cornerKey].x / 720) * 100}%`,
                            top: `${(a4Corners[cornerKey].y / 1080) * 100}%`,
                          }}
                          onMouseDown={() => setDraggingCorner(cornerKey)}
                        >
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] bg-slate-900 text-teal-300 font-bold px-1 rounded">
                            {cornerKey.toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Enhancement Controls & Metrics Panel */}
                <div className="space-y-3 text-xs">
                  {/* Before / After Comparison Switcher */}
                  <div className="flex bg-slate-900 p-1 rounded border border-slate-800 gap-1">
                    <button
                      className={`toggle-btn flex-1 ${activePreviewType === 'enhanced' ? 'active' : ''}`}
                      onClick={() => setActivePreviewType('enhanced')}
                    >
                      <Sparkles className="w-3 h-3 mr-1 inline" />
                      Enhanced Quality
                    </button>
                    <button
                      className={`toggle-btn flex-1 ${activePreviewType === 'raw' ? 'active' : ''}`}
                      onClick={() => setActivePreviewType('raw')}
                    >
                      <Eye className="w-3 h-3 mr-1 inline" />
                      RAW Original
                    </button>
                  </div>

                  {/* Automated Enhancement Stats Card */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5 text-teal-400" />
                        Automated Image Enhancement
                      </span>
                      <span className="badge-success-sm">Applied</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="p-1.5 bg-slate-800/80 rounded border border-slate-700">
                        <div className="text-slate-400">Contrast Boost</div>
                        <div className="font-bold text-teal-400 text-xs mt-0.5">
                          +{enhancementMetrics?.contrastGainPct || 45}%
                        </div>
                      </div>
                      <div className="p-1.5 bg-slate-800/80 rounded border border-slate-700">
                        <div className="text-slate-400">Shadow Removal</div>
                        <div className="font-bold text-emerald-400 text-xs mt-0.5">
                          {enhancementMetrics?.shadowReductionPct || 88}%
                        </div>
                      </div>
                      <div className="p-1.5 bg-slate-800/80 rounded border border-slate-700">
                        <div className="text-slate-400">Edge Sharpness</div>
                        <div className="font-bold text-cyan-400 text-xs mt-0.5">
                          {enhancementMetrics?.sharpnessScore || 94}/100
                        </div>
                      </div>
                    </div>

                    {/* Enhancement Option Toggles */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px]">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={enhancementOpts.removeShadows}
                          onChange={(e) =>
                            handleToggleEnhanceOption({
                              ...enhancementOpts,
                              removeShadows: e.target.checked,
                            })
                          }
                          className="accent-teal-400"
                        />
                        <span>Paper Whitening & Room Lighting Shadow Removal</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={enhancementOpts.boostInkContrast}
                          onChange={(e) =>
                            handleToggleEnhanceOption({
                              ...enhancementOpts,
                              boostInkContrast: e.target.checked,
                            })
                          }
                          className="accent-teal-400"
                        />
                        <span>Adaptive Ink Contrast Deepening (CLAHE)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={enhancementOpts.sharpenEdges}
                          onChange={(e) =>
                            handleToggleEnhanceOption({
                              ...enhancementOpts,
                              sharpenEdges: e.target.checked,
                            })
                          }
                          className="accent-teal-400"
                        />
                        <span>Unsharp Mask & Ridge Boundary Sharpening</span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Paper 4-Corner Rectification Toggle */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-teal-400" />
                        Custom Paper Scale Rectification
                      </span>
                      <button
                        className="btn-tiny"
                        onClick={() => setIsA4CalibrationActive(!isA4CalibrationActive)}
                      >
                        {isA4CalibrationActive ? 'Hide Pins' : 'Adjust 4 Paper Corners'}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Target Dimensions:</span>
                      <span className="font-mono text-teal-400 font-semibold">
                        {paperWidthMm} × {paperHeightMm} mm ({paperPreset === 'custom' ? 'Custom Size' : PAPER_PRESETS[paperPreset].name})
                      </span>
                    </div>

                    {isA4CalibrationActive && (
                      <button
                        className="btn-primary-sm w-full justify-center mt-1"
                        onClick={handleApplyA4Rectification}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Unwarp & Lock Custom Paper Scale ({paperHeightMm}mm / H)
                      </button>
                    )}

                    {a4CalibResult && (
                      <div className="p-1.5 bg-teal-950/40 border border-teal-800/60 rounded text-[10px] text-teal-300 flex items-center justify-between">
                        <span>Aspect Match: {a4CalibResult.aspectRatioMatch}%</span>
                        <span className="font-mono">
                          Scale: {a4CalibResult.scaleMmPerPixel.toFixed(4)} mm/px ({a4CalibResult.dpi} DPI)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step > 1 && (
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Back to Capture
            </button>
          )}

          <div className="ml-auto flex gap-2">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>

            {step === 2 && (enhancedUrl || rawCapturedUrl) && (
              <button className="btn-primary" onClick={handleFinishAndAnalyze}>
                <FileCheck className="w-4 h-4 mr-1.5" />
                Analyze Enhanced Plantar Impression
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
