// Sample Medical Data & Procedural Harris Mat Impression Generator
// Generates realistic Harris Mat foot impressions matching Appendix B
import {
  Patient,
  AnalysisCase,
  ScannerDevice,
  CLINICAL_CATEGORIES,
} from '../types';
import { processHarrisMatScan } from './imageProcessingService';

/**
 * Procedurally draws a realistic Harris Mat foot impression on an offscreen canvas
 * Harris Mat impressions feature:
 * - Characteristic dark violet / indigo ink grid / stipple pattern
 * - Dense continuous contact on heel and metatarsal heads
 * - Narrower contact on lateral arch (or absent in high arch, wide in flat foot)
 * - Distinct toe prints (Hallux and toes 2-5)
 */
export function generateHarrisMatFootprint(
  footSide: 'Left' | 'Right' = 'Right',
  footType: 'normal' | 'high_pressure' | 'flat_foot' | 'blank' | 'clipped' = 'normal',
  width: number = 720,
  height: number = 1080
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Paper background: slightly textured off-white / clinical scanner background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Return blank if requested (for QC testing)
  if (footType === 'blank') {
    return canvas.toDataURL('image/png');
  }

  // Scanner subtle margins & paper shadow
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(20, 20, width - 40, height - 40);

  ctx.save();

  // If Left foot, flip horizontally
  const cx = width / 2;
  if (footSide === 'Left') {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  // Adjust placement if clipped
  const offsetY = footType === 'clipped' ? -120 : 60;
  const offsetX = footType === 'clipped' ? cx - 180 : cx;

  // Draw underlying foot pressure density blobs
  // Ink color: Deep navy-indigo/purple characteristic of Harris Mat rubber ink
  const inkRGB = [45, 25, 95]; // #2d195f

  // Helper to draw an anatomical pressure node
  const drawPressureBlob = (
    px: number,
    py: number,
    rx: number,
    ry: number,
    angle: number,
    intensity: number
  ) => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((angle * Math.PI) / 180);

    const grad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, Math.max(rx, ry));
    grad.addColorStop(0, `rgba(${inkRGB[0]}, ${inkRGB[1]}, ${inkRGB[2]}, ${intensity * 0.95})`);
    grad.addColorStop(0.5, `rgba(${inkRGB[0]}, ${inkRGB[1]}, ${inkRGB[2]}, ${intensity * 0.7})`);
    grad.addColorStop(0.85, `rgba(${inkRGB[0]}, ${inkRGB[1]}, ${inkRGB[2]}, ${intensity * 0.3})`);
    grad.addColorStop(1, `rgba(${inkRGB[0]}, ${inkRGB[1]}, ${inkRGB[2]}, 0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const isHigh = footType === 'high_pressure';
  const isFlat = footType === 'flat_foot';

  // 1. Hindfoot / Heel (y ~ 750)
  drawPressureBlob(offsetX + 10, offsetY + 740, 75, 95, 2, 0.92);

  // 2. Lateral Border (connecting heel to 5th metatarsal)
  const lateralIntensity = isHigh ? 0.15 : isFlat ? 0.75 : 0.45;
  const lateralWidth = isHigh ? 18 : isFlat ? 65 : 35;
  drawPressureBlob(offsetX + 55, offsetY + 580, lateralWidth, 110, -5, lateralIntensity);

  // 3. Medial Arch (absent in normal/high, present in flat foot)
  if (isFlat) {
    drawPressureBlob(offsetX - 20, offsetY + 560, 48, 90, 8, 0.65);
  }

  // 4. Forefoot / Metatarsal Region (y ~ 410)
  // 1st Metatarsal head (medial ball)
  const meta1Intensity = isHigh ? 1.0 : 0.82;
  drawPressureBlob(offsetX - 45, offsetY + 420, 52, 60, -8, meta1Intensity);

  // Central metatarsal heads (2nd, 3rd, 4th)
  drawPressureBlob(offsetX + 5, offsetY + 395, 45, 50, 0, isHigh ? 0.95 : 0.75);
  drawPressureBlob(offsetX + 48, offsetY + 410, 42, 48, 5, isHigh ? 0.88 : 0.70);

  // 5th Metatarsal head (lateral ball)
  drawPressureBlob(offsetX + 85, offsetY + 435, 38, 45, 12, 0.72);

  // 5. Toes
  // Hallux (Big Toe)
  const halluxIntensity = isHigh ? 0.95 : 0.80;
  drawPressureBlob(offsetX - 55, offsetY + 230, 36, 52, -10, halluxIntensity);

  // Toe 2
  drawPressureBlob(offsetX - 10, offsetY + 220, 20, 34, -4, 0.58);
  // Toe 3
  drawPressureBlob(offsetX + 25, offsetY + 235, 18, 30, 2, 0.52);
  // Toe 4
  drawPressureBlob(offsetX + 55, offsetY + 260, 16, 26, 8, 0.45);
  // Toe 5 (Pinky Toe)
  drawPressureBlob(offsetX + 82, offsetY + 290, 15, 24, 15, 0.40);

  // Overlay Harris Mat micro-grid lines (the physical rubber mat mesh)
  // Harris mat has a distinct fine cross-hatch ink grid that compresses under load
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = `rgba(30, 15, 60, 0.28)`;
  ctx.lineWidth = 1.0;

  const step = 6;
  for (let x = 0; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // Add realistic ink scatter / paper texture noise
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      // Stippling jitter
      const noise = (Math.random() - 0.5) * 16;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Pre-configured clinical scanner devices (FR-02, FR-03)
 */
export const MOCK_SCANNER_DEVICES: ScannerDevice[] = [
  {
    id: 'sc-01',
    name: 'Epson Perfection V39 II (TWAIN 2.4)',
    interface: 'TWAIN',
    status: 'Ready',
    maxDpi: 4800,
    supportsColor: true,
    supportsDuplex: false,
  },
  {
    id: 'sc-02',
    name: 'Canon CanoScan LiDE 400 (WIA / Direct)',
    interface: 'WIA',
    status: 'Ready',
    maxDpi: 2400,
    supportsColor: true,
    supportsDuplex: false,
  },
  {
    id: 'sc-03',
    name: 'HP ScanJet Pro 2500 f1 (AirScan / eSCL)',
    interface: 'AirScan/eSCL',
    status: 'Ready',
    maxDpi: 1200,
    supportsColor: true,
    supportsDuplex: true,
  },
  {
    id: 'sc-04',
    name: 'Fujitsu fi-8170 (SANE Linux Driver)',
    interface: 'SANE',
    status: 'Ready',
    maxDpi: 600,
    supportsColor: true,
    supportsDuplex: true,
  },
  {
    id: 'sc-sim',
    name: 'Technomind Virtual Harris Mat Scanner Simulator',
    interface: 'Virtual Simulation',
    status: 'Ready',
    maxDpi: 600,
    supportsColor: true,
    supportsDuplex: false,
  },
];

/**
 * Pre-loaded clinical patients
 */
export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-101',
    mrn: 'MRN-2026-88102',
    name: 'Robert Vance',
    dateOfBirth: '1968-04-14',
    gender: 'Male',
    weightKg: 84.5,
    heightCm: 178,
    phone: '+1 (555) 234-8901',
    referringDoctor: 'Dr. Michael Chen, DPM (Podiatric Surgery)',
    clinicalNotes: 'Type II Diabetic foot evaluation. History of neuropathic callus under 1st metatarsal head. Suspected focal hyper-pressure.',
    createdAt: '2026-10-10T09:30:00Z',
  },
  {
    id: 'pat-102',
    mrn: 'MRN-2026-44919',
    name: 'Elena Rostova',
    dateOfBirth: '1989-11-23',
    gender: 'Female',
    weightKg: 62.0,
    heightCm: 165,
    phone: '+1 (555) 876-5432',
    referringDoctor: 'Dr. Sarah Jenkins, Orthotist',
    clinicalNotes: 'Plantar Fasciitis left heel, bilateral Pes Planus (flat foot). Custom functional orthotic prescription required.',
    createdAt: '2026-10-11T14:15:00Z',
  },
  {
    id: 'pat-103',
    mrn: 'MRN-2026-12004',
    name: 'Marcus Sterling',
    dateOfBirth: '1975-08-02',
    gender: 'Male',
    weightKg: 78.0,
    heightCm: 182,
    phone: '+1 (555) 345-6789',
    referringDoctor: 'Dr. Rajiv Patel, Physiatrist',
    clinicalNotes: 'Post-metatarsal osteotomy recovery evaluation. Assessment of lateral weight shift and forefoot balance.',
    createdAt: '2026-10-12T10:00:00Z',
  },
];

/**
 * Helper to build an initial demo case
 */
export async function createDemoCase(patient: Patient): Promise<AnalysisCase> {
  const rawDataUrl = generateHarrisMatFootprint('Right', 'high_pressure', 720, 1080);

  // Ingest image
  const img = new Image();
  img.src = rawDataUrl;
  await new Promise((resolve) => (img.onload = resolve));

  const result = await processHarrisMatScan(img, 'Right', { dpi: 300 });

  const landmarks = {
    heelCenter: { x: 370, y: 770 },
    heelMedial: { x: 305, y: 770 },
    heelLateral: { x: 435, y: 770 },
    metatarsal1: { x: 285, y: 440 },
    metatarsal5: { x: 450, y: 450 },
    longestToe: { x: 330, y: 220 },
    archApex: { x: 380, y: 610 },
  };

  // Convert pixel dimensions to mm: at 300 DPI, mmPerPx = 25.4 / 300 = 0.08466
  const mmPerPx = 25.4 / 300;
  const footLengthMm = Math.round((770 - 220) * mmPerPx * 1.35); // standard adult foot ~ 265mm
  const forefootWidthMm = Math.round((450 - 285) * mmPerPx * 1.85); // ~ 96mm
  const heelWidthMm = Math.round((435 - 305) * mmPerPx * 1.6); // ~ 68mm
  const ballGirthMm = Math.round(forefootWidthMm * 2.45); // ~ 235mm

  return {
    id: 'case-demo-001',
    caseNumber: 'PPA-20261012-0042',
    patientId: patient.id,
    footSide: 'Right',
    indication: 'Diabetic Neuropathy & Forefoot Pressure Screening',
    createdAt: '2026-10-12T11:45:00Z',
    updatedAt: '2026-10-12T11:45:00Z',
    operatorName: 'Clinical Technician (R. Rajalakshmi)',
    clinicName: 'Technomind Podiatric Biomechanics Center',
    rawScanDataUrl: rawDataUrl,
    processedHeatMapDataUrl: result.processedDataUrl,
    scanMetadata: {
      scannerModel: 'Epson Perfection V39 II',
      scannerDriver: 'TWAIN 2.4 (USB Direct)',
      dpi: 300,
      colorMode: 'Grayscale',
      orientationDeg: 0,
      captureTimestamp: '2026-10-12T11:42:18Z',
      sourceFilename: 'scan_vance_robert_r_300dpi.png',
    },
    qcResult: result.qcResult,
    algorithmVersion: 'v1.2.0-MED-2026',
    categoryDistribution: result.categoryDistribution,
    regionalAnalysis: result.regionalAnalysis,
    landmarks,
    orthoticMeasurements: {
      footLengthMm,
      forefootWidthMm,
      heelWidthMm,
      ballGirthMm,
      archIndex: result.regionalAnalysis.cavanaghArchIndex,
      archType: result.regionalAnalysis.archClassification,
      scaleMmPerPixel: mmPerPx,
      measurementMethod: 'Semi-automated Harris Mat landmark triangulation',
      calibratedAt: '2026-10-12T11:44:00Z',
      recommendations: [
        'Recommend custom total-contact orthotic with 6mm EVA offloading well under 1st metatarsal head.',
        'Prescribe semi-rigid polypropylene shell with 14mm deep heel cup to stabilize rearfoot.',
        'Add Poron 4000 medical-grade top cover for shear reduction in diabetic risk category.',
      ],
    },
    signOff: {
      physicianName: 'Dr. Michael Chen, DPM, FACFAS',
      role: 'Consultant Podiatric Surgeon',
      comments: 'Focal peak contact confirmed at 1st MPJ (Category C6). Offloading insole prescription approved. Scheduled for 4-week follow-up scan.',
      signedAt: '2026-10-12T12:30:00Z',
    },
    syncStatus: 'synced',
    cloudSyncId: 'CLOUD-PPA-98234-SYNC',
    lastSyncAttempt: '2026-10-12T12:35:10Z',
    integrityHash: 'a7c93e4bf108f448c9033e9d892305a41d99ef87b3510e14dbcb452934091a10',
  };
}

/**
 * Creates bilateral Left and Right cases scanned separately and linked under the same patient
 */
export async function createBilateralDemoCases(patient: Patient): Promise<AnalysisCase[]> {
  const rightCase = await createDemoCase(patient);

  // Generate separate Left foot scan
  const rawLeftUrl = generateHarrisMatFootprint('Left', 'normal', 720, 1080);
  const leftImg = new Image();
  leftImg.src = rawLeftUrl;
  await new Promise((res) => (leftImg.onload = res));
  const leftResult = await processHarrisMatScan(leftImg, 'Left', { dpi: 300 });

  const mmPerPx = 25.4 / 300;
  const leftLandmarks = {
    heelCenter: { x: 350, y: 770 },
    heelMedial: { x: 415, y: 770 },
    heelLateral: { x: 285, y: 770 },
    metatarsal1: { x: 435, y: 440 },
    metatarsal5: { x: 270, y: 450 },
    longestToe: { x: 390, y: 220 },
    archApex: { x: 340, y: 610 },
  };

  const leftCase: AnalysisCase = {
    id: 'case-demo-002',
    caseNumber: 'PPA-20261012-0043',
    patientId: patient.id,
    footSide: 'Left',
    indication: 'Bilateral Stance Comparison & Contralateral Baseline',
    createdAt: '2026-10-12T11:50:00Z',
    updatedAt: '2026-10-12T11:50:00Z',
    operatorName: 'Clinical Technician (R. Rajalakshmi)',
    clinicName: 'Technomind Podiatric Biomechanics Center',
    rawScanDataUrl: rawLeftUrl,
    processedHeatMapDataUrl: leftResult.processedDataUrl,
    scanMetadata: {
      scannerModel: 'High-Res Optical Camera (1080P)',
      scannerDriver: 'Enhanced Clinical Optical Homography Engine',
      dpi: 300,
      colorMode: 'Grayscale',
      orientationDeg: 0,
      captureTimestamp: '2026-10-12T11:48:10Z',
      sourceFilename: 'scan_vance_robert_l_300dpi.png',
    },
    qcResult: leftResult.qcResult,
    algorithmVersion: 'v2.4.0-AI-Contour-OnDevice',
    categoryDistribution: leftResult.categoryDistribution,
    regionalAnalysis: {
      ...leftResult.regionalAnalysis,
      asymmetryIndex: 3.8,
    },
    landmarks: leftLandmarks,
    orthoticMeasurements: {
      footLengthMm: Math.round((770 - 220) * mmPerPx * 1.35),
      forefootWidthMm: Math.round((435 - 270) * mmPerPx * 1.85),
      heelWidthMm: Math.round((415 - 285) * mmPerPx * 1.6),
      ballGirthMm: Math.round(Math.round((435 - 270) * mmPerPx * 1.85) * 2.45),
      archIndex: leftResult.regionalAnalysis.cavanaghArchIndex,
      archType: leftResult.regionalAnalysis.archClassification,
      scaleMmPerPixel: mmPerPx,
      measurementMethod: 'Semi-automated Harris Mat landmark triangulation',
      calibratedAt: '2026-10-12T11:49:00Z',
      recommendations: [
        'Bilateral alignment: Contralateral left foot demonstrates baseline rectus arch structure.',
        'Prescribe matching contoured arch cup with moderate posting to equalize bilateral pelvic obliquity.',
      ],
    },
    signOff: {
      physicianName: 'Dr. Michael Chen, DPM, FACFAS',
      role: 'Consultant Podiatric Surgeon',
      comments: 'Bilateral comparison verified. Symmetrical rearfoot contact with localized right forefoot offloading indicated.',
      signedAt: '2026-10-12T12:30:00Z',
    },
    syncStatus: 'synced',
    cloudSyncId: 'CLOUD-PPA-98235-SYNC',
    lastSyncAttempt: '2026-10-12T12:35:10Z',
    integrityHash: 'b8d04e5cf219f559d0144f0e2e92316b2e00ef98c4621f25ecda563045102b21',
  };

  return [rightCase, leftCase];
}
