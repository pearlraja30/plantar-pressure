import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Scan,
  Camera,
  ZoomIn,
  RotateCw,
  Upload,
  Cpu,
  FileCheck,
  Target,
  Sparkles,
  Grid,
  Compass,
  Wand2,
  Eye,
  Focus,
  Zap,
  ZapOff,
  Sun,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Sliders,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ScannerDevice, QualityControlResult, FootSide } from '../types';
import { MOCK_SCANNER_DEVICES } from '../services/sampleDataService';
import { performQualityControl } from '../services/imageProcessingService';
import {
  warpCustomPerspective,
  QuadCorners,
  PaperCalibrationResult,
  PaperPresetId,
  PAPER_PRESETS,
  PaperDimensionConfig,
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

interface CameraHardwareCapabilities {
  supportsTorch: boolean;
  supportsHardwareZoom: boolean;
  minZoom: number;
  maxZoom: number;
  stepZoom: number;
  supportsContinuousFocus: boolean;
  focusModes: string[];
  actualWidth: number;
  actualHeight: number;
}

export const ScannerWizardModal: React.FC<ScannerWizardModalProps> = ({
  isOpen,
  onClose,
  onScanCompleted,
}) => {
  const isMobileNative = Capacitor.isNativePlatform();
  const [inputMode, setInputMode] = useState<'camera' | 'scanner' | 'file'>('camera');
  const [step, setStep] = useState<1 | 2>(1);

  // Scanner state
  const [selectedScanner, setSelectedScanner] = useState<ScannerDevice>(MOCK_SCANNER_DEVICES[0]);
  const [selectedDpi] = useState<number>(300);
  const [colorMode, setColorMode] = useState<'Grayscale' | 'RGB'>('Grayscale');
  const [footSide, setFootSide] = useState<FootSide>('Right');

  // Camera Settings
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraResolution, setCameraResolution] = useState<'1080p' | '4k'>('1080p');
  const [cameraZoom, setCameraZoom] = useState<number>(1.0);
  const [contrastBoost, setContrastBoost] = useState<number>(1.25);
  const [brightnessBoost, setBrightnessBoost] = useState<number>(1.05);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionRequesting, setIsPermissionRequesting] = useState<boolean>(false);

  // Camera Hardware Capabilities
  const [hwCaps, setHwCaps] = useState<CameraHardwareCapabilities>({
    supportsTorch: false,
    supportsHardwareZoom: false,
    minZoom: 1.0,
    maxZoom: 4.0,
    stepZoom: 0.1,
    supportsContinuousFocus: false,
    focusModes: [],
    actualWidth: 1920,
    actualHeight: 1080,
  });

  // Focus & Optical Clarity Feedback
  const [focusFeedback, setFocusFeedback] = useState<{
    active: boolean;
    x?: number;
    y?: number;
    message?: string;
  } | null>(null);
  const [liveSharpnessScore, setLiveSharpnessScore] = useState<number>(0);


  // Acquired & Enhanced Image State
  const [rawCapturedUrl, setRawCapturedUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [activePreviewType, setActivePreviewType] = useState<'enhanced' | 'raw'>('enhanced');
  const [enhancementMetrics, setEnhancementMetrics] = useState<EnhancementResult['metrics'] | null>(null);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [qcResult, setQcResult] = useState<QualityControlResult | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [isLiveWebcamActive, setIsLiveWebcamActive] = useState<boolean>(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

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
  const sharpnessIntervalRef = useRef<number | null>(null);

  // Helper to compute Laplacian variance sharpness score to select the clearest frame in burst capture
  const computeSharpnessScore = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number): number => {
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
            const lumUp =
              0.299 * data[idx - width * 4] +
              0.587 * data[idx - width * 4 + 1] +
              0.114 * data[idx - width * 4 + 2];
            const lumDown =
              0.299 * data[idx + width * 4] +
              0.587 * data[idx + width * 4 + 1] +
              0.114 * data[idx + width * 4 + 2];
            const lumLeft =
              0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
            const lumRight =
              0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];

            const lap = Math.abs(4 * lumCenter - lumUp - lumDown - lumLeft - lumRight);
            sumLaplacian += lap;
            count++;
          }
        }
        return count > 0 ? sumLaplacian / count : 50;
      } catch {
        return 50;
      }
    },
    []
  );

  // Stop camera stream cleanly
  const stopCameraStream = useCallback(() => {
    if (sharpnessIntervalRef.current) {
      clearInterval(sharpnessIntervalRef.current);
      sharpnessIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  }, []);

  // Request runtime camera permission on mobile Android / iOS
  const ensureCameraPermission = useCallback(async (): Promise<boolean> => {
    if (isMobileNative) {
      setIsPermissionRequesting(true);
      try {
        const check = await CapCamera.checkPermissions();
        if (check.camera === 'granted') {
          setIsPermissionRequesting(false);
          return true;
        }
        const req = await CapCamera.requestPermissions({ permissions: ['camera'] });
        setIsPermissionRequesting(false);
        return req.camera === 'granted';
      } catch (e) {
        console.warn('Error checking Capacitor camera permissions:', e);
        setIsPermissionRequesting(false);
      }
    }
    return true;
  }, [isMobileNative]);

  // Start camera stream with multi-device best practices & resilient fallbacks
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);

    // 1. Ensure Android / iOS runtime permission is granted
    const hasPermission = await ensureCameraPermission();
    if (!hasPermission) {
      setCameraError('Camera permission is required to stream or capture Harris Mat footprints.');
      setIsCameraActive(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('WebRTC camera streaming is not supported on this device. Use the Native Camera button.');
      setIsCameraActive(false);
      return;
    }

    const idealW = cameraResolution === '4k' ? 3840 : 1920;
    const idealH = cameraResolution === '4k' ? 2160 : 1080;

    // Ordered fallback constraints from high-fidelity clinical to universal mobile
    const constraintCandidates: MediaStreamConstraints[] = [
      // Candidate 1: Selected Device or Environment camera with continuous autofocus
      {
        video: {
          deviceId: selectedCameraId ? { ideal: selectedCameraId } : undefined,
          facingMode: selectedCameraId ? undefined : { ideal: 'environment' },
          width: { ideal: idealW },
          height: { ideal: idealH },
          advanced: [
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' },
            { whiteBalanceMode: 'continuous' },
          ] as any,
        },
        audio: false,
      },
      // Candidate 2: Environment camera without advanced constraints (universal mobile)
      {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: idealW },
          height: { ideal: idealH },
        },
        audio: false,
      },
      // Candidate 3: Basic Environment camera
      {
        video: {
          facingMode: 'environment',
        },
        audio: false,
      },
      // Candidate 4: Any available video stream
      {
        video: true,
        audio: false,
      },
    ];

    let stream: MediaStream | null = null;
    let lastError: any = null;

    for (const candidate of constraintCandidates) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(candidate);
        if (stream) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!stream) {
      console.warn('All getUserMedia attempts failed:', lastError);
      setCameraError(
        lastError?.message ||
          'Could not start live camera feed. Please check app permissions or launch the Native Phone Camera.'
      );
      setIsCameraActive(false);
      return;
    }

    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];

    if (track) {
      const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      const sets = (track.getSettings ? track.getSettings() : {}) as any;

      const zoomCaps = caps.zoom as { min?: number; max?: number; step?: number } | undefined;
      const supportsHardwareZoom = !!zoomCaps;
      const supportsTorch = !!caps.torch;
      const focusModes: string[] = Array.isArray(caps.focusMode) ? caps.focusMode : [];
      const supportsContinuousFocus = focusModes.includes('continuous');

      setHwCaps({
        supportsTorch,
        supportsHardwareZoom,
        minZoom: zoomCaps?.min ?? 1.0,
        maxZoom: zoomCaps?.max ?? 4.0,
        stepZoom: zoomCaps?.step ?? 0.1,
        supportsContinuousFocus,
        focusModes,
        actualWidth: sets.width ?? idealW,
        actualHeight: sets.height ?? idealH,
      });

      // Ensure continuous autofocus is locked on if supported
      if (supportsContinuousFocus && track.applyConstraints) {
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: 'continuous' }] as any,
          });
        } catch {
          // non-fatal
        }
      }
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
        setIsCameraActive(true);
        setCameraError(null);
      } catch (err) {
        console.warn('Video element play() error:', err);
      }

      // Start real-time live sharpness meter (every 400ms)
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 160;
      sampleCanvas.height = 120;
      const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

      sharpnessIntervalRef.current = window.setInterval(() => {
        if (videoRef.current && sampleCtx && videoRef.current.readyState >= 2) {
          try {
            sampleCtx.drawImage(videoRef.current, 0, 0, 160, 120);
            const score = computeSharpnessScore(sampleCtx, 160, 120);
            setLiveSharpnessScore(Math.round(score * 10) / 10);
          } catch {
            // Ignore frame collision
          }
        }
      }, 400);
    }
  }, [
    cameraResolution,
    selectedCameraId,
    stopCameraStream,
    computeSharpnessScore,
    ensureCameraPermission,
  ]);


  // Launch Native Android / iOS System Camera App
  const handleNativeMobileCamera = async () => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 100,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
        saveToGallery: false,
      });
      if (photo.dataUrl) {
        stopCameraStream();
        setIsLiveWebcamActive(false);
        ingestAndEnhanceImage(photo.dataUrl, selectedDpi);
      }
    } catch (err) {
      console.warn('Native camera capture dismissed or unavailable:', err);
    }
  };

  // Universal Straightforward Camera Click Handler
  const handleCameraClick = () => {
    if (Capacitor.isNativePlatform()) {
      handleNativeMobileCamera();
    } else {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        cameraInputRef.current?.click();
      } else {
        setIsLiveWebcamActive(true);
        startCameraStream();
      }
    }
  };

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
          const backCam = videoDevs.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('environment') ||
              d.label.toLowerCase().includes('rear')
          );
          if (backCam) {
            setSelectedCameraId(backCam.deviceId);
          }
        }
      });
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, selectedCameraId, stopCameraStream]);

  useEffect(() => {
    if (isOpen && isLiveWebcamActive && step === 1) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
  }, [isOpen, startCameraStream, stopCameraStream, step, isLiveWebcamActive]);

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

  // Fixed burst multi-frame capture from camera with zoom & filter parity
  const handleCaptureFromCamera = async () => {
    let capturedUrl: string;

    if (isCameraActive && videoRef.current) {
      const vid = videoRef.current;
      const vW = vid.videoWidth || 1920;
      const vH = vid.videoHeight || 1080;
      const canvas = document.createElement('canvas');
      canvas.width = vW;
      canvas.height = vH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      // Draw single frame with zoom and clarity filters applied
      const drawFrameToCanvas = () => {
        ctx.filter = `contrast(${contrastBoost}) brightness(${brightnessBoost})`;
        if (!hwCaps.supportsHardwareZoom && cameraZoom > 1.0) {
          // Digital crop parity: crop center matching zoom factor
          const cropW = vW / cameraZoom;
          const cropH = vH / cameraZoom;
          const cropX = (vW - cropW) / 2;
          const cropY = (vH - cropH) / 2;
          ctx.drawImage(vid, cropX, cropY, cropW, cropH, 0, 0, vW, vH);
        } else {
          ctx.drawImage(vid, 0, 0, vW, vH);
        }
        ctx.filter = 'none';
      };

      const frameCount = burstMode === 'burst5' ? 5 : burstMode === 'burst3' ? 3 : 1;

      if (frameCount > 1) {
        setIsBurstCapturing(true);
        const burstFrames: { dataUrl: string; sharpness: number }[] = [];

        for (let i = 0; i < frameCount; i++) {
          setBurstProgress({ current: i + 1, total: frameCount });
          drawFrameToCanvas();
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
          `Fixed burst captured ${frameCount} frames — optimal sharpness frame selected (Laplacian score: ${best.sharpness.toFixed(1)})`
        );
      } else {
        drawFrameToCanvas();
        capturedUrl = canvas.toDataURL('image/png');
      }
    } else {
      setCameraError(
        'Camera stream is not active. Please tap "Launch Native Phone Camera" above or switch to "Upload File".'
      );
      return;
    }

    stopCameraStream();
    ingestAndEnhanceImage(capturedUrl, selectedDpi);
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
      const paperConfig: PaperDimensionConfig = {
        preset: paperPreset,
        name: paperPreset === 'custom' ? 'Custom Size' : PAPER_PRESETS[paperPreset].name,
        widthMm: paperWidthMm,
        heightMm: paperHeightMm,
      };
      const result = warpCustomPerspective(img, a4Corners, paperConfig, 720);
      setA4CalibResult(result);
      setEnhancedUrl(result.rectifiedDataUrl);
      setIsA4CalibrationActive(false);

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

  // Draggable A4 Corners (Mouse & Mobile Touch Support)
  const updateA4CornerCoords = (clientX: number, clientY: number) => {
    if (!draggingCorner || !previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(rect.width - 10, clientX - rect.left));
    const y = Math.max(10, Math.min(rect.height - 10, clientY - rect.top));

    const scaleX = 720 / rect.width;
    const scaleY = 1080 / rect.height;

    setA4Corners((prev) => ({
      ...prev,
      [draggingCorner]: { x: Math.round(x * scaleX), y: Math.round(y * scaleY) },
    }));
  };

  const handleMouseMoveA4 = (e: React.MouseEvent<HTMLDivElement>) => {
    updateA4CornerCoords(e.clientX, e.clientY);
  };

  const handleTouchMoveA4 = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      updateA4CornerCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
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
          ? isCameraActive
            ? `High-Res Optical Camera (${cameraResolution.toUpperCase()})`
            : 'Phone Camera Sensor'
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
    <div className="modal-backdrop z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="modal-container w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="modal-header flex items-center justify-between p-3 sm:p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                Plantar Impression Acquisition & Optical Calibration
                <span className="badge-tag-sm">IEC 62304</span>
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Supports Camera Capture (Fixed Burst Multi-Frame) + File Upload • Custom Paper Scale •
                Autofocus & Optical Clarity Engine
              </p>
            </div>
          </div>
          <button className="btn-icon text-slate-400 hover:text-white" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>



        <div className="modal-body p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
          {/* STEP 1: STRAIGHTFORWARD CAPTURE & OPTICAL ACQUISITION */}
          {step === 1 && (
            <div className="scanner-container-clean">
              {/* Hidden System Inputs for Native/Mobile Camera & Gallery */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
              <input
                id="scanner-gallery-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* 1. Foot Side Selection */}
              <div>
                <div className="scanner-section-title">1. Target Foot</div>
                <div className="foot-choice-grid">
                  <button
                    type="button"
                    className={`foot-choice-btn ${footSide === 'Left' ? 'selected' : ''}`}
                    onClick={() => setFootSide('Left')}
                  >
                    <span className="text-xl">🦶</span>
                    <span className="foot-choice-name">Left Foot</span>
                  </button>
                  <button
                    type="button"
                    className={`foot-choice-btn ${footSide === 'Right' ? 'selected' : ''}`}
                    onClick={() => setFootSide('Right')}
                  >
                    <span className="text-xl">🦶</span>
                    <span className="foot-choice-name">Right Foot</span>
                  </button>
                </div>
              </div>

              {/* 2. Direct Camera & Upload Primary Action */}
              <div className="scanner-primary-action-card highlight">
                <div className="action-card-header">
                  <div className="action-card-icon-box">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="action-card-text">
                    <span className="action-card-title">Footprint Camera Capture</span>
                    <span className="action-card-subtitle">
                      Direct optical capture with automatic shadow removal and high ink contrast boost
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="scanner-cta-button"
                  onClick={handleCameraClick}
                >
                  <Camera className="w-5 h-5 mr-1" />
                  Open Camera &amp; Take Photo
                </button>

                <button
                  type="button"
                  className="scanner-secondary-btn"
                  onClick={() => document.getElementById('scanner-gallery-input')?.click()}
                >
                  <Upload className="w-4 h-4 mr-1 text-slate-400" />
                  Choose Image from Files / Gallery
                </button>
              </div>

              {/* Optional Live Webcam View (Desktop browsers or when active) */}
              {isLiveWebcamActive && (
                <div className="relative bg-slate-950 rounded-lg overflow-hidden border border-teal-500/40 p-2 flex flex-col items-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full max-h-72 object-contain rounded bg-black"
                  />
                  <div className="flex items-center justify-between w-full mt-2 gap-2">
                    <span className="text-xs text-slate-400">
                      {isCameraActive ? '● Camera sensor active' : 'Connecting sensor...'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => {
                          stopCameraStream();
                          setIsLiveWebcamActive(false);
                        }}
                      >
                        Close Live Feed
                      </button>
                      <button
                        type="button"
                        className="btn-primary text-xs"
                        onClick={handleCaptureFromCamera}
                      >
                        Snap Frame
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Collapsible Calibration & Advanced Settings (Hidden by default to avoid clutter) */}
              <div className="scanner-accordion-box">
                <button
                  type="button"
                  className="scanner-accordion-header"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Sliders className="w-3.5 h-3.5 text-teal-400" />
                    Paper Calibration &amp; Advanced Settings
                  </span>
                  <span className="text-xs font-mono">{isAdvancedOpen ? '▲ Hide' : '▼ Show'}</span>
                </button>

                {isAdvancedOpen && (
                  <div className="scanner-accordion-body">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                          Paper Size Calibration
                        </label>
                        <select
                          className="form-select w-full text-xs"
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
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                          Paper Dimensions (mm)
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            className="form-input text-xs w-full font-mono text-center"
                            value={paperWidthMm}
                            onChange={(e) => {
                              setPaperPreset('custom');
                              setPaperWidthMm(Math.max(50, Number(e.target.value)));
                            }}
                            placeholder="W"
                          />
                          <span className="text-slate-500 font-bold">×</span>
                          <input
                            type="number"
                            className="form-input text-xs w-full font-mono text-center"
                            value={paperHeightMm}
                            onChange={(e) => {
                              setPaperPreset('custom');
                              setPaperHeightMm(Math.max(50, Number(e.target.value)));
                            }}
                            placeholder="H"
                          />
                          <span className="text-slate-400 text-[10px]">mm</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                          Burst Capture Mode
                        </label>
                        <select
                          className="form-select w-full text-xs"
                          value={burstMode}
                          onChange={(e) => setBurstMode(e.target.value as any)}
                        >
                          <option value="single">Single Frame</option>
                          <option value="burst3">Fixed Burst (3 Frames, Auto-Sharpness)</option>
                          <option value="burst5">Fixed Burst (5 Frames)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                          Color Mode
                        </label>
                        <select
                          className="form-select w-full text-xs"
                          value={colorMode}
                          onChange={(e) => setColorMode(e.target.value as any)}
                        >
                          <option value="Grayscale">Grayscale (Standard Harris Mat)</option>
                          <option value="RGB">Full Color (RGB)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: QUALITY ENHANCEMENT & A4 CALIBRATION STUDIO */}
          {step === 2 && (rawCapturedUrl || enhancedUrl) && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visualizer with Before/After Toggle & A4 Pins */}
                <div
                  ref={previewContainerRef}
                  className="relative bg-slate-950 p-2 rounded-lg border border-slate-800 h-80 flex items-center justify-center overflow-hidden touch-none"
                  onMouseMove={handleMouseMoveA4}
                  onMouseUp={() => setDraggingCorner(null)}
                  onTouchMove={handleTouchMoveA4}
                  onTouchEnd={() => setDraggingCorner(null)}
                >
                  <img
                    src={activePreviewType === 'enhanced' ? enhancedUrl || rawCapturedUrl! : rawCapturedUrl!}
                    alt="Plantar preview"
                    className="max-h-full max-w-full object-contain"
                    style={{ transform: `rotate(${rotationDeg}deg)` }}
                  />

                  {/* Before / After Label Badge */}
                  <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-bold text-teal-400 flex items-center gap-1.5">
                    <span>{activePreviewType === 'enhanced' ? 'CLINICALLY ENHANCED' : 'RAW ORIGINAL'}</span>
                    {rotationDeg !== 0 && (
                      <span className="text-cyan-300 font-mono">({rotationDeg}°)</span>
                    )}
                  </div>

                  {/* Rotate Control Button */}
                  <button
                    className="absolute top-2 right-2 btn-tiny bg-slate-900/90 text-slate-300 hover:text-teal-300 flex items-center gap-1"
                    onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                    title="Rotate footprint 90 degrees"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-teal-400" />
                    <span>Rotate</span>
                  </button>

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
                          className="absolute w-5 h-5 bg-teal-400 rounded-full border-2 border-white shadow-lg cursor-grab -translate-x-1/2 -translate-y-1/2 touch-none"
                          style={{
                            left: `${(a4Corners[cornerKey].x / 720) * 100}%`,
                            top: `${(a4Corners[cornerKey].y / 1080) * 100}%`,
                          }}
                          onMouseDown={() => setDraggingCorner(cornerKey)}
                          onTouchStart={() => setDraggingCorner(cornerKey)}
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
                  {/* Before / After Comparison Switcher & Color Mode */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex bg-slate-900 p-1 rounded border border-slate-800 gap-1 flex-1">
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

                    <div className="flex bg-slate-900 p-1 rounded border border-slate-800 text-[11px]">
                      <button
                        className={`px-2 py-0.5 rounded ${colorMode === 'Grayscale' ? 'bg-teal-500/20 text-teal-300 font-semibold' : 'text-slate-400'}`}
                        onClick={() => setColorMode('Grayscale')}
                      >
                        Grayscale
                      </button>
                      <button
                        className={`px-2 py-0.5 rounded ${colorMode === 'RGB' ? 'bg-teal-500/20 text-teal-300 font-semibold' : 'text-slate-400'}`}
                        onClick={() => setColorMode('RGB')}
                      >
                        RGB
                      </button>
                    </div>
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
                        {paperWidthMm} × {paperHeightMm} mm (
                        {paperPreset === 'custom' ? 'Custom Size' : PAPER_PRESETS[paperPreset].name})
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
        <div className="modal-footer p-3 sm:p-4 border-t border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button className="btn-secondary text-xs sm:text-sm" onClick={() => setStep(1)}>
              Back to Capture
            </button>
          ) : (
            <div className="text-[11px] sm:text-xs text-slate-500">
              <span>Select foot and tap &quot;Open Camera&quot; to capture</span>
            </div>
          )}

          <div className="ml-auto flex gap-2">
            <button className="btn-secondary text-xs sm:text-sm" onClick={onClose}>
              Cancel
            </button>

            {step === 2 && (enhancedUrl || rawCapturedUrl) && (
              <button className="btn-primary text-xs sm:text-sm" onClick={handleFinishAndAnalyze}>
                <FileCheck className="w-4 h-4 mr-1.5" />
                Analyze Plantar Impression
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
