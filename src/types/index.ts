// Plantar Pressure Analysis System - Domain Types (PPA-SW-TF-001)

export type FootSide = 'Left' | 'Right' | 'Bilateral';

export type ClinicalCategory = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

export interface CategoryInfo {
  id: ClinicalCategory;
  label: string;
  color: string;
  description: string;
  minVal: number;
  maxVal: number;
}

export const CLINICAL_CATEGORIES: CategoryInfo[] = [
  { id: 'C1', label: 'Less contact', color: '#1d4ed8', description: 'Low image-derived contact/intensity level', minVal: 0.05, maxVal: 0.20 },
  { id: 'C2', label: 'Normal', color: '#06b6d4', description: 'Reference/expected image-derived baseline range', minVal: 0.20, maxVal: 0.40 },
  { id: 'C3', label: 'Mild', color: '#22c55e', description: 'Mildly increased contact/loading level', minVal: 0.40, maxVal: 0.55 },
  { id: 'C4', label: 'Moderate', color: '#eab308', description: 'Moderately increased contact/intensity zone', minVal: 0.55, maxVal: 0.70 },
  { id: 'C5', label: 'High', color: '#f97316', description: 'High localized contact/pressure concentration', minVal: 0.70, maxVal: 0.85 },
  { id: 'C6', label: 'Very high', color: '#dc2626', description: 'Peak image-derived contact level requiring clinical review', minVal: 0.85, maxVal: 1.00 },
];

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  weightKg: number;
  heightCm: number;
  phone: string;
  referringDoctor: string;
  clinicalNotes: string;
  createdAt: string;
}

export interface QualityControlResult {
  passed: boolean;
  score: number; // 0 - 100
  flags: {
    isBlank: boolean;
    isClipped: boolean;
    isLowResolution: boolean;
    isBlurred: boolean;
    isLowContrast: boolean;
  };
  detectedDpi: number;
  warnings: string[];
}

export interface DiabeticUlcerRisk {
  iwgdfRiskCategory: 0 | 1 | 2 | 3;
  riskLabel: string;
  offloadingDepthMm: number;
  focalHyperpressureAlert: boolean;
  recommendations: string[];
}

export interface SubZonal10Breakdown {
  halluxPct: number;
  lesserToesPct: number;
  metatarsal1Pct: number;
  metatarsal2Pct: number;
  metatarsals3to5Pct: number;
  medialMidfootPct: number;
  lateralMidfootPct: number;
  medialHindfootPct: number;
  lateralHindfootPct: number;
}

export interface RegionalAnalysis {
  forefootContactPct: number;
  midfootContactPct: number;
  hindfootContactPct: number;
  halluxContactPct: number;
  peakContactCategory: ClinicalCategory;
  peakRegion: string;
  contactAreaCm2: number;
  cavanaghArchIndex: number;
  archClassification: 'High Arch (Pes Cavus)' | 'Normal Arch' | 'Flat Foot (Pes Planus)';
  chippauxSmirakIndex: number; // CSI (Midfoot width / Forefoot width %)
  staheliIndex: number; // SI (Midfoot width / Heel width)
  diabeticUlcerRisk: DiabeticUlcerRisk;
  subZonal10?: SubZonal10Breakdown;
  asymmetryIndex?: number; // Bilateral comparative load asymmetry (%)
}

export interface OrthoticLandmarks {
  heelCenter: { x: number; y: number };
  heelMedial: { x: number; y: number };
  heelLateral: { x: number; y: number };
  metatarsal1: { x: number; y: number };
  metatarsal5: { x: number; y: number };
  longestToe: { x: number; y: number };
  archApex: { x: number; y: number };
}

export interface OrthoticMeasurements {
  footLengthMm: number;
  forefootWidthMm: number;
  heelWidthMm: number;
  ballGirthMm: number;
  archIndex: number;
  archType: string;
  scaleMmPerPixel: number;
  measurementMethod: string;
  calibratedAt: string;
  recommendations: string[];
}

export interface AnalysisCase {
  id: string;
  schemaVersion?: number;
  caseNumber: string;
  patientId: string;
  footSide: FootSide;
  indication: string;
  createdAt: string;
  updatedAt: string;
  operatorName: string;
  clinicName: string;
  
  // Imaging Data
  rawScanDataUrl: string;
  processedHeatMapDataUrl: string;
  rightRawScanDataUrl?: string;
  rightProcessedHeatMapDataUrl?: string;
  scanMetadata: {
    scannerModel: string;
    scannerDriver: string;
    dpi: number;
    colorMode: 'Grayscale' | 'RGB';
    orientationDeg: number;
    captureTimestamp: string;
    sourceFilename?: string;
  };

  // Quality & Algorithm
  qcResult: QualityControlResult;
  algorithmVersion: string;
  categoryDistribution: {
    category: ClinicalCategory;
    percentage: number;
    areaMm2: number;
  }[];
  regionalAnalysis: RegionalAnalysis;

  // Orthotics
  landmarks: OrthoticLandmarks;
  orthoticMeasurements: OrthoticMeasurements;

  // Sign-off & Cloud
  signOff?: {
    physicianName: string;
    role: string;
    comments: string;
    signedAt: string;
    digitalSignatureDataUrl?: string;
  };
  syncStatus: 'pending' | 'uploading' | 'synced' | 'failed';
  cloudSyncId?: string;
  lastSyncAttempt?: string;
  integrityHash: string;
}

export interface ScannerDevice {
  id: string;
  name: string;
  interface: 'TWAIN' | 'WIA' | 'SANE' | 'AirScan/eSCL' | 'USB Direct' | 'Virtual Simulation';
  status: 'Ready' | 'Busy' | 'Disconnected';
  maxDpi: number;
  supportsColor: boolean;
  supportsDuplex: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  caseId?: string;
  action: string;
  details: string;
  algorithmVersion: string;
}
