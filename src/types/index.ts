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
  hospitalId?: string;
  hospitalName?: string;
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
  hospitalId?: string;
  
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
  technicianId?: string;
  technicianName?: string;
  deviceFingerprint?: string;
  syncedAt?: string;
  cloudBatchId?: string;
}

export interface CloudBatchSyncPayload {
  batchId: string;
  technicianId: string;
  technicianName: string;
  technicianUsername?: string;
  hospitalId: string;
  hospitalCode: string;
  deviceFingerprint: string;
  clientTimestamp: string;
  cases: AnalysisCase[];
  patientProfiles?: Patient[];
}

export interface CloudBatchSyncResult {
  success: boolean;
  batchId: string;
  processedCount: number;
  syncedCaseIds: string[];
  failedCaseIds: { caseId: string; error: string }[];
  serverTimestamp: string;
}

export interface ScannerDevice {
  id: string;
  name: string;
  interface: 'TWAIN' | 'WIA' | 'SANE' | 'AirScan/eSCL' | 'USB Direct' | 'Direct Optical / UVC' | 'WebUSB' | 'USB' | 'Virtual Simulation';
  status: 'Ready' | 'Busy' | 'Disconnected' | 'Connected' | 'Offline';
  maxDpi: number;
  supportsColor: boolean;
  supportsDuplex: boolean;
  manufacturer?: string;
  isDirectCaptureSupported?: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  caseId?: string;
  action: string;
  details: string;
  algorithmVersion: string;
  severity?: 'info' | 'warning' | 'security';
  role?: 'admin' | 'technician' | 'system';
}

export type PatientIdMode = 'alphanumeric' | 'numeric' | 'date_alphanumeric';

export interface PatientIdConfig {
  prefix: string;
  mode: PatientIdMode;
  randomLength: number;
  autoUppercase: boolean;
  nextSequentialNumber: number;
}

export interface SystemSettings {
  appName: string;
  patientIdConfig: PatientIdConfig;
  scanner: {
    selectedDevice: 'camera' | 'usb' | 'network';
    resolutionDpi: 150 | 300 | 600 | 1200;
    colorMode: 'Grayscale' | 'Colour';
    sheetSize: string;
    widthMm: string;
    heightMm: string;
    autoDetectMarkers: boolean;
    autoCropSheet: boolean;
    lensDistortion: boolean;
  };
  region: {
    appLanguage: string;
    reportLanguage: string;
    unit: 'mm' | 'cm';
    dateFormat: string;
  };
  cloud: {
    autoSyncReports: boolean;
    serverAddress: string;
    account: string;
  };
  clinical: {
    clinicName: string;
    clinicLogoUrl?: string;
    logoPosition?: 'Left' | 'Centre' | 'Right';
    clinicAddress?: string;
    clinicContact?: string;
    clinicRegistrationNo?: string;
    clinicFooterText?: string;
    defaultDoctor: string;
    defaultTechnician: string;
    hospitalId?: string;
    role?: 'admin' | 'doctor' | 'technician';
  };
}

export interface HospitalDoctor {
  id: string;
  name: string;
  specialization: string;
  licenseNo: string;
}

export interface HospitalTechnician {
  id: string;
  name: string;
  staffId: string;
}

export interface TechnicianUser {
  id: string;
  name: string;
  username: string; // Login ID, e.g. sarah.tech or tech@hospital.com
  pin: string; // Login Password
  hospitalId: string; // Associated hospital ID
  hospitalName?: string;
  role: 'technician';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt?: string;
  phone?: string;
  email?: string;
  notes?: string;
  recoveryKey?: string;
  activationCode?: string; // Code-based enrollment voucher, e.g. "TMH-TECH-1001"
  activationCodeGeneratedAt?: string; // ISO date string of generation
  activationCodeExpiresAt?: string; // ISO date string of timed rotation (valid per configured policy)
  usedActivationCodes?: string[]; // Permanently burned single-use activation codes
  isActivationCodeUsed?: boolean; // True once used to register on any device; cannot be registered again
  activationCodeUsedAt?: string; // ISO timestamp when voucher was consumed
  activationCodeUsedByDeviceId?: string; // Hardware device fingerprint that consumed voucher
  registeredDeviceId?: string; // Bound hardware device fingerprint
  macAddress?: string; // Bound station MAC address or hardware MAC fingerprint
  isRegisteredOnDevice?: boolean;
  authorizedAt?: string;
  permitExpiresAt?: string; // Station license permit expiration timestamp
}

export type VoucherExpiryUnit = 'minutes' | 'hours' | 'days';

export interface VoucherExpiryPolicy {
  duration: number; // e.g. 1, 2, 8, 24, 7, 30
  unit: VoucherExpiryUnit; // 'minutes' | 'hours' | 'days'
  autoRotateOnExpiry: boolean; // auto-rotate on expiration
  updatedAt?: string;
  updatedBy?: string;
}

export interface DeviceAuthorizationToken {
  token: string; // Cryptographic enrollment token, e.g. "AUTH-DEV-8F29-4A1B"
  hospitalId: string;
  hospitalCode: string;
  hospitalName: string;
  technicianId: string;
  technicianName: string;
  technicianUsername?: string;
  deviceFingerprint: string;
  macAddress?: string;
  deviceName?: string;
  appVersion?: string; // Authorized app build version, e.g. "1.0.55"
  authorizedAt: string;
  expiresAt?: string; // Station permit expiration timestamp
  permitPolicy?: VoucherExpiryPolicy; // Station permit security policy
  status: 'authorized' | 'revoked';
}

export interface HospitalProfile {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  logoPosition?: 'Left' | 'Centre' | 'Right';
  address: string;
  contact: string;
  email: string;
  website?: string;
  registrationNo: string;
  department: string;
  defaultDoctor: string;
  defaultTechnician: string;
  footerText: string;
  doctors: HospitalDoctor[];
  technicians: HospitalTechnician[];
  activeUser?: {
    username: string;
    name: string;
    role: 'admin' | 'doctor' | 'technician';
    loginTime: string;
  };
}

export interface AdminAccount {
  id: string;
  name: string;
  username: string; // Login ID / Email, e.g. admin@technomind.health
  pin: string; // Master Admin Password
  hospitalId: string;
  hospitalName: string;
  role: 'admin';
  phone?: string;
  email?: string;
  createdAt: string;
  lastLoginAt?: string;
  primaryDeviceId?: string;
  status: 'active' | 'suspended';
  recoveryKey?: string;
  isInitialSetupCompleted?: boolean;
}

export interface BoundDevice {
  id: string; // e.g. DEV-8F29-4A1B
  name: string; // e.g. "Main Podiatry Lab iMac"
  platform: string; // e.g. "macOS / Chrome"
  fingerprint: string;
  macAddress?: string; // Hardware MAC address (e.g. "3A:F2:88:9C:12:04")
  boundUsername?: string; // Bound technician User ID
  ipAddress?: string;
  boundAt: string;
  lastActiveAt: string;
  status: 'active' | 'revoked';
  isCurrentDevice?: boolean;
}

export interface LicenseInvoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  status: 'paid' | 'pending';
  receiptUrl?: string;
  paymentMethod: string;
}

export interface DeviceLicense {
  tier: 'single' | 'dual' | 'hospital' | 'enterprise';
  tierName: string;
  maxAllowedDevices: number;
  activeDevicesCount: number;
  licenseKey: string;
  status: 'active' | 'expired' | 'grace_period';
  billingCycle: 'monthly' | 'annual' | 'lifetime';
  pricePerMonth: number;
  nextBillingDate: string;
  invoices: LicenseInvoice[];
}
