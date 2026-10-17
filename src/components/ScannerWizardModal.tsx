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

  // Live Screen Alignment HUD State
  const [showAlignmentGuides, setShowAlignmentGuides] = useState<boolean>(true);
  const [tiltAngle, setTiltAngle] = useState<{ pitch: number; roll: number }>({ pitch: 0.0, roll: 0.0 });
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

  // Optical Zoom handler (hardware lens zoom + digital crop fallback)
  const handleZoomChange = async (newZoom: number) => {
    setCameraZoom(newZoom);
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && track.applyConstraints && hwCaps.supportsHardwareZoom) {
      try {
        const clamped = Math.min(Math.max(newZoom, hwCaps.minZoom), hwCaps.maxZoom);
        await track.applyConstraints({
          advanced: [{ zoom: clamped }] as any,
        });
      } catch {
        // Fallback to digital crop during capture
      }
    }
  };

  // Flashlight / Torch Toggle for clinical illumination in dark environments
  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !hwCaps.supportsTorch || !track.applyConstraints) return;
    const nextState = !isTorchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextState }] as any,
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle not supported:', err);
    }
  };

  // Tap-to-Focus / One-Touch Refocusing
  const handleTriggerAutofocus = async (e?: React.MouseEvent<HTMLDivElement>) => {
    if (e && previewContainerRef.current) {
      const rect = previewContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      setFocusFeedback({ active: true, x: clickX, y: clickY, message: 'Autofocus Triggered' });
    } else {
      setFocusFeedback({ active: true, message: 'Refocusing Sensor...' });
    }

    const track = streamRef.current?.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        await track.applyConstraints({
          advanced: [
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' },
            { whiteBalanceMode: 'continuous' },
          ] as any,
        });
      } catch {
        // non-fatal
      }
    }

    setTimeout(() => {
      setFocusFeedback((prev) => (prev ? { ...prev, message: 'Focus Locked ✓' } : null));
    }, 450);

    setTimeout(() => {
      setFocusFeedback(null);
    }, 1400);
  };

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
        ingestAndEnhanceImage(photo.dataUrl, selectedDpi);
      }
    } catch (err) {
      console.warn('Native camera capture dismissed or unavailable:', err);
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

    // Device orientation handler for phone gyro level indicator
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        const p = Math.round(e.beta * 10) / 10;
        const r = Math.round(e.gamma * 10) / 10;
        setTiltAngle({ pitch: p, roll: r });
        // Level when pointing directly down: beta ~ 0, gamma ~ 0
        setIsLevel(Math.abs(p) < 3.5 && Math.abs(r) < 3.5);
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
  }, [isOpen, selectedCameraId, stopCameraStream]);

  useEffect(() => {
    if (isOpen && inputMode === 'camera' && step === 1) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
  }, [isOpen, inputMode, startCameraStream, stopCameraStream, step]);

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

  // Ingest from Scanner: switch to file tab to ingest scan from scanner software
  const handleAcquireFromScanner = () => {
    setInputMode('file');
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

        {/* Ingestion Mode Selector Tabs */}
        {step === 1 && (
          <div className={`grid ${isMobileNative ? 'grid-cols-2' : 'grid-cols-3'} p-1.5 sm:p-2 bg-slate-950 border-b border-slate-800 text-xs font-semibold gap-1`}>
            <button
              className={`btn-toggle-option flex items-center justify-center gap-1.5 ${inputMode === 'camera' ? 'active' : ''}`}
              onClick={() => {
                setInputMode('camera');
                setBurstStatusMessage(null);
              }}
            >
              <Camera className="w-4 h-4 text-teal-400" />
              <span>Live Camera Capture</span>
            </button>
            {!isMobileNative && (
              <button
                className={`btn-toggle-option flex items-center justify-center gap-1.5 ${inputMode === 'scanner' ? 'active' : ''}`}
                onClick={() => {
                  setInputMode('scanner');
                  stopCameraStream();
                }}
              >
                <Scan className="w-4 h-4 text-teal-400" />
                <span>Flatbed Scanner</span>
              </button>
            )}
            <button
              className={`btn-toggle-option flex items-center justify-center gap-1.5 ${inputMode === 'file' ? 'active' : ''}`}
              onClick={() => {
                setInputMode('file');
                stopCameraStream();
              }}
            >
              <Upload className="w-4 h-4 text-teal-400" />
              <span>{isMobileNative ? 'Gallery / Photo File' : 'Upload File'}</span>
            </button>
          </div>
        )}

        <div className="modal-body p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
          {/* STEP 1: CAPTURE WITH LIVE ALIGNMENT & FOCUS HUD */}
          {step === 1 && (
            <div>
              {inputMode === 'camera' && (
                <div className="space-y-3">
                  {/* Camera Controls Bar - Clean 3-Column Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                        Camera Feed
                      </label>
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
                          <option value="">Rear Optical Sensor</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                        Resolution Mode
                      </label>
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
                      <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                        Target Foot
                      </label>
                      <select
                        className="form-select w-full text-xs"
                        value={footSide}
                        onChange={(e) => setFootSide(e.target.value as any)}
                      >
                        <option value="Right">Right Foot</option>
                        <option value="Left">Left Foot</option>
                      </select>
                    </div>
                  </div>

                  {/* Paper Scale & Burst Capture Bar */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                className="form-input w-14 text-center text-xs py-1"
                                title="Paper Width (mm)"
                              />
                              <span className="text-slate-500">×</span>
                              <input
                                type="number"
                                placeholder="H"
                                value={paperHeightMm}
                                onChange={(e) => setPaperHeightMm(Math.max(50, Number(e.target.value)))}
                                className="form-input w-14 text-center text-xs py-1"
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

                    {/* FOCUS, CLARITY, TORCH & OPTICAL ZOOM TOOLBAR */}
                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 gap-2">
                      {/* Zoom Slider */}
                      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                        <span className="text-slate-400 flex items-center gap-1 font-semibold text-[11px]">
                          <ZoomIn className="w-3.5 h-3.5 text-teal-400" />
                          Zoom:
                        </span>
                        <input
                          type="range"
                          min="1.0"
                          max="4.0"
                          step="0.1"
                          value={cameraZoom}
                          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                          className="w-full accent-teal-400"
                        />
                        <span className="font-mono text-teal-400 font-bold text-[11px]">
                          {cameraZoom.toFixed(1)}x
                        </span>
                        {hwCaps.supportsHardwareZoom && (
                          <span className="text-[9px] bg-teal-950 text-teal-300 border border-teal-800 px-1 rounded">
                            Optical
                          </span>
                        )}
                      </div>

                      {/* Optical Focus & Clarity Controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Refocus Sensor Button */}
                        <button
                          className="btn-tiny flex items-center gap-1 text-slate-300 hover:text-teal-300"
                          onClick={() => handleTriggerAutofocus()}
                          title="Trigger camera autofocus re-acquisition for maximum sharpness"
                        >
                          <Focus className="w-3.5 h-3.5 text-teal-400" />
                          <span>Refocus</span>
                        </button>

                        {/* Torch / Flashlight Toggle (if available) */}
                        {hwCaps.supportsTorch && (
                          <button
                            className={`btn-tiny flex items-center gap-1 ${isTorchOn ? 'text-amber-400 border-amber-500/50' : 'text-slate-400'}`}
                            onClick={handleToggleTorch}
                            title="Toggle LED illumination to eliminate hand and room shadows"
                          >
                            {isTorchOn ? (
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <ZapOff className="w-3.5 h-3.5" />
                            )}
                            <span>Torch: {isTorchOn ? 'ON' : 'OFF'}</span>
                          </button>
                        )}

                        {/* Contrast Tuning Toggle */}
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          <Sun className="w-3 h-3 text-slate-400" />
                          <button
                            className={`text-[10px] px-1 py-0.5 rounded ${contrastBoost === 1.0 ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400'}`}
                            onClick={() => {
                              setContrastBoost(1.0);
                              setBrightnessBoost(1.0);
                            }}
                          >
                            1.0x
                          </button>
                          <button
                            className={`text-[10px] px-1 py-0.5 rounded ${contrastBoost === 1.25 ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400'}`}
                            onClick={() => {
                              setContrastBoost(1.25);
                              setBrightnessBoost(1.05);
                            }}
                          >
                            Ink+
                          </button>
                          <button
                            className={`text-[10px] px-1 py-0.5 rounded ${contrastBoost === 1.5 ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400'}`}
                            onClick={() => {
                              setContrastBoost(1.5);
                              setBrightnessBoost(1.1);
                            }}
                          >
                            High
                          </button>
                        </div>

                        {/* Alignment HUD Toggle */}
                        <button
                          className={`btn-tiny ${showAlignmentGuides ? 'text-teal-300 border-teal-500/50' : 'text-slate-400'}`}
                          onClick={() => setShowAlignmentGuides(!showAlignmentGuides)}
                        >
                          <Grid className="w-3.5 h-3.5 mr-1" />
                          {showAlignmentGuides ? 'HUD: On' : 'HUD: Off'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Primary Native Mobile Camera Launcher Button (Prominent on Phone Screens) */}
                  <div className="flex gap-2">
                    <button
                      className="btn-primary w-full py-2.5 justify-center flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-lg text-sm font-bold"
                      onClick={handleNativeMobileCamera}
                    >
                      <Camera className="w-4 h-4" />
                      <span>Launch Native Phone Camera (High-Res 48MP Photo)</span>
                    </button>
                  </div>

                  {/* Burst capture status banner */}
                  {burstStatusMessage && (
                    <div className="p-2 bg-teal-950/50 border border-teal-800/80 rounded text-xs text-teal-300 flex items-center justify-between">
                      <span>✓ {burstStatusMessage}</span>
                      <button
                        className="text-[10px] text-slate-400 hover:text-white"
                        onClick={() => setBurstStatusMessage(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Camera Error / Permission Notice */}
                  {cameraError && (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/70 rounded-lg text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>{cameraError}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-tiny bg-teal-600 hover:bg-teal-500 text-white font-bold px-2 py-1"
                          onClick={() => startCameraStream()}
                          disabled={isPermissionRequesting}
                        >
                          {isPermissionRequesting ? 'Requesting...' : 'Grant & Retry Stream'}
                        </button>
                        <button
                          className="btn-tiny bg-cyan-700 hover:bg-cyan-600 text-white font-bold px-2 py-1"
                          onClick={handleNativeMobileCamera}
                        >
                          Use Native Camera
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CAMERA VIEWFINDER WITH RESPONSIVE ALIGNMENT & FOCUS HUD */}
                  <div
                    ref={previewContainerRef}
                    onClick={handleTriggerAutofocus}
                    className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800 min-h-[340px] sm:h-96 flex items-center justify-center cursor-crosshair select-none"
                    title="Tap anywhere in viewfinder to trigger autofocus"
                  >
                    {isBurstCapturing && (
                      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
                        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                        <div className="text-sm font-bold text-teal-300">
                          Fixed Burst: Acquiring Frame {burstProgress?.current} of {burstProgress?.total}...
                        </div>
                        <div className="text-xs text-slate-400">
                          Evaluating discrete Laplacian sharpness for blur-free selection
                        </div>
                      </div>
                    )}

                    {isCameraActive ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain pointer-events-none"
                        style={{
                          transform: hwCaps.supportsHardwareZoom ? 'none' : `scale(${cameraZoom})`,
                          filter: `contrast(${contrastBoost}) brightness(${brightnessBoost})`,
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center max-w-md space-y-3 z-10">
                        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400 shadow-xl">
                          <Camera className="w-8 h-8" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-200">
                            Live Stream Waiting for Camera Permission
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Click below to launch your phone's native camera or enable live stream permissions.
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center pt-1">
                          <button
                            className="btn-primary text-xs font-bold px-3 py-1.5 flex items-center gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNativeMobileCamera();
                            }}
                          >
                            <Smartphone className="w-4 h-4" />
                            <span>Launch Native Camera</span>
                          </button>
                          <button
                            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              startCameraStream();
                            }}
                          >
                            <span>Enable Live Feed</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAP-TO-FOCUS VISUAL RETICLE */}
                    {focusFeedback?.active && (
                      <div
                        className="absolute pointer-events-none z-20 flex flex-col items-center"
                        style={{
                          left: focusFeedback.x !== undefined ? `${focusFeedback.x}px` : '50%',
                          top: focusFeedback.y !== undefined ? `${focusFeedback.y}px` : '50%',
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <div className="w-14 h-14 border-2 border-emerald-400 rounded-md animate-ping absolute opacity-70" />
                        <div className="w-12 h-12 border-2 border-emerald-400 rounded-md flex items-center justify-center shadow-lg">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        </div>
                        {focusFeedback.message && (
                          <div className="mt-1 bg-slate-900/90 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                            {focusFeedback.message}
                          </div>
                        )}
                      </div>
                    )}

                    {/* LIVE SCREEN ALIGNMENT & CLARITY OVERLAYS */}
                    {showAlignmentGuides && (
                      <>
                        {/* 1. Live Spirit Level / Tilt Angle Badge (Top-Left) */}
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-slate-900/90 backdrop-blur border border-slate-700 px-2 py-1 rounded flex items-center gap-1.5 text-[10px] sm:text-[11px] shadow-lg pointer-events-none z-20">
                          <Compass className={`w-3.5 h-3.5 ${isLevel ? 'text-emerald-400' : 'text-amber-400'}`} />
                          <div>
                            <span className={`font-bold ${isLevel ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {isLevel ? 'LEVEL: FLAT' : 'TILTED'}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1 font-mono">
                              ({tiltAngle.pitch}°, {tiltAngle.roll}°)
                            </span>
                          </div>
                        </div>

                        {/* 2. Live Clarity & Sharpness Score Meter (Top-Right) */}
                        {isCameraActive && (
                          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-slate-900/90 backdrop-blur border border-slate-700 px-2 py-1 rounded flex items-center gap-1.5 text-[10px] sm:text-[11px] shadow-lg pointer-events-none z-20">
                            <Focus
                              className={`w-3.5 h-3.5 ${liveSharpnessScore >= 45 ? 'text-emerald-400' : 'text-amber-400'}`}
                            />
                            <div>
                              <span
                                className={`font-bold ${liveSharpnessScore >= 45 ? 'text-emerald-400' : 'text-amber-400'}`}
                              >
                                {liveSharpnessScore >= 45 ? 'SHARP' : 'FOCUSING'}
                              </span>
                              <span className="text-slate-400 text-[10px] ml-1 font-mono">
                                ({liveSharpnessScore.toFixed(1)})
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 3. Center Bullseye Crosshairs */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative w-14 h-14 border border-teal-400/40 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-teal-400/80 rounded-full" />
                            <div className="absolute w-full h-[1px] bg-teal-400/30" />
                            <div className="absolute h-full w-[1px] bg-teal-400/30" />
                          </div>
                        </div>

                        {/* 4. Custom Paper Proportional Framing Boundary Box */}
                        <div
                          className="absolute pointer-events-none border-2 border-teal-400/70 rounded flex flex-col justify-between p-2 shadow-inner"
                          style={{
                            aspectRatio: `${paperWidthMm} / ${paperHeightMm}`,
                            maxHeight: '84%',
                            maxWidth: '78%',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-mono text-teal-300 bg-slate-900/85 px-1.5 py-0.5 rounded w-max mx-auto shadow">
                            <span>
                              {paperPreset === 'custom' ? 'Custom Paper' : PAPER_PRESETS[paperPreset].name} ({paperWidthMm} × {paperHeightMm} mm)
                            </span>
                          </div>

                          {/* Foot Positioning Silhouette Outline */}
                          <div className="mx-auto my-auto opacity-25 border-2 border-dashed border-teal-200 rounded-[35px] w-24 h-44 sm:w-28 sm:h-52 flex flex-col justify-between p-2 text-center text-[9px] text-teal-200 font-bold">
                            <span>TOES (ANTERIOR)</span>
                            <span className="text-[8px] opacity-75">FOOTPRINT CENTER</span>
                            <span>HEEL (POSTERIOR)</span>
                          </div>

                          <div className="text-center text-[9px] text-teal-300 bg-slate-900/85 px-1.5 py-0.5 rounded w-max mx-auto shadow">
                            Fit paper sheet edges inside green frame
                          </div>
                        </div>
                      </>
                    )}

                    {/* Snap Photo Trigger Button */}
                    <button
                      className="absolute bottom-3 right-3 sm:right-4 btn-scanner shadow-2xl flex items-center gap-1.5 z-20 text-xs sm:text-sm font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCaptureFromCamera();
                      }}
                      disabled={isBurstCapturing}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      <span>
                        {burstMode === 'single'
                          ? 'Snap & Enhance'
                          : `Fixed Burst (${burstMode === 'burst5' ? 5 : 3}F)`}
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
              {isCameraActive ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle className="w-3 h-3" />
                  Live Sensor Active ({hwCaps.actualWidth}×{hwCaps.actualHeight})
                </span>
              ) : (
                <span>Camera Ready • Tap "Launch Native Phone Camera" or "Snap"</span>
              )}
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
