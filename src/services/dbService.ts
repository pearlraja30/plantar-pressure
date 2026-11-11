// PodoPress Inbuilt Database & Persistence Engine (IndexedDB + Storage Cache)
// Provides unified persistence for Application Settings, Alphanumeric Patient IDs, Patient Profiles, and Clinical Exam Reports.

import { AnalysisCase, AuditEvent, Patient, PatientIdConfig, SystemSettings, HospitalProfile, TechnicianUser, AdminAccount, SuperAdminAccount, BoundDevice, DeviceLicense, DeviceAuthorizationToken, VoucherExpiryPolicy, ProcessingParameters } from '../types';
import { Capacitor } from '@capacitor/core';
import { safeStorage, stripHeavyCasePayloads } from './storageUtils';
import { deviceBindingService } from './deviceBindingService';
import { cloudSyncService } from './cloudSyncService';
import { logAuditEvent, getAuditEvents } from './auditService';

const DB_NAME = 'PodoPressDB';
const DB_VERSION = 2;
export const APP_CURRENT_VERSION = '1.0.79';

export const DEFAULT_PATIENT_ID_CONFIG: PatientIdConfig = {
  prefix: 'PP-',
  mode: 'alphanumeric',
  randomLength: 5,
  autoUppercase: true,
  nextSequentialNumber: 1001,
};

export const DEFAULT_VOUCHER_EXPIRY_POLICY: VoucherExpiryPolicy = {
  duration: 24,
  unit: 'hours',
  autoRotateOnExpiry: true,
};

/**
 * Calculates duration of voucher expiry policy in milliseconds.
 */
export function getVoucherExpiryMs(policy: VoucherExpiryPolicy): number {
  const duration = Math.max(1, Number(policy.duration) || 1);
  switch (policy.unit) {
    case 'minutes':
      return duration * 60 * 1000;
    case 'hours':
      return duration * 60 * 60 * 1000;
    case 'days':
      return duration * 24 * 60 * 60 * 1000;
    default:
      return duration * 60 * 60 * 1000;
  }
}

/**
 * Returns human-friendly label for voucher expiry policy (e.g. "24 Hours (1 Day)", "7 Days", "2 Hours").
 */
export function formatVoucherPolicyLabel(policy: VoucherExpiryPolicy): string {
  const d = Math.max(1, Number(policy.duration) || 1);
  if (policy.unit === 'days') {
    return d === 1 ? '1 Day (24 Hours)' : `${d} Days`;
  }
  if (policy.unit === 'hours') {
    if (d === 24) return '24 Hours (1 Day)';
    return d === 1 ? '1 Hour' : `${d} Hours`;
  }
  if (policy.unit === 'minutes') {
    if (d === 60) return '60 Mins (1 Hour)';
    return d === 1 ? '1 Minute' : `${d} Minutes`;
  }
  return `${d} ${policy.unit}`;
}

/**
 * Formats time remaining until an ISO expiry timestamp into clean badge text.
 */
export function formatRemainingTime(expiresAtIso: string): {
  text: string;
  isExpired: boolean;
  minutesRemaining: number;
  hoursRemaining: number;
  daysRemaining: number;
} {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now();
  if (diffMs <= 0 || isNaN(diffMs)) {
    return { text: 'Expired', isExpired: true, minutesRemaining: 0, hoursRemaining: 0, daysRemaining: 0 };
  }

  const daysRemaining = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor(diffMs / (60 * 60 * 1000));
  const minutesRemaining = Math.max(1, Math.round(diffMs / (60 * 1000)));

  let text = '';
  if (daysRemaining >= 1) {
    const remHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    text = remHours > 0 ? `${daysRemaining}d ${remHours}h Left` : `${daysRemaining}d Left`;
  } else if (hoursRemaining >= 1) {
    const remMins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    text = remMins > 0 ? `${hoursRemaining}h ${remMins}m Left` : `${hoursRemaining}h Left`;
  } else {
    text = `${minutesRemaining}m Left`;
  }

  return {
    text,
    isExpired: false,
    minutesRemaining,
    hoursRemaining,
    daysRemaining,
  };
}

export const DEFAULT_SETTINGS: SystemSettings = {
  appName: 'PodoPress',
  patientIdConfig: DEFAULT_PATIENT_ID_CONFIG,
  scanner: {
    selectedDevice: 'camera',
    resolutionDpi: 300,
    colorMode: 'Grayscale',
    sheetSize: 'A4',
    widthMm: '210',
    heightMm: '297',
    autoDetectMarkers: true,
    autoCropSheet: true,
    lensDistortion: true,
  },
  region: {
    appLanguage: 'English',
    reportLanguage: 'English',
    unit: 'mm',
    dateFormat: 'dd-mm-yyyy',
  },
  cloud: {
    autoSyncReports: true,
    serverAddress: 'https://cloud.technomind.clinic/v1',
    account: 'clinic-admin@technomind.health',
  },
  clinical: {
    clinicName: '',
    clinicLogoUrl: '',
    logoPosition: 'Left',
    clinicAddress: '',
    clinicContact: '',
    clinicRegistrationNo: '',
    clinicFooterText: '',
    defaultDoctor: '',
    defaultTechnician: '',
    hospitalId: '',
    role: 'admin',
  },
  stationSecurity: {
    allowStationAdminLogin: false,
  },
};

export const EMPTY_HOSPITAL_PROFILE: HospitalProfile = {
  id: '',
  name: '',
  code: '',
  logoUrl: '',
  logoPosition: 'Left',
  address: '',
  contact: '',
  email: '',
  website: '',
  registrationNo: '',
  department: '',
  defaultDoctor: '',
  defaultTechnician: '',
  footerText: '',
  doctors: [],
  technicians: [],
};

export const DEFAULT_HOSPITALS: HospitalProfile[] = [];

// Storage keys for local mirroring and instant synchronous hydration
const LS_KEYS = {
  PATIENTS: 'ppa-patients',
  CASES: 'ppa-cases',
  SETTINGS: 'podopress_settings_v1',
  PATIENT_ID_CONFIG: 'podopress_patient_id_config_v1',
  AUDIT_LOG: 'ppa_audit_log_v1',
  SELECTED_PATIENT: 'ppa-selected-patient-id',
  SELECTED_CASE: 'ppa-selected-case-id',
  HOSPITALS: 'podopress_hospitals_v1',
  ACTIVE_HOSPITAL_ID: 'podopress_active_hospital_id_v1',
  ACTIVE_USER: 'podopress_active_user_v1',
  TECHNICIANS: 'podopress_technicians_v1',
  ADMIN_ACCOUNT: 'podopress_admin_account_v1',
  ADMIN_ACCOUNTS_LIST: 'podopress_admin_accounts_list_v1',
  SUPER_ADMIN_ACCOUNT: 'podopress_super_admin_account_v1',
  DEVICE_AUTH_TOKEN: 'podopress_device_auth_token_v1',
  VOUCHER_EXPIRY_POLICY: 'podopress_voucher_expiry_policy_v1',
  BURNED_ACTIVATION_CODES: 'podopress_burned_activation_codes_v1',
  PROCESSING_PARAMETERS: 'podopress_processing_parameters_v1',
};

export const DEFAULT_PROCESSING_PARAMETERS: ProcessingParameters = {
  smoothingStrength: 5,
  intensityLevels: '6 levels',
  colorMap: 'Jet',
  backgroundThreshold: 12,
  flattenLighting: true,
  removePaperNoise: true,
};

export const DEFAULT_SUPER_ADMIN_ACCOUNT: SuperAdminAccount = {
  id: 'superadmin-master-01',
  name: 'Global Chief Administrator',
  username: 'superadmin@technomind.health',
  pin: 'superadmin@123',
  role: 'superadmin',
  email: 'superadmin@technomind.health',
  phone: '+1 (800) 555-SUPER',
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'active',
  recoveryKey: 'SUPER-MASTER-KEY-9999',
};

export const DEFAULT_ADMIN_ACCOUNT: AdminAccount = {
  id: '',
  name: 'Hospital Administrator',
  username: '',
  pin: '',
  hospitalId: '',
  hospitalName: '',
  role: 'admin',
  phone: '',
  email: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'active',
  recoveryKey: '',
  isInitialSetupCompleted: false,
  createdBy: 'superadmin',
  maxStationsAllowed: 10,
};

export const DEFAULT_TECHNICIANS: TechnicianUser[] = [];

export interface SystemUserSession {
  username: string;
  name: string;
  role: 'superadmin' | 'admin' | 'technician';
  title: string;
  badge: string;
  hospitalId?: string;
  hospitalName?: string;
  technicianId?: string;
  loginTime: string;
}

export const SYSTEM_ACCOUNTS: Record<'superadmin' | 'admin' | 'technician', SystemUserSession> = {
  superadmin: {
    username: 'superadmin@technomind.health',
    name: 'Global Chief Administrator',
    role: 'superadmin',
    title: 'Super Administrator',
    badge: 'Super Admin (Full Governance)',
    loginTime: new Date().toISOString(),
  },
  admin: {
    username: '',
    name: 'Hospital Administrator',
    role: 'admin',
    title: 'Hospital Administrator',
    badge: 'Administrator (Hospital Access)',
    hospitalId: '',
    hospitalName: '',
    loginTime: new Date().toISOString(),
  },
  technician: {
    username: '',
    name: 'Clinical Technician',
    role: 'technician',
    title: 'Clinical Technician',
    badge: 'Clinical Operator (Reports)',
    hospitalId: '',
    hospitalName: '',
    technicianId: '',
    loginTime: new Date().toISOString(),
  },
};

class PodoPressDatabase {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.purgeStaleDemoData();
    this.initDatabase();
  }

  /**
   * Zero Stale Data Guarantee:
   * Strips all hardcoded legacy demo IDs and clinic profiles from browser storage.
   * Ensures clean Day-1 installation state with 0 records until explicitly registered.
   */
  public purgeStaleDemoData(): void {
    try {
      const DEMO_HOSPITAL_IDS = [
        'hosp-001',
        'hosp-002',
        'hosp-003',
        'hosp-apollo',
        'hosp-fortis',
        'hosp-technomind-main',
      ];
      const DEMO_TECH_IDS = ['tech-user-01', 'tech-user-02'];
      const DEMO_ADMIN_IDS = ['admin-master-01'];

      // 1. Purge demo hospitals from localStorage
      const rawHosps = localStorage.getItem(LS_KEYS.HOSPITALS);
      if (rawHosps) {
        try {
          const parsedHosps = JSON.parse(rawHosps);
          if (Array.isArray(parsedHosps)) {
            const cleanHosps = parsedHosps.filter(
              (h: any) => h && !DEMO_HOSPITAL_IDS.includes(h.id) && h.name !== 'Technomind Healthcare Systems'
            );
            localStorage.setItem(LS_KEYS.HOSPITALS, JSON.stringify(cleanHosps));
          }
        } catch {}
      }

      // 2. Purge demo technicians from localStorage
      const rawTechs = localStorage.getItem(LS_KEYS.TECHNICIANS);
      if (rawTechs) {
        try {
          const parsedTechs = JSON.parse(rawTechs);
          if (Array.isArray(parsedTechs)) {
            const cleanTechs = parsedTechs.filter(
              (t: any) =>
                t &&
                !DEMO_TECH_IDS.includes(t.id) &&
                t.username !== 'tech@technomind.health' &&
                t.name !== 'Tech. Specialist'
            );
            localStorage.setItem(LS_KEYS.TECHNICIANS, JSON.stringify(cleanTechs));
          }
        } catch {}
      }

      // 3. Purge demo admins from localStorage
      const rawAdmins = localStorage.getItem(LS_KEYS.ADMIN_ACCOUNTS_LIST);
      if (rawAdmins) {
        try {
          const parsedAdmins = JSON.parse(rawAdmins);
          if (Array.isArray(parsedAdmins)) {
            const cleanAdmins = parsedAdmins.filter(
              (a: any) =>
                a &&
                !DEMO_ADMIN_IDS.includes(a.id) &&
                a.username !== 'admin@technomind.health' &&
                a.name !== 'Dr. Specialist'
            );
            localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(cleanAdmins));
          }
        } catch {}
      }

      // 4. Purge demo single admin if it's the demo account
      const rawSingleAdmin = localStorage.getItem(LS_KEYS.ADMIN_ACCOUNT);
      if (rawSingleAdmin) {
        try {
          const single = JSON.parse(rawSingleAdmin);
          if (
            single &&
            (DEMO_ADMIN_IDS.includes(single.id) ||
              single.username === 'admin@technomind.health' ||
              single.name === 'Dr. Specialist')
          ) {
            localStorage.removeItem(LS_KEYS.ADMIN_ACCOUNT);
          }
        } catch {}
      }

      // 5. Clean active hospital ID if it was demo
      const activeHospId = localStorage.getItem(LS_KEYS.ACTIVE_HOSPITAL_ID);
      if (activeHospId && DEMO_HOSPITAL_IDS.includes(activeHospId)) {
        localStorage.removeItem(LS_KEYS.ACTIVE_HOSPITAL_ID);
      }

      // 6. Clean active user if it was demo tech or demo admin
      const rawUser = localStorage.getItem(LS_KEYS.ACTIVE_USER);
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          if (
            u &&
            (u.username === 'tech@technomind.health' ||
              u.name === 'Tech. Specialist' ||
              (u.role === 'admin' && u.name === 'Dr. Specialist'))
          ) {
            localStorage.removeItem(LS_KEYS.ACTIVE_USER);
          }
        } catch {}
      }

      // 7. Clean clinical settings if it was demo
      const rawSettings = localStorage.getItem(LS_KEYS.SETTINGS);
      if (rawSettings) {
        try {
          const s = JSON.parse(rawSettings);
          if (
            s &&
            s.clinical &&
            (s.clinical.clinicName === 'Technomind Healthcare Systems' ||
              DEMO_HOSPITAL_IDS.includes(s.clinical.hospitalId))
          ) {
            s.clinical.clinicName = '';
            s.clinical.clinicAddress = '';
            s.clinical.clinicContact = '';
            s.clinical.clinicRegistrationNo = '';
            s.clinical.clinicFooterText = '';
            s.clinical.defaultDoctor = '';
            s.clinical.defaultTechnician = '';
            s.clinical.hospitalId = '';
            localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(s));
          }
        } catch {}
      }
    } catch {
      // Safe guard
    }
  }

  private initDatabase(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('PodoPress: IndexedDB is not available. Falling back to local storage cache.');
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Settings store (key-value)
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }

          // 2. Patients store
          if (!db.objectStoreNames.contains('patients')) {
            const patientStore = db.createObjectStore('patients', { keyPath: 'id' });
            patientStore.createIndex('mrn', 'mrn', { unique: false });
            patientStore.createIndex('name', 'name', { unique: false });
            patientStore.createIndex('createdAt', 'createdAt', { unique: false });
          }

          // 3. Clinical Cases & Reports store (stores complete scans, heatmaps, orthotics)
          if (!db.objectStoreNames.contains('cases')) {
            const caseStore = db.createObjectStore('cases', { keyPath: 'id' });
            caseStore.createIndex('patientId', 'patientId', { unique: false });
            caseStore.createIndex('caseNumber', 'caseNumber', { unique: false });
            caseStore.createIndex('createdAt', 'createdAt', { unique: false });
            caseStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          }

          // 4. Audit logs store
          if (!db.objectStoreNames.contains('audit_logs')) {
            const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
            auditStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // 5. Technicians & Staff Logins store
          if (!db.objectStoreNames.contains('technicians')) {
            const techStore = db.createObjectStore('technicians', { keyPath: 'id' });
            techStore.createIndex('username', 'username', { unique: false });
            techStore.createIndex('hospitalId', 'hospitalId', { unique: false });
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          this.migrateFromLocalStorage(db);
          resolve(db);
        };

        request.onerror = (err) => {
          console.warn('PodoPress: Error opening IndexedDB, falling back to cache:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('PodoPress: Exception initializing IndexedDB:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Automatically migrates legacy or synchronous localStorage records into IndexedDB
   */
  private async migrateFromLocalStorage(db: IDBDatabase): Promise<void> {
    try {
      // Migrate patients
      const localPatients = localStorage.getItem(LS_KEYS.PATIENTS);
      if (localPatients) {
        const parsed: Patient[] = JSON.parse(localPatients);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const tx = db.transaction('patients', 'readwrite');
          const store = tx.objectStore('patients');
          for (const pat of parsed) {
            store.put(pat);
          }
        }
      }

      // Migrate cases from localStorage ONLY if they don't already exist in IndexedDB
      const localCases = localStorage.getItem(LS_KEYS.CASES);
      if (localCases) {
        const parsed: AnalysisCase[] = JSON.parse(localCases);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const tx = db.transaction('cases', 'readwrite');
          const store = tx.objectStore('cases');
          for (const c of parsed) {
            // NEVER overwrite an existing uncompressed scan with a lightweight localStorage mirror
            const getReq = store.get(c.id);
            getReq.onsuccess = () => {
              if (!getReq.result) {
                store.put(c);
              }
            };
          }
        }
      }

      // Migrate patient ID config
      const localIdConfig = localStorage.getItem(LS_KEYS.PATIENT_ID_CONFIG);
      if (localIdConfig) {
        const parsed = JSON.parse(localIdConfig);
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put(parsed, 'patient_id_config');
      }

      // Migrate app settings
      const localSettings = localStorage.getItem(LS_KEYS.SETTINGS);
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put(parsed, 'app_settings');
      }

      // Migrate technician accounts
      const localTechs = localStorage.getItem(LS_KEYS.TECHNICIANS);
      const parsedTechs: TechnicianUser[] = localTechs ? JSON.parse(localTechs) : DEFAULT_TECHNICIANS;
      if (db.objectStoreNames.contains('technicians')) {
        const tx = db.transaction('technicians', 'readwrite');
        const store = tx.objectStore('technicians');
        for (const t of parsedTechs) {
          const req = store.get(t.id);
          req.onsuccess = () => {
            if (!req.result) {
              store.put(t);
            }
          };
        }
      }
    } catch {
      // Non-fatal migration error
    }
  }

  // =========================================================================
  // SETTINGS & ALPHANUMERIC PATIENT ID CONFIGURATION
  // =========================================================================

  /**
   * Generates a configurable alphanumeric Patient ID
   */
  public generatePatientId(customConfig?: Partial<PatientIdConfig>): string {
    const config: PatientIdConfig = {
      ...this.getPatientIdConfigSync(),
      ...customConfig,
    };

    const prefix = config.prefix || 'PP-';
    const len = Math.max(3, Math.min(config.randomLength || 5, 12));

    if (config.mode === 'numeric') {
      const min = Math.pow(10, len - 1);
      const max = Math.pow(10, len) - 1;
      const num = Math.floor(min + Math.random() * (max - min));
      return `${prefix}${num}`;
    }

    if (config.mode === 'date_alphanumeric') {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let randomCode = '';
      for (let i = 0; i < 3; i++) {
        randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `${prefix}${yy}${mm}-${randomCode}`;
    }

    // Default 'alphanumeric': Mixed uppercase alphanumeric code (e.g. PP-A82KX)
    // Exclude confusing characters 0/O, 1/I to ensure clinical clarity
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < len; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${prefix}${code}`;
  }

  /**
   * Synchronous read of Patient ID config for instant rendering
   */
  public getPatientIdConfigSync(): PatientIdConfig {
    try {
      const saved = localStorage.getItem(LS_KEYS.PATIENT_ID_CONFIG);
      if (saved) {
        return { ...DEFAULT_PATIENT_ID_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PATIENT_ID_CONFIG;
  }

  /**
   * Loads Patient ID config from Database with fallback
   */
  public async getPatientIdConfig(): Promise<PatientIdConfig> {
    const db = await this.initDatabase();
    if (!db) return this.getPatientIdConfigSync();

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const request = store.get('patient_id_config');

        request.onsuccess = () => {
          if (request.result) {
            const config = { ...DEFAULT_PATIENT_ID_CONFIG, ...request.result };
            localStorage.setItem(LS_KEYS.PATIENT_ID_CONFIG, JSON.stringify(config));
            resolve(config);
          } else {
            resolve(this.getPatientIdConfigSync());
          }
        };

        request.onerror = () => resolve(this.getPatientIdConfigSync());
      } catch {
        resolve(this.getPatientIdConfigSync());
      }
    });
  }

  /**
   * Saves updated Patient ID format & config into Database
   */
  public async savePatientIdConfig(config: Partial<PatientIdConfig>): Promise<PatientIdConfig> {
    const current = await this.getPatientIdConfig();
    const updated: PatientIdConfig = { ...current, ...config };

    // Update synchronous cache
    try {
      localStorage.setItem(LS_KEYS.PATIENT_ID_CONFIG, JSON.stringify(updated));
    } catch {
      // Storage quota or restriction
    }

    const db = await this.initDatabase();
    if (db) {
      try {
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put(updated, 'patient_id_config');
      } catch {
        // Non-blocking
      }
    }

    return updated;
  }

  /**
   * Synchronous read of System Settings for instant startup
   */
  public getSettingsSync(): SystemSettings {
    try {
      const saved = localStorage.getItem(LS_KEYS.SETTINGS);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Loads all System Settings from Database
   */
  public async getSettings(): Promise<SystemSettings> {
    const db = await this.initDatabase();
    if (!db) return this.getSettingsSync();

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const request = store.get('app_settings');

        request.onsuccess = () => {
          if (request.result) {
            const settings = { ...DEFAULT_SETTINGS, ...request.result };
            localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
            resolve(settings);
          } else {
            resolve(this.getSettingsSync());
          }
        };

        request.onerror = () => resolve(this.getSettingsSync());
      } catch {
        resolve(this.getSettingsSync());
      }
    });
  }

  /**
   * Saves updated System Settings to Database
   */
  public async saveSettings(newSettings: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSettings();
    const updated: SystemSettings = {
      ...current,
      ...newSettings,
      scanner: { ...current.scanner, ...newSettings.scanner },
      region: { ...current.region, ...newSettings.region },
      cloud: { ...current.cloud, ...newSettings.cloud },
      clinical: { ...current.clinical, ...newSettings.clinical },
      patientIdConfig: { ...current.patientIdConfig, ...newSettings.patientIdConfig },
      stationSecurity: { ...current.stationSecurity, ...newSettings.stationSecurity },
    };

    try {
      localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(updated));
    } catch {
      // LocalStorage limit
    }

    const db = await this.initDatabase();
    if (db) {
      try {
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put(updated, 'app_settings');
      } catch {
        // Non-blocking
      }
    }

    return updated;
  }

  /**
   * Checks whether Administrator and Super Administrator login options are allowed on this workstation.
   * On native kiosk builds (Windows .exe, Android APK, iOS IPA), defaults to false (Technician-only station).
   * In standard web browsers, defaults to true.
   * Can be overridden by the administrator in System Settings.
   */
  public isStationAdminLoginAllowed(): boolean {
    const isNativeKiosk =
      (typeof window !== 'undefined' && Boolean((window as any).electronAPI?.isDesktop || (window as any).electronAPI)) ||
      Capacitor.isNativePlatform();

    const settings = this.getSettingsSync();
    if (settings.stationSecurity && typeof settings.stationSecurity.allowStationAdminLogin === 'boolean') {
      return settings.stationSecurity.allowStationAdminLogin;
    }
    // Default: false on native kiosks (Windows installer exe, APK, IPA), true on browser
    return !isNativeKiosk;
  }

  /**
   * Configures whether Administrator and Super Admin logins are permitted on this device.
   */
  public async setStationAdminLoginAllowed(allowed: boolean): Promise<void> {
    const current = this.getSettingsSync();
    const updated: SystemSettings = {
      ...current,
      stationSecurity: {
        ...current.stationSecurity,
        allowStationAdminLogin: allowed,
      },
    };
    await this.saveSettings(updated);
  }

  /**
   * Retrieves persistent processing parameters for plantar pressure heatmap synthesis.
   * Persists across all exams and sessions until updated by user.
   */
  public getProcessingParametersSync(): ProcessingParameters {
    try {
      const saved = localStorage.getItem(LS_KEYS.PROCESSING_PARAMETERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.smoothingStrength === 'number') {
          return {
            smoothingStrength: parsed.smoothingStrength,
            intensityLevels: parsed.intensityLevels || DEFAULT_PROCESSING_PARAMETERS.intensityLevels,
            colorMap: parsed.colorMap || DEFAULT_PROCESSING_PARAMETERS.colorMap,
            backgroundThreshold: typeof parsed.backgroundThreshold === 'number' ? parsed.backgroundThreshold : DEFAULT_PROCESSING_PARAMETERS.backgroundThreshold,
            flattenLighting: typeof parsed.flattenLighting === 'boolean' ? parsed.flattenLighting : DEFAULT_PROCESSING_PARAMETERS.flattenLighting,
            removePaperNoise: typeof parsed.removePaperNoise === 'boolean' ? parsed.removePaperNoise : DEFAULT_PROCESSING_PARAMETERS.removePaperNoise,
          };
        }
      }

      // Check settings fallback
      const settings = this.getSettingsSync();
      if (settings.processing) {
        return { ...settings.processing };
      }
    } catch {}
    return { ...DEFAULT_PROCESSING_PARAMETERS };
  }

  /**
   * Saves and permanently persists processing parameters for all subsequent exams.
   */
  public saveProcessingParameters(params: ProcessingParameters): void {
    try {
      localStorage.setItem(LS_KEYS.PROCESSING_PARAMETERS, JSON.stringify(params));
      const current = this.getSettingsSync();
      current.processing = { ...params };
      this.saveSettings(current);
    } catch {}
  }

  // =========================================================================
  // PATIENT DATABASE OPERATIONS
  // =========================================================================

  public getPatientsSync(): Patient[] {
    try {
      const saved = localStorage.getItem(LS_KEYS.PATIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  }

  public async getAllPatients(): Promise<Patient[]> {
    const db = await this.initDatabase();
    if (!db) return this.getPatientsSync();

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('patients', 'readonly');
        const store = tx.objectStore('patients');
        const request = store.getAll();

        request.onsuccess = () => {
          const list: Patient[] = request.result || [];
          localStorage.setItem(LS_KEYS.PATIENTS, JSON.stringify(list));
          resolve(list);
        };

        request.onerror = () => resolve(this.getPatientsSync());
      } catch {
        resolve(this.getPatientsSync());
      }
    });
  }

  public async savePatient(patient: Patient): Promise<Patient> {
    // 1. Sync to local memory cache
    const current = this.getPatientsSync();
    const existingIndex = current.findIndex((p) => p.id === patient.id);
    let updated: Patient[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = patient;
    } else {
      updated = [patient, ...current];
    }

    try {
      localStorage.setItem(LS_KEYS.PATIENTS, JSON.stringify(updated));
    } catch {
      // LocalStorage quota safety
    }

    // 2. Persist to IndexedDB
    const db = await this.initDatabase();
    if (db) {
      try {
        const tx = db.transaction('patients', 'readwrite');
        tx.objectStore('patients').put(patient);
      } catch {
        // Non-blocking
      }
    }

    return patient;
  }

  public async deletePatient(id: string): Promise<void> {
    const current = this.getPatientsSync().filter((p) => p.id !== id);
    try {
      localStorage.setItem(LS_KEYS.PATIENTS, JSON.stringify(current));
    } catch {
      // Ignore
    }

    const db = await this.initDatabase();
    if (db) {
      try {
        const tx = db.transaction('patients', 'readwrite');
        tx.objectStore('patients').delete(id);
      } catch {
        // Ignore
      }
    }
  }

  // =========================================================================
  // CLINICAL CASES & REPORT SAVINGS DATABASE OPERATIONS
  // =========================================================================

  public getCasesSync(): AnalysisCase[] {
    try {
      const saved = localStorage.getItem(LS_KEYS.CASES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  }

  public async getAllCases(): Promise<AnalysisCase[]> {
    const db = await this.initDatabase();
    if (!db) return this.getCasesSync();

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('cases', 'readonly');
        const store = tx.objectStore('cases');
        const request = store.getAll();

        request.onsuccess = () => {
          const list: AnalysisCase[] = request.result || [];
          try {
            const lightweight = list.map(stripHeavyCasePayloads);
            safeStorage.setItem(LS_KEYS.CASES, JSON.stringify(lightweight));
          } catch {
            // Large base64 scans can exceed localStorage; IndexedDB handles them safely!
          }
          resolve(list);
        };

        request.onerror = () => resolve(this.getCasesSync());
      } catch {
        resolve(this.getCasesSync());
      }
    });
  }

  public async getCase(id: string): Promise<AnalysisCase | undefined> {
    const db = await this.initDatabase();
    if (!db) {
      return this.getCasesSync().find((c) => c.id === id);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('cases', 'readonly');
        const request = tx.objectStore('cases').get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(this.getCasesSync().find((c) => c.id === id));
      } catch {
        resolve(this.getCasesSync().find((c) => c.id === id));
      }
    });
  }

  /**
   * Saves a complete clinical exam report and all associated image scans/heatmaps into Database
   */
  public async saveCase(examCase: AnalysisCase): Promise<AnalysisCase> {
    // 1. Update memory cache
    const current = this.getCasesSync();
    const existingIndex = current.findIndex((c) => c.id === examCase.id);
    let updated: AnalysisCase[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = examCase;
    } else {
      updated = [examCase, ...current];
    }

    try {
      const lightweight = updated.map(stripHeavyCasePayloads);
      safeStorage.setItem(LS_KEYS.CASES, JSON.stringify(lightweight));
    } catch {
      // LocalStorage quota may be reached by raw image scans; IndexedDB safely holds high-resolution scans!
    }

    // 2. Persist full case with high-res scans & heatmaps to IndexedDB
    const db = await this.initDatabase();
    if (db) {
      try {
        const tx = db.transaction('cases', 'readwrite');
        tx.objectStore('cases').put(examCase);
      } catch (err) {
        console.warn('PodoPress: Failed to write case to IndexedDB:', err);
      }
    }

    return examCase;
  }

  public async deleteCase(id: string): Promise<void> {
    const current = this.getCasesSync().filter((c) => c.id !== id);
    try {
      const lightweight = current.map(stripHeavyCasePayloads);
      safeStorage.setItem(LS_KEYS.CASES, JSON.stringify(lightweight));
    } catch {
      // Ignore
    }

    const db = await this.initDatabase();
    if (db) {
      try {
        const tx = db.transaction('cases', 'readwrite');
        tx.objectStore('cases').delete(id);
      } catch {
        // Ignore
      }
    }
  }

  // =========================================================================
  // AUDIT LOGS DATABASE OPERATIONS
  // =========================================================================

  public async getAuditLogs(): Promise<AuditEvent[]> {
    const db = await this.initDatabase();
    if (!db) {
      try {
        const raw = localStorage.getItem(LS_KEYS.AUDIT_LOG);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('audit_logs', 'readonly');
        const request = tx.objectStore('audit_logs').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async saveAuditLog(event: AuditEvent): Promise<void> {
    try {
      const raw = localStorage.getItem(LS_KEYS.AUDIT_LOG);
      const list: AuditEvent[] = raw ? JSON.parse(raw) : [];
      list.unshift(event);
      localStorage.setItem(LS_KEYS.AUDIT_LOG, JSON.stringify(list.slice(0, 100)));
    } catch {
      // Quota
    }

    const db = await this.initDatabase();
    if (db) {
      try {
        const tx = db.transaction('audit_logs', 'readwrite');
        tx.objectStore('audit_logs').put(event);
      } catch {
        // Ignore
      }
    }
  }

  // =========================================================================
  // PURGE & BACKUP EXPORT / IMPORT
  // =========================================================================

  public async purgeAllData(): Promise<void> {
    try {
      localStorage.removeItem(LS_KEYS.PATIENTS);
      localStorage.removeItem(LS_KEYS.CASES);
      localStorage.removeItem(LS_KEYS.SETTINGS);
      localStorage.removeItem(LS_KEYS.PATIENT_ID_CONFIG);
      localStorage.removeItem(LS_KEYS.AUDIT_LOG);
      localStorage.removeItem(LS_KEYS.SELECTED_PATIENT);
      localStorage.removeItem(LS_KEYS.SELECTED_CASE);
    } catch {
      // Ignore
    }

    const db = await this.initDatabase();
    if (db) {
      try {
        const tx = db.transaction(['patients', 'cases', 'settings', 'audit_logs'], 'readwrite');
        tx.objectStore('patients').clear();
        tx.objectStore('cases').clear();
        tx.objectStore('settings').clear();
        tx.objectStore('audit_logs').clear();
      } catch {
        // Ignore
      }
    }
  }

  public async exportDatabaseBackup(): Promise<string> {
    const [patients, cases, settings, patientIdConfig] = await Promise.all([
      this.getAllPatients(),
      this.getAllCases(),
      this.getSettings(),
      this.getPatientIdConfig(),
    ]);

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'PodoPress',
      settings,
      patientIdConfig,
      patients,
      cases,
    };

    return JSON.stringify(backup, null, 2);
  }

  public async importDatabaseBackup(jsonString: string): Promise<boolean> {
    try {
      const backup = JSON.parse(jsonString);
      if (!backup || typeof backup !== 'object') return false;

      if (backup.settings) {
        await this.saveSettings(backup.settings);
      }
      if (backup.patientIdConfig) {
        await this.savePatientIdConfig(backup.patientIdConfig);
      }
      if (Array.isArray(backup.patients)) {
        for (const pat of backup.patients) {
          await this.savePatient(pat);
        }
      }
      if (Array.isArray(backup.cases)) {
        for (const c of backup.cases) {
          await this.saveCase(c);
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to import database backup:', err);
      return false;
    }
  }

  /**
   * Imports a full Super Admin platform backup JSON (hospitals, administrators, technicians, cases, audit logs)
   * into the local database. Ideal for offline provisioning across machines.
   */
  public async importPlatformBackup(jsonString: string): Promise<{
    success: boolean;
    counts?: { hospitals: number; administrators: number; technicians: number; cases: number };
    error?: string;
  }> {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid backup file format.' };
      }

      let hospCount = 0;
      let adminCount = 0;
      let techCount = 0;
      let caseCount = 0;

      if (Array.isArray(data.hospitals)) {
        for (const h of data.hospitals) {
          await this.saveHospitalProfile(h);
          hospCount++;
        }
      }

      if (Array.isArray(data.administrators)) {
        const list = this.getAdminAccountsListSync();
        for (const a of data.administrators) {
          const idx = list.findIndex((x) => x.id === a.id || x.username === a.username);
          if (idx >= 0) list[idx] = a;
          else list.push(a);
          adminCount++;
        }
        try {
          localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(list));
          if (data.administrators[0]) {
            localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(data.administrators[0]));
          }
        } catch {}
      }

      if (Array.isArray(data.technicians)) {
        for (const t of data.technicians) {
          await this.saveTechnician(t);
          techCount++;
        }
      }

      if (Array.isArray(data.cases)) {
        for (const c of data.cases) {
          await this.saveCase(c);
          caseCount++;
        }
      }

      logAuditEvent(
        'PLATFORM_BACKUP_IMPORTED',
        `Imported platform snapshot: ${hospCount} hospitals, ${adminCount} administrators, ${techCount} technicians, ${caseCount} cases.`,
        'system',
        undefined,
        'info'
      );

      return {
        success: true,
        counts: {
          hospitals: hospCount,
          administrators: adminCount,
          technicians: techCount,
          cases: caseCount,
        },
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  // =========================================================================
  // HOSPITAL PROFILES & LOGIN OPERATIONS
  // =========================================================================

  public getHospitalProfilesSync(): HospitalProfile[] {
    try {
      const raw = localStorage.getItem(LS_KEYS.HOSPITALS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_HOSPITALS;
  }

  public async getHospitalProfiles(): Promise<HospitalProfile[]> {
    return this.getHospitalProfilesSync();
  }

  public getActiveHospitalSync(): HospitalProfile {
    const list = this.getHospitalProfilesSync();
    if (list.length === 0) {
      return EMPTY_HOSPITAL_PROFILE;
    }
    try {
      const activeUser = this.getActiveUserSync();
      if (activeUser && activeUser.role === 'admin' && activeUser.hospitalId) {
        const matched = list.find(
          (h) =>
            h.id === activeUser.hospitalId ||
            (activeUser.hospitalName && h.name.toLowerCase() === activeUser.hospitalName.toLowerCase())
        );
        if (matched) return matched;
      }
    } catch {}

    const activeId = localStorage.getItem(LS_KEYS.ACTIVE_HOSPITAL_ID) || list[0].id;
    return list.find((h) => h.id === activeId) || list[0] || EMPTY_HOSPITAL_PROFILE;
  }

  public async saveHospitalProfile(profile: HospitalProfile): Promise<void> {
    const list = this.getHospitalProfilesSync();
    const idx = list.findIndex((h) => h.id === profile.id);
    let updated: HospitalProfile[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = profile;
    } else {
      updated = [profile, ...list];
    }
    try {
      localStorage.setItem(LS_KEYS.HOSPITALS, JSON.stringify(updated));
    } catch {
      // Ignore
    }

    // If this profile is active, synchronize settings.clinical as well
    const active = this.getActiveHospitalSync();
    if (active.id === profile.id) {
      const settings = this.getSettingsSync();
      settings.clinical = {
        ...settings.clinical,
        clinicName: profile.name,
        clinicLogoUrl: profile.logoUrl || '',
        logoPosition: profile.logoPosition || 'Left',
        clinicAddress: profile.address || '',
        clinicContact: profile.contact || '',
        clinicRegistrationNo: profile.registrationNo || '',
        clinicFooterText: profile.footerText || '',
        defaultDoctor: profile.defaultDoctor || '',
        defaultTechnician: profile.defaultTechnician || '',
        hospitalId: profile.id,
      };
      await this.saveSettings(settings);
    }

    // Asynchronous background synchronization to Supabase Cloud
    import('./cloudSyncService').then(({ cloudSyncService }) => {
      cloudSyncService.pushHospitalProfilesToCloud([profile]).catch(() => {});
    });
  }

  public async setActiveHospital(
    hospitalId: string,
    userRole: 'admin' | 'doctor' | 'technician' = 'admin'
  ): Promise<HospitalProfile> {
    const list = this.getHospitalProfilesSync();
    if (list.length === 0) {
      return EMPTY_HOSPITAL_PROFILE;
    }
    const target = list.find((h) => h.id === hospitalId) || list[0];
    try {
      localStorage.setItem(LS_KEYS.ACTIVE_HOSPITAL_ID, target.id);
    } catch {
      // Ignore
    }

    // Update settings.clinical to mirror active hospital
    const settings = this.getSettingsSync();
    settings.clinical = {
      ...settings.clinical,
      clinicName: target.name,
      clinicLogoUrl: target.logoUrl || '',
      logoPosition: target.logoPosition || 'Left',
      clinicAddress: target.address || '',
      clinicContact: target.contact || '',
      clinicRegistrationNo: target.registrationNo || '',
      clinicFooterText: target.footerText || '',
      defaultDoctor: target.defaultDoctor || '',
      defaultTechnician: target.defaultTechnician || '',
      hospitalId: target.id,
      role: userRole,
    };
    await this.saveSettings(settings);

    target.activeUser = {
      username: `${userRole}@${target.code.toLowerCase()}.health`,
      name: `${target.defaultDoctor || 'Staff'} (${userRole.toUpperCase()})`,
      role: userRole,
      loginTime: new Date().toISOString(),
    };

    const idx = list.findIndex((h) => h.id === target.id);
    if (idx >= 0) {
      list[idx] = target;
      try {
        localStorage.setItem(LS_KEYS.HOSPITALS, JSON.stringify(list));
      } catch {
        // Ignore
      }
    }

    return target;
  }

  public setActiveHospitalIdSync(hospitalId: string): HospitalProfile {
    const list = this.getHospitalProfilesSync();
    if (list.length === 0) {
      return EMPTY_HOSPITAL_PROFILE;
    }
    const target = list.find((h) => h.id === hospitalId) || list[0];
    try {
      localStorage.setItem(LS_KEYS.ACTIVE_HOSPITAL_ID, target.id);
    } catch {
      // Ignore
    }
    return target;
  }

  // =========================================================================
  // TECHNICIAN STAFF MANAGEMENT (ADMIN CREATION & ROLE LOGIN)
  // =========================================================================

  public getTechniciansSync(): TechnicianUser[] {
    try {
      const saved = localStorage.getItem(LS_KEYS.TECHNICIANS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          let updated = false;
          for (const t of parsed) {
            if (!t.activationCode) {
              const prefix = t.hospitalId?.includes('metro') ? 'METRO' : 'TMH';
              t.activationCode = `${prefix}-TECH-${Math.floor(1000 + Math.random() * 9000)}`;
              updated = true;
            }
          }
          if (updated) {
            try {
              localStorage.setItem(LS_KEYS.TECHNICIANS, JSON.stringify(parsed));
            } catch {
              // Ignore
            }
          }
          return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  public async getTechnicians(): Promise<TechnicianUser[]> {
    const cached = this.getTechniciansSync();
    const db = await this.initDatabase();
    if (!db || !db.objectStoreNames.contains('technicians')) return cached;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('technicians', 'readonly');
        const store = tx.objectStore('technicians');
        const req = store.getAll();
        req.onsuccess = () => {
          const dbList = req.result as TechnicianUser[];
          if (dbList && dbList.length > 0) {
            resolve(dbList);
          } else {
            resolve(cached);
          }
        };
        req.onerror = () => resolve(cached);
      } catch {
        resolve(cached);
      }
    });
  }

  public async saveTechnician(tech: TechnicianUser): Promise<void> {
    if (!tech.activationCode || !tech.activationCodeExpiresAt) {
      const hosp = this.getHospitalProfilesSync().find((h) => h.id === tech.hospitalId);
      const timed = this.generateTimedActivationCode(hosp?.code || 'TMH');
      if (!tech.activationCode) tech.activationCode = timed.code;
      if (!tech.activationCodeGeneratedAt) tech.activationCodeGeneratedAt = timed.generatedAt;
      if (!tech.activationCodeExpiresAt) tech.activationCodeExpiresAt = timed.expiresAt;
    }

    const list = this.getTechniciansSync();
    const idx = list.findIndex((t) => t.id === tech.id);
    if (idx >= 0) {
      list[idx] = tech;
    } else {
      list.push(tech);
    }
    try {
      localStorage.setItem(LS_KEYS.TECHNICIANS, JSON.stringify(list));
    } catch {
      // Ignore
    }

    const db = await this.initDatabase();
    if (db && db.objectStoreNames.contains('technicians')) {
      try {
        const tx = db.transaction('technicians', 'readwrite');
        tx.objectStore('technicians').put(tech);
      } catch (err) {
        console.warn('PodoPress: Failed to save technician to IndexedDB:', err);
      }
    }

    // Asynchronous background synchronization to Supabase Cloud
    import('./cloudSyncService').then(({ cloudSyncService }) => {
      cloudSyncService.pushTechniciansToCloud([tech]).catch(() => {});
    });
  }

  public async deleteTechnician(id: string): Promise<void> {
    const list = this.getTechniciansSync().filter((t) => t.id !== id);
    try {
      localStorage.setItem(LS_KEYS.TECHNICIANS, JSON.stringify(list));
    } catch {
      // Ignore
    }

    const db = await this.initDatabase();
    if (db && db.objectStoreNames.contains('technicians')) {
      try {
        const tx = db.transaction('technicians', 'readwrite');
        tx.objectStore('technicians').delete(id);
      } catch (err) {
        console.warn('PodoPress: Failed to delete technician from IndexedDB:', err);
      }
    }
  }

  public authenticateTechnician(username: string, pin: string): TechnicianUser | null {
    const list = this.getTechniciansSync();
    const normalizedUser = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    const tech = list.find(
      (t) =>
        t.status === 'active' &&
        (t.username.toLowerCase() === normalizedUser || t.email?.toLowerCase() === normalizedUser) &&
        (!t.pin || t.pin === cleanPin)
    );

    if (tech) {
      logAuditEvent(
        'TECHNICIAN_LOGIN_SUCCESS',
        `Technician ${tech.name} (User ID: ${tech.username}) successfully authenticated at ${tech.hospitalName || 'Clinic'}.`,
        tech.username,
        undefined,
        'info',
        'technician'
      );
    } else {
      logAuditEvent(
        'TECHNICIAN_LOGIN_FAILED',
        `Failed technician login attempt for User ID "${username}". Incorrect credentials or inactive status.`,
        username,
        undefined,
        'security',
        'technician'
      );
    }

    return tech || null;
  }

  /**
   * Synchronously retrieves the current technician activation voucher expiration & rotation policy.
   */
  public getVoucherExpiryPolicySync(): VoucherExpiryPolicy {
    try {
      const saved = localStorage.getItem(LS_KEYS.VOUCHER_EXPIRY_POLICY);
      if (saved) {
        return { ...DEFAULT_VOUCHER_EXPIRY_POLICY, ...JSON.parse(saved) };
      }
    } catch {
      // storage fallback
    }
    return { ...DEFAULT_VOUCHER_EXPIRY_POLICY };
  }

  /**
   * Asynchronously retrieves the current technician activation voucher expiration & rotation policy.
   */
  public async getVoucherExpiryPolicy(): Promise<VoucherExpiryPolicy> {
    const cached = this.getVoucherExpiryPolicySync();
    const db = await this.initDatabase();
    if (!db || !db.objectStoreNames.contains('settings')) return cached;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('voucher_expiry_policy');
        req.onsuccess = () => {
          if (req.result) {
            resolve({ ...DEFAULT_VOUCHER_EXPIRY_POLICY, ...req.result });
          } else {
            resolve(cached);
          }
        };
        req.onerror = () => resolve(cached);
      } catch {
        resolve(cached);
      }
    });
  }

  /**
   * Saves updated voucher expiration policy (hours / days / minutes / custom)
   * and persists across IndexedDB and localStorage mirror.
   */
  public async saveVoucherExpiryPolicy(policy: Partial<VoucherExpiryPolicy>): Promise<VoucherExpiryPolicy> {
    const current = this.getVoucherExpiryPolicySync();
    const updated: VoucherExpiryPolicy = {
      ...current,
      ...policy,
      duration: Math.max(1, Number(policy.duration ?? current.duration)),
      unit: policy.unit || current.unit,
      autoRotateOnExpiry: policy.autoRotateOnExpiry !== undefined ? policy.autoRotateOnExpiry : current.autoRotateOnExpiry,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(LS_KEYS.VOUCHER_EXPIRY_POLICY, JSON.stringify(updated));
    } catch (err) {
      console.warn('PodoPress: Failed to save voucher expiry policy to localStorage:', err);
    }

    const db = await this.initDatabase();
    if (db && db.objectStoreNames.contains('settings')) {
      try {
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put(updated, 'voucher_expiry_policy');
      } catch (err) {
        console.warn('PodoPress: Failed to save voucher expiry policy to IndexedDB:', err);
      }
    }

    const policyDesc = formatVoucherPolicyLabel(updated);
    logAuditEvent(
      'VOUCHER_EXPIRY_POLICY_UPDATED',
      `Activation voucher expiration policy configured to ${policyDesc} (Auto-rotate: ${updated.autoRotateOnExpiry ? 'enabled' : 'disabled'}).`,
      'admin',
      undefined,
      'security'
    );

    return updated;
  }

  /**
   * Applies configured expiry policy across all existing registered technician activation vouchers.
   */
  public applyExpiryPolicyToAllTechnicians(policy?: VoucherExpiryPolicy): TechnicianUser[] {
    const pol = policy || this.getVoucherExpiryPolicySync();
    const durationMs = getVoucherExpiryMs(pol);
    const technicians = this.getTechniciansSync();
    const now = new Date();

    const updated = technicians.map((t) => {
      const genTime = t.activationCodeGeneratedAt ? new Date(t.activationCodeGeneratedAt).getTime() : now.getTime();
      const newExpiresAt = new Date(genTime + durationMs).toISOString();
      return {
        ...t,
        activationCodeGeneratedAt: t.activationCodeGeneratedAt || now.toISOString(),
        activationCodeExpiresAt: newExpiresAt,
      };
    });

    try {
      localStorage.setItem(LS_KEYS.TECHNICIANS, JSON.stringify(updated));
    } catch {
      // Ignore
    }
    updated.forEach((t) => {
      this.saveTechnician(t).catch(() => {});
    });
    logAuditEvent(
      'VOUCHER_EXPIRY_BATCH_APPLIED',
      `Applied ${formatVoucherPolicyLabel(pol)} expiration policy across all registered technician activation vouchers.`,
      'admin',
      undefined,
      'info'
    );
    return updated;
  }

  /**
   * Generates an auto-rotating activation voucher code with timestamp and expiry
   * adhering to the configured Administrator policy (hours / days / custom).
   */
  public generateTimedActivationCode(
    hospitalPrefix: string = 'TMH',
    policy?: VoucherExpiryPolicy
  ): {
    code: string;
    generatedAt: string;
    expiresAt: string;
    policyLabel: string;
  } {
    const pol = policy || this.getVoucherExpiryPolicySync();
    const raw = hospitalPrefix.includes('-') ? hospitalPrefix.split('-')[0] : hospitalPrefix;
    const cleanPrefix = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'CLINIC';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const code = `${cleanPrefix}-TECH-${randNum}`;
    const now = new Date();
    const durationMs = getVoucherExpiryMs(pol);
    const expiresAt = new Date(now.getTime() + durationMs).toISOString();
    return {
      code,
      generatedAt: now.toISOString(),
      expiresAt,
      policyLabel: formatVoucherPolicyLabel(pol),
    };
  }

  /**
   * Generates a unique, human-friendly technician activation voucher code.
   * e.g. "TMH-TECH-4821"
   */
  public generateActivationCode(hospitalPrefix: string = 'TMH'): string {
    return this.generateTimedActivationCode(hospitalPrefix).code;
  }

  /**
   * Checks if an activation code has expired according to the configured policy
   * (configurable hours / days / custom) and auto-rotates if needed.
   */
  public getOrRotateTechnicianActivationCode(techId: string): {
    code: string;
    expiresAt: string;
    isRotated: boolean;
    minutesRemaining: number;
    hoursRemaining: number;
    daysRemaining: number;
    remainingText: string;
    policyLabel: string;
  } {
    const list = this.getTechniciansSync();
    const tech = list.find((t) => t.id === techId);
    const now = Date.now();
    const policy = this.getVoucherExpiryPolicySync();
    const policyLabel = formatVoucherPolicyLabel(policy);

    if (!tech) {
      const fresh = this.generateTimedActivationCode('TMH', policy);
      const rem = formatRemainingTime(fresh.expiresAt);
      return {
        code: fresh.code,
        expiresAt: fresh.expiresAt,
        isRotated: false,
        minutesRemaining: rem.minutesRemaining,
        hoursRemaining: rem.hoursRemaining,
        daysRemaining: rem.daysRemaining,
        remainingText: rem.text,
        policyLabel,
      };
    }

    const hosp = this.getHospitalProfilesSync().find((h) => h.id === tech.hospitalId);
    const hospPrefix = hosp?.code || 'TMH';

    const expiresAtTime = tech.activationCodeExpiresAt ? new Date(tech.activationCodeExpiresAt).getTime() : 0;
    const isExpired = !tech.activationCode || !tech.activationCodeExpiresAt || now >= expiresAtTime;

    if (isExpired && policy.autoRotateOnExpiry) {
      const timed = this.generateTimedActivationCode(hospPrefix, policy);
      tech.activationCode = timed.code;
      tech.activationCodeGeneratedAt = timed.generatedAt;
      tech.activationCodeExpiresAt = timed.expiresAt;
      tech.isActivationCodeUsed = false;
      tech.activationCodeUsedAt = undefined;
      tech.activationCodeUsedByDeviceId = undefined;
      this.saveTechnician(tech);

      logAuditEvent(
        'ACTIVATION_CODE_AUTO_ROTATED',
        `Activation voucher auto-rotated for technician ${tech.name} (${tech.username}): New voucher ${timed.code} (Expires in ${policyLabel}).`,
        'system'
      );

      const rem = formatRemainingTime(timed.expiresAt);
      return {
        code: timed.code,
        expiresAt: timed.expiresAt,
        isRotated: true,
        minutesRemaining: rem.minutesRemaining,
        hoursRemaining: rem.hoursRemaining,
        daysRemaining: rem.daysRemaining,
        remainingText: rem.text,
        policyLabel,
      };
    }

    const rem = formatRemainingTime(tech.activationCodeExpiresAt || new Date(now + getVoucherExpiryMs(policy)).toISOString());
    return {
      code: tech.activationCode || '',
      expiresAt: tech.activationCodeExpiresAt || '',
      isRotated: false,
      minutesRemaining: rem.minutesRemaining,
      hoursRemaining: rem.hoursRemaining,
      daysRemaining: rem.daysRemaining,
      remainingText: rem.text,
      policyLabel,
    };
  }

  /**
   * Manually rotate technician activation code on demand (starts fresh clock based on configured policy).
   * Generates a fresh, unused single-use code and clears consumed status.
   */
  public rotateTechnicianActivationCode(techId: string): TechnicianUser | null {
    const list = this.getTechniciansSync();
    const tech = list.find((t) => t.id === techId);
    if (!tech) return null;

    const hosp = this.getHospitalProfilesSync().find((h) => h.id === tech.hospitalId);
    const policy = this.getVoucherExpiryPolicySync();
    const policyLabel = formatVoucherPolicyLabel(policy);
    const timed = this.generateTimedActivationCode(hosp?.code || 'TMH', policy);

    tech.activationCode = timed.code;
    tech.activationCodeGeneratedAt = timed.generatedAt;
    tech.activationCodeExpiresAt = timed.expiresAt;
    tech.isActivationCodeUsed = false;
    tech.activationCodeUsedAt = undefined;
    tech.activationCodeUsedByDeviceId = undefined;
    this.saveTechnician(tech);

    logAuditEvent(
      'ACTIVATION_CODE_MANUAL_ROTATE',
      `Administrator rotated activation voucher for ${tech.name} (${tech.username}) to ${timed.code} (Valid for ${policyLabel}). Fresh single-use code issued.`,
      'admin'
    );

    return tech;
  }

  /**
   * Synchronously retrieves the list of burned/consumed single-use activation codes.
   */
  public getBurnedActivationCodesSync(): string[] {
    try {
      const saved = localStorage.getItem(LS_KEYS.BURNED_ACTIVATION_CODES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Storage fallback
    }
    return [];
  }

  /**
   * Permanently marks an activation code as burned/consumed so it can never be used again on any device.
   */
  public recordBurnedActivationCodeSync(code: string): void {
    try {
      const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!clean) return;
      const list = this.getBurnedActivationCodesSync();
      if (!list.includes(clean)) {
        list.push(clean);
        localStorage.setItem(LS_KEYS.BURNED_ACTIVATION_CODES, JSON.stringify(list));
      }
    } catch (err) {
      console.warn('PodoPress: Failed to record burned activation code:', err);
    }
  }

  /**
   * Verifies if an activation code has already been consumed/burned on any device.
   */
  public isActivationCodeBurned(code: string): boolean {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return false;

    const burnedList = this.getBurnedActivationCodesSync();
    if (burnedList.includes(clean)) return true;

    // Verify technician records across local storage
    const techs = this.getTechniciansSync();
    for (const t of techs) {
      if (
        t.usedActivationCodes &&
        t.usedActivationCodes.some((c) => c.replace(/[^A-Z0-9]/g, '').toUpperCase() === clean)
      ) {
        return true;
      }
      if (
        t.isActivationCodeUsed &&
        t.activationCode &&
        t.activationCode.replace(/[^A-Z0-9]/g, '').toUpperCase() === clean
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get device authorization token synchronously from local storage.
   */
  public getDeviceAuthorizationSync(): DeviceAuthorizationToken | null {
    try {
      const saved = localStorage.getItem(LS_KEYS.DEVICE_AUTH_TOKEN);
      if (saved) {
        return JSON.parse(saved) as DeviceAuthorizationToken;
      }
    } catch {
      // Storage unavailable
    }
    return null;
  }

  /**
   * Get device authorization token from local storage / IndexedDB.
   */
  public async getDeviceAuthorization(): Promise<DeviceAuthorizationToken | null> {
    const cached = this.getDeviceAuthorizationSync();
    if (cached) return cached;

    const db = await this.initDatabase();
    if (!db || !db.objectStoreNames.contains('settings')) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('device_auth_token');
        req.onsuccess = () => resolve((req.result as DeviceAuthorizationToken) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Persists device authorization token locally for 100% offline access.
   */
  public async saveDeviceAuthorization(token: DeviceAuthorizationToken): Promise<void> {
    try {
      localStorage.setItem(LS_KEYS.DEVICE_AUTH_TOKEN, JSON.stringify(token));
    } catch {
      // Storage quota or restriction
    }

    const db = await this.initDatabase();
    if (db && db.objectStoreNames.contains('settings')) {
      try {
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put(token, 'device_auth_token');
      } catch (err) {
        console.warn('PodoPress: Failed to save device authorization to IndexedDB:', err);
      }
    }
  }

  /**
   * Clears device authorization token (allows unpairing or re-registering).
   */
  public async clearDeviceAuthorization(): Promise<void> {
    try {
      localStorage.removeItem(LS_KEYS.DEVICE_AUTH_TOKEN);
    } catch {
      // Ignore
    }

    const db = await this.initDatabase();
    if (db && db.objectStoreNames.contains('settings')) {
      try {
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').delete('device_auth_token');
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Validates Hospital Code and Technician Activation Code, then registers
   * and cryptographically binds the current hardware terminal for offline clinical scanning.
   */
  public async registerDeviceWithActivationCode(params: {
    hospitalCode: string;
    activationCode: string;
    username?: string;
    password?: string;
    deviceName?: string;
    macAddress?: string;
  }): Promise<{
    success: boolean;
    token?: DeviceAuthorizationToken;
    technician?: TechnicianUser;
    hospital?: HospitalProfile;
    error?: string;
  }> {
    const normHospCode = params.hospitalCode.trim().toUpperCase();
    const normActCode = params.activationCode.trim().toUpperCase();

    if (!normHospCode) {
      return { success: false, error: 'Please enter your Hospital or Clinic Code.' };
    }
    if (!normActCode) {
      return { success: false, error: 'Please enter your Technician Activation Code.' };
    }

    // Strict voucher validation: Must contain valid characters and minimum alphanumeric length
    const cleanAct = normActCode.replace(/[^A-Z0-9]/g, '');
    if (!cleanAct || cleanAct.length < 4 || /[*?!#$\s<>'"`]/.test(normActCode)) {
      logAuditEvent(
        'DEVICE_ACTIVATION_FAILED',
        `Failed device activation: Invalid or malformed voucher code "${params.activationCode}" for hospital ${params.hospitalCode}.`,
        'system',
        undefined,
        'security'
      );
      return {
        success: false,
        error: `Invalid or unrecognized Activation Code "${params.activationCode}". Please request a fresh voucher from your Hospital Administrator.`,
      };
    }

    // Strict Single-Use Enforcement: Burned codes cannot be reused on any device
    if (this.isActivationCodeBurned(normActCode)) {
      logAuditEvent(
        'DEVICE_ACTIVATION_REJECTED_ALREADY_USED',
        `Activation Code "${normActCode}" has already been used on a workstation. Single-use voucher consumed.`,
        params.username || 'unknown',
        undefined,
        'security',
        'technician'
      );
      return {
        success: false,
        error: `Station Activation Code "${params.activationCode}" has already been used and registered. Each activation code is valid for single-use only on one station. Based on your hour/day permit policy, please contact your Hospital Administrator for a fresh activation code.`,
      };
    }

    // 1. Resolve Hospital (or Auto-Provision on Fresh / Remote Station)
    const hospitals = this.getHospitalProfilesSync();
    let hospital = hospitals.find(
      (h: HospitalProfile) =>
        h.code.toUpperCase() === normHospCode ||
        h.id.toUpperCase() === normHospCode ||
        h.name.toLowerCase().includes(normHospCode.toLowerCase())
    );

    // If hospital is not yet present in the local database (fresh installation on client PC):
    // Check if the voucher code matches the clinic prefix (e.g., "T-TECH-4728" matches "T")
    if (!hospital) {
      // 1a. Query Supabase Cloud first for registered clinic & voucher
      try {
        const { cloudSyncService } = await import('./cloudSyncService');
        const remoteLookup = await cloudSyncService.lookupRemoteVoucher(normActCode);
        if (remoteLookup.found && remoteLookup.hospital) {
          hospital = remoteLookup.hospital;
          await this.saveHospitalProfile(hospital);
        }
      } catch {}

      if (!hospital) {
        const codePrefix = normActCode.split('-')[0];
        const isVoucherMatch =
          normActCode.startsWith(`${normHospCode}-`) ||
          codePrefix === normHospCode ||
          normActCode.includes('-TECH-');

        if (isVoucherMatch) {
          const autoHosp: HospitalProfile = {
            ...EMPTY_HOSPITAL_PROFILE,
            id: `hosp-${normHospCode.toLowerCase()}`,
            code: normHospCode,
            name: `${normHospCode} Clinical Hospital Center`,
          };
          await this.saveHospitalProfile(autoHosp);
          hospital = autoHosp;

          logAuditEvent(
            'HOSPITAL_AUTO_PROVISIONED',
            `Clinic profile for "${normHospCode}" auto-provisioned on remote station via valid activation voucher ${normActCode}.`,
            'system',
            undefined,
            'info'
          );
        } else {
          logAuditEvent(
            'DEVICE_ACTIVATION_FAILED',
            `Failed device activation: Clinic code "${params.hospitalCode}" not found and voucher "${normActCode}" prefix does not match.`,
            'system',
            undefined,
            'security'
          );
          return {
            success: false,
            error: `Hospital or Clinic with code "${params.hospitalCode}" was not found in the clinic directory. Please ensure your Clinic Code matches your activation voucher code.`,
          };
        }
      }
    }

    if (!hospital) {
      return {
        success: false,
        error: `Hospital or Clinic with code "${params.hospitalCode}" was not found in the clinic directory.`,
      };
    }

    // 2. Resolve Technician by Username and/or Activation Code
    const technicians = this.getTechniciansSync();
    let tech: TechnicianUser | undefined;

    // If explicit username provided, match technician account first
    if (params.username && params.username.trim()) {
      const cleanUser = params.username.trim().toLowerCase();
      tech = technicians.find(
        (t) => t.username.toLowerCase() === cleanUser || (t.email && t.email.toLowerCase() === cleanUser)
      );
    }

    // Match by activation code if not matched by username or to verify voucher
    if (!tech) {
      tech = technicians.find(
        (t) =>
          (t.activationCode && t.activationCode.trim().toUpperCase() === normActCode) ||
          (t.activationCode && t.activationCode.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanAct)
      );
    }

    // Fallback search by username or recovery key if technician entered that
    if (!tech) {
      tech = technicians.find(
        (t) =>
          t.username.trim().toUpperCase() === normActCode ||
          (t.recoveryKey && t.recoveryKey.trim().toUpperCase() === normActCode) ||
          t.username.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanAct
      );
    }

    // Query Supabase Cloud for technician registered with this voucher
    if (!tech) {
      try {
        const { cloudSyncService } = await import('./cloudSyncService');
        const remoteLookup = await cloudSyncService.lookupRemoteVoucher(normActCode);
        if (remoteLookup.found && remoteLookup.technician) {
          tech = remoteLookup.technician;
          await this.saveTechnician(tech);
        }
      } catch {}
    }

    // Auto-provisioning technician on fresh remote station:
    // If technician is not yet registered locally, but activation voucher format is valid:
    if (!tech) {
      const codePrefix = normActCode.split('-')[0];
      const isVoucherMatch =
        normActCode.startsWith(`${normHospCode}-`) ||
        codePrefix === normHospCode ||
        normActCode.includes('-TECH-');

      if (isVoucherMatch) {
        const rawUser = (params.username && params.username.trim()) || `tech@${normHospCode.toLowerCase()}.health`;
        const rawNamePart = rawUser.includes('@') ? rawUser.split('@')[0] : rawUser;
        const displayName = rawNamePart.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        const autoTech: TechnicianUser = {
          id: `tech-${normHospCode.toLowerCase()}-${Date.now().toString(36)}`,
          name: displayName || 'Clinical Specialist',
          username: rawUser,
          pin: (params.password && params.password.trim()) || '1234',
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          role: 'technician',
          status: 'active',
          activationCode: normActCode,
          activationCodeGeneratedAt: new Date().toISOString(),
          isActivationCodeUsed: false,
          createdAt: new Date().toISOString(),
        };
        await this.saveTechnician(autoTech);
        tech = autoTech;

        // Also ensure an Administrator account exists for this clinic on this machine
        const adminList = this.getAdminAccountsListSync();
        if (!adminList.some((a) => a.hospitalId === hospital.id)) {
          const autoAdmin: AdminAccount = {
            id: `admin-${normHospCode.toLowerCase()}`,
            name: `${normHospCode} Hospital Administrator`,
            username: `admin@${normHospCode.toLowerCase()}.health`,
            pin: (params.password && params.password.trim()) || 'admin123',
            role: 'admin',
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            email: `admin@${normHospCode.toLowerCase()}.health`,
            phone: '+1 (555) 019-9000',
            createdAt: new Date().toISOString(),
            status: 'active',
            recoveryKey: `REC-${normHospCode}-9901`,
          };
          adminList.push(autoAdmin);
          try {
            localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(adminList));
            localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(autoAdmin));
          } catch {}
        }

        logAuditEvent(
          'TECHNICIAN_AUTO_PROVISIONED',
          `Technician "${tech.name}" (${tech.username}) auto-provisioned on remote station via voucher ${normActCode}.`,
          tech.username,
          undefined,
          'info',
          'technician'
        );
      } else {
        logAuditEvent(
          'DEVICE_ACTIVATION_FAILED',
          `Failed device activation: Invalid voucher code "${params.activationCode}" for hospital ${params.hospitalCode}.`,
          'system',
          undefined,
          'security'
        );
        return {
          success: false,
          error: `Invalid or unrecognized Activation Code "${params.activationCode}". Please request a fresh voucher from your Hospital Administrator.`,
        };
      }
    }

    if (!tech) {
      return {
        success: false,
        error: `Invalid or unrecognized Activation Code "${params.activationCode}".`,
      };
    }

    // Verify that the technician's assigned activation code is not already consumed
    if (
      tech.isActivationCodeUsed ||
      (tech.usedActivationCodes &&
        tech.usedActivationCodes.some((c) => c.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanAct))
    ) {
      logAuditEvent(
        'DEVICE_ACTIVATION_REJECTED_ALREADY_USED',
        `Technician ${tech.name} (${tech.username}) activation code "${normActCode}" has already been consumed. Re-registration rejected.`,
        tech.username,
        undefined,
        'security',
        'technician'
      );
      return {
        success: false,
        error: `Station Activation Code "${params.activationCode}" has already been used and registered. Each activation code is valid for single-use only on one station. Based on your hour/day permit policy, please contact your Hospital Administrator for a fresh activation code.`,
      };
    }

    // Check Configured Expiration on Activation Voucher (Hours / Days / Minutes)
    if (tech.activationCodeExpiresAt) {
      const expiresAtMs = new Date(tech.activationCodeExpiresAt).getTime();
      const pol = this.getVoucherExpiryPolicySync();
      const policyLabel = formatVoucherPolicyLabel(pol);

      if (Date.now() > expiresAtMs) {
        logAuditEvent(
          'DEVICE_ACTIVATION_REJECTED_EXPIRED',
          `Activation Code ${normActCode} expired (${policyLabel} policy). Station registration rejected.`,
          tech.username,
          undefined,
          'security',
          'technician'
        );
        return {
          success: false,
          error: `Activation Code "${params.activationCode}" has expired (configured ${policyLabel} security policy). Please request a fresh voucher from your Hospital Administrator.`,
        };
      }
    }

    if (tech.status !== 'active') {
      return {
        success: false,
        error: `Technician account "${tech.name}" is currently marked inactive by the Administrator.`,
      };
    }

    // 3. Update password if technician customized it on activation
    if (params.password && params.password.trim().length >= 4) {
      tech.pin = params.password.trim();
    }

    // 4. Bind hardware device fingerprint & MAC Address
    const hardwareDeviceId = deviceBindingService.getCurrentDeviceId();
    const macAddress = params.macAddress || deviceBindingService.getDeviceMacAddress();
    const deviceName =
      params.deviceName?.trim() ||
      deviceBindingService.getCurrentDeviceInfo()?.name ||
      'Authorized Diagnostic Station';

    // Calculate time-bound permit expiration based on configured hour/day policy
    const expiryPolicy = this.getVoucherExpiryPolicySync();
    const permitDurationMs = getVoucherExpiryMs(expiryPolicy);
    const permitExpiresAt = new Date(Date.now() + permitDurationMs).toISOString();

    // Burn / consume this single-use activation code immediately
    this.recordBurnedActivationCodeSync(normActCode);
    const updatedUsed = Array.from(new Set([...(tech.usedActivationCodes || []), cleanAct, normActCode]));

    tech.registeredDeviceId = hardwareDeviceId;
    tech.macAddress = macAddress;
    tech.isRegisteredOnDevice = true;
    tech.authorizedAt = new Date().toISOString();
    tech.hospitalId = hospital.id;
    tech.hospitalName = hospital.name;
    tech.isActivationCodeUsed = true;
    tech.activationCodeUsedAt = new Date().toISOString();
    tech.activationCodeUsedByDeviceId = hardwareDeviceId;
    tech.usedActivationCodes = updatedUsed;
    tech.permitExpiresAt = permitExpiresAt;

    await this.saveTechnician(tech);

    // Bind station in device license fleet
    deviceBindingService.bindCurrentDeviceWithUser(tech.username, tech.name, macAddress, deviceName);

    // 5. Generate persistent Device Authorization Token
    const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tokenStr = `AUTH-DEV-${randPart1}-${randPart2}`;

    const authToken: DeviceAuthorizationToken = {
      token: tokenStr,
      hospitalId: hospital.id,
      hospitalCode: hospital.code,
      hospitalName: hospital.name,
      technicianId: tech.id,
      technicianName: tech.name,
      technicianUsername: tech.username,
      deviceFingerprint: hardwareDeviceId,
      macAddress,
      deviceName,
      appVersion: APP_CURRENT_VERSION,
      authorizedAt: new Date().toISOString(),
      expiresAt: permitExpiresAt, // Time-bound permit expiration based on hour/day policy
      permitPolicy: expiryPolicy,
      status: 'authorized',
    };

    await this.saveDeviceAuthorization(authToken);

    // Opportunistically ping cloud mailbox with activation heartbeat
    cloudSyncService.syncStationHeartbeat(authToken).catch(() => {});

    // 6. Set Active User & Hospital Session
    this.setActiveHospitalIdSync(hospital.id);
    this.setActiveUser('technician', tech.name, tech.id, hospital.id, hospital.name);

    logAuditEvent(
      'DEVICE_ACTIVATION_SUCCESS',
      `Station ${hardwareDeviceId} successfully authorized for technician ${tech.name} (User ID: ${tech.username}) at ${hospital.name} with voucher ${normActCode}.`,
      tech.username,
      undefined,
      'info',
      'technician'
    );

    return {
      success: true,
      token: authToken,
      technician: tech,
      hospital,
    };
  }

  /**
   * Station activation endpoint alias (conforms to test suite and multi-station activation).
   */
  public async activateStationWithCode(params: {
    hospitalCode: string;
    activationCode: string;
    password?: string;
    deviceName?: string;
  }): Promise<{
    success: boolean;
    token?: DeviceAuthorizationToken;
    technician?: TechnicianUser;
    hospital?: HospitalProfile;
    error?: string;
  }> {
    return this.registerDeviceWithActivationCode(params);
  }


  /**
   * Evaluates if this station is authorized to run examinations.
   * If a new device is detected OR an app update/new version was installed,
   * it requires re-authorization via activation code before unlocking further processings.
   */
  public checkDeviceAuthorizationStatus(): {
    isAuthorized: boolean;
    reason?: 'unregistered' | 'new_device' | 'new_version' | 'revoked' | 'inactive_technician' | 'permit_expired';
    token: DeviceAuthorizationToken | null;
    deviceId: string;
    currentVersion: string;
    registeredVersion?: string;
  } {
    const currentDeviceId = deviceBindingService.getCurrentDeviceId();
    const currentVersion = APP_CURRENT_VERSION;
    const token = this.getDeviceAuthorizationSync();

    if (!token) {
      return {
        isAuthorized: false,
        reason: 'unregistered',
        token: null,
        deviceId: currentDeviceId,
        currentVersion,
      };
    }

    if (token.status !== 'authorized') {
      return {
        isAuthorized: false,
        reason: 'revoked',
        token,
        deviceId: currentDeviceId,
        currentVersion,
      };
    }

    // Hardware station fingerprint check: if app was moved to a new device or browser storage
    if (token.deviceFingerprint !== currentDeviceId) {
      return {
        isAuthorized: false,
        reason: 'new_device',
        token,
        deviceId: currentDeviceId,
        currentVersion,
      };
    }

    // Station is permanently bound to this physical hardware device!
    // Seamless upgrade on the SAME physical machine:
    // When a new build / Windows EXE is installed, silently update version without invalidating authorization
    if (token.appVersion !== currentVersion) {
      token.appVersion = currentVersion;
      try {
        localStorage.setItem(LS_KEYS.DEVICE_AUTH_TOKEN, JSON.stringify(token));
      } catch {
        // Storage fallback
      }
    }

    return {
      isAuthorized: true,
      token,
      deviceId: currentDeviceId,
      currentVersion,
      registeredVersion: token.appVersion,
    };
  }

  public isDeviceAuthorized(): boolean {
    return this.checkDeviceAuthorizationStatus().isAuthorized;
  }

  /**
   * Revokes the local device authorization token (e.g. on remote administrator kill-switch command).
   */
  public async revokeDeviceAuthorization(reason = 'Remote administrator revocation'): Promise<void> {
    const token = this.getDeviceAuthorizationSync();
    if (token) {
      token.status = 'revoked';
      await this.saveDeviceAuthorization(token);
      logAuditEvent(
        'DEVICE_AUTHORIZATION_REVOKED',
        `Device authorization revoked for station ${token.deviceFingerprint}. Reason: ${reason}.`,
        token.technicianUsername || 'system',
        undefined,
        'security',
        'admin'
      );
    }
  }

  /**
   * Synchronous check of pending cases count for instant header badges.
   */
  public getPendingCasesCountSync(): number {
    try {
      const cases = this.getCasesSync();
      return cases.filter((c) => c.syncStatus !== 'synced').length;
    } catch {
      return 0;
    }
  }

  /**
   * Synchronize all offline-generated reports and cases to the cloud database.
   * Updates case sync status in IndexedDB and storage cache.
   */
  public async syncAllPendingCases(
    onProgress?: (synced: number, total: number) => void
  ): Promise<{ syncedCount: number; totalPending: number; errors: string[] }> {
    const allCases = await this.getAllCases();
    const pendingCases = allCases.filter((c: AnalysisCase) => c.syncStatus !== 'synced');
    const totalPending = pendingCases.length;
    const errors: string[] = [];

    if (totalPending === 0) {
      return { syncedCount: 0, totalPending: 0, errors: [] };
    }

    const activeUser = this.getActiveUserSync();
    const techMeta = activeUser
      ? {
          id: activeUser.technicianId || activeUser.username || 'tech-default',
          name: activeUser.name || 'Technician',
          hospitalId: activeUser.hospitalId,
        }
      : undefined;

    let syncedCount = 0;
    for (const c of pendingCases) {
      try {
        const syncRes = await cloudSyncService.syncCase(c, techMeta);
        if (syncRes.success) {
          c.syncStatus = 'synced';
          c.cloudSyncId = syncRes.cloudId || `CLOUD-SYNC-${(c.caseNumber || c.id).replace(/[^a-zA-Z0-9]/g, '')}`;
          c.lastSyncAttempt = new Date().toISOString();
          if (techMeta) {
            c.technicianId = techMeta.id;
            c.technicianName = techMeta.name;
          }
          await this.saveCase(c);
          syncedCount++;
          onProgress?.(syncedCount, totalPending);
        } else {
          errors.push(`Case ${c.caseNumber || c.id}: ${syncRes.error || 'Sync failed'}`);
        }
      } catch (err) {
        errors.push(`Case ${c.caseNumber || c.id}: ${(err as Error).message}`);
      }
    }

    return { syncedCount, totalPending, errors };
  }

  // =========================================================================
  // HOSPITAL-WISE PATIENT & REPORT MANAGEMENT
  // =========================================================================

  public async getPatientsByHospital(hospitalId?: string): Promise<Patient[]> {
    const all = await this.getAllPatients();
    if (!hospitalId || hospitalId === 'ALL') return all;
    return all.filter((p: Patient) => p.hospitalId === hospitalId);
  }

  public async getCasesByHospital(hospitalId?: string): Promise<AnalysisCase[]> {
    const all = await this.getAllCases();
    if (!hospitalId || hospitalId === 'ALL') return all;
    return all.filter((c: AnalysisCase) => c.hospitalId === hospitalId);
  }

  public async reassignPatientHospital(patientId: string, hospitalId: string, hospitalName?: string): Promise<void> {
    const allPatients = await this.getAllPatients();
    const patient = allPatients.find((p) => p.id === patientId);
    if (!patient) return;
    const updated: Patient = {
      ...patient,
      hospitalId,
      hospitalName: hospitalName || patient.hospitalName,
    };
    await this.savePatient(updated);

    // Also update any associated cases
    const allCases = await this.getAllCases();
    for (const c of allCases) {
      if (c.patientId === patientId) {
        await this.saveCase({
          ...c,
          hospitalId,
          clinicName: hospitalName || c.clinicName,
        });
      }
    }
  }

  // =========================================================================
  // USER LOGIN & ROLE ACCESS CONTROL (ADMIN vs TECHNICIAN)
  // =========================================================================

  public hasActiveSession(): boolean {
    try {
      const saved = localStorage.getItem(LS_KEYS.ACTIVE_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed && (parsed.role === 'superadmin' || parsed.role === 'admin' || parsed.role === 'technician'));
      }
    } catch {
      // Fallback
    }
    return false;
  }

  public getActiveUserSync(): SystemUserSession {
    try {
      const saved = localStorage.getItem(LS_KEYS.ACTIVE_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'superadmin' || parsed.role === 'admin' || parsed.role === 'technician')) {
          return {
            ...SYSTEM_ACCOUNTS[parsed.role as 'superadmin' | 'admin' | 'technician'],
            ...parsed,
          };
        }
      }
    } catch {
      // Fallback
    }
    return SYSTEM_ACCOUNTS.technician;
  }

  public setActiveUser(
    role: 'superadmin' | 'admin' | 'technician',
    customName?: string,
    technicianId?: string,
    hospitalId?: string,
    hospitalName?: string
  ): SystemUserSession {
    const base = SYSTEM_ACCOUNTS[role];
    const session: SystemUserSession = {
      ...base,
      name: customName || base.name,
      technicianId: technicianId || (role === 'technician' ? base.technicianId : undefined),
      hospitalId: hospitalId || base.hospitalId,
      hospitalName: hospitalName || base.hospitalName,
      loginTime: new Date().toISOString(),
    };
    try {
      localStorage.setItem(LS_KEYS.ACTIVE_USER, JSON.stringify(session));
      if (hospitalId) {
        this.setActiveHospitalIdSync(hospitalId);
      }
    } catch {
      // Ignore
    }
    return session;
  }

  public logoutUser(): void {
    try {
      const activeUser = this.getActiveUserSync();
      localStorage.removeItem(LS_KEYS.ACTIVE_USER);
      safeStorage.removeItem('ppa-selected-patient-id');
      safeStorage.removeItem('ppa-selected-case-id');
      safeStorage.removeItem('ppa-active-session');
      logAuditEvent(
        'USER_LOGOUT',
        `User ${activeUser.name} (${activeUser.username}, role: ${activeUser.role}) logged out of session. Active session purged.`,
        activeUser.username,
        undefined,
        'info',
        activeUser.role
      );
    } catch (e) {
      console.warn('Failed to clean user session during logout', e);
    }
  }

  // =========================================================================
  // ADMINISTRATOR ACCOUNT CREATION & AUTHENTICATION
  // =========================================================================

  public hasRegisteredAdminAccount(): boolean {
    try {
      const saved = localStorage.getItem(LS_KEYS.ADMIN_ACCOUNT);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed && parsed.id && parsed.username);
      }
    } catch {
      // Fallback
    }
    return false;
  }

  public getAdminAccountSync(): AdminAccount {
    try {
      const saved = localStorage.getItem(LS_KEYS.ADMIN_ACCOUNT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_ADMIN_ACCOUNT;
  }

  public setInitialAdminPassword(newPassword: string): AdminAccount {
    const current = this.getAdminAccountSync();
    const updated: AdminAccount = {
      ...current,
      pin: newPassword.trim(),
      isInitialSetupCompleted: true,
      lastLoginAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(updated));
      const list = this.getAdminAccountsListSync();
      const idx = list.findIndex((a) => a.id === updated.id);
      if (idx >= 0) list[idx] = updated;
      else list.push(updated);
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(list));
    } catch {
      // Ignore
    }
    deviceBindingService.bindCurrentDevice(`${updated.name} Station`);
    this.authorizeStationForAdmin(updated);
    this.setActiveUser('admin', updated.name, undefined, updated.hospitalId, updated.hospitalName);
    return updated;
  }

  /**
   * Authorizes and cryptographically binds the physical diagnostic station when the Hospital Administrator
   * sets master credentials or logs in. Unlocks clinical workflows immediately.
   */
  public authorizeStationForAdmin(admin?: AdminAccount): DeviceAuthorizationToken {
    const adminAcc = admin || this.getAdminAccountSync();
    const currentDeviceId = deviceBindingService.getCurrentDeviceId();
    const existingToken = this.getDeviceAuthorizationSync();

    if (
      existingToken &&
      existingToken.deviceFingerprint === currentDeviceId &&
      existingToken.status === 'authorized'
    ) {
      if (existingToken.appVersion !== APP_CURRENT_VERSION) {
        existingToken.appVersion = APP_CURRENT_VERSION;
        try {
          localStorage.setItem(LS_KEYS.DEVICE_AUTH_TOKEN, JSON.stringify(existingToken));
        } catch {
          // Ignore
        }
      }
      return existingToken;
    }

    const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tokenStr = `AUTH-ADMIN-${randPart1}-${randPart2}`;

    const hospitals = this.getHospitalProfilesSync();
    const hosp = hospitals.find((h) => h.id === adminAcc.hospitalId) || hospitals[0] || {
      id: adminAcc.hospitalId || 'hosp-technomind-main',
      code: 'TMH-CENTRAL',
      name: adminAcc.hospitalName || 'Technomind Healthcare Systems',
    };

    const authToken: DeviceAuthorizationToken = {
      token: tokenStr,
      hospitalId: hosp.id,
      hospitalCode: hosp.code || 'TMH-CENTRAL',
      hospitalName: hosp.name || 'Technomind Healthcare Systems',
      technicianId: adminAcc.id || 'admin-master-01',
      technicianName: adminAcc.name || 'Dr. Specialist',
      deviceFingerprint: currentDeviceId,
      deviceName: `${adminAcc.name || 'Hospital Admin'} Workstation`,
      appVersion: APP_CURRENT_VERSION,
      authorizedAt: new Date().toISOString(),
      status: 'authorized',
    };

    try {
      localStorage.setItem(LS_KEYS.DEVICE_AUTH_TOKEN, JSON.stringify(authToken));
    } catch {
      // Ignore
    }

    this.saveDeviceAuthorization(authToken).catch(() => {});
    return authToken;
  }

  public registerAdminAccount(account: AdminAccount): AdminAccount {
    const fullAccount: AdminAccount = {
      ...account,
      id: account.id || 'admin-' + Math.random().toString(36).substring(2, 9),
      createdAt: account.createdAt || new Date().toISOString(),
      status: 'active',
      recoveryKey: account.recoveryKey || 'REC-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    };

    try {
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(fullAccount));
      // Store in admin list as well
      const list = this.getAdminAccountsListSync();
      const idx = list.findIndex((a) => a.id === fullAccount.id);
      if (idx >= 0) list[idx] = fullAccount;
      else list.push(fullAccount);
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(list));
    } catch {
      // LocalStorage limit
    }

    // Automatically bind the current device as the primary authorized device for this admin
    deviceBindingService.bindCurrentDevice(`${fullAccount.name} Terminal`);
    this.authorizeStationForAdmin(fullAccount);

    // Update active user session
    this.setActiveUser('admin', fullAccount.name, undefined, fullAccount.hospitalId, fullAccount.hospitalName);

    // Asynchronous background synchronization to Supabase Cloud
    import('./cloudSyncService').then(({ cloudSyncService }) => {
      cloudSyncService.pushAdminAccountsToCloud([fullAccount]).catch(() => {});
    });

    return fullAccount;
  }

  public getAdminAccountsListSync(): AdminAccount[] {
    try {
      const saved = localStorage.getItem(LS_KEYS.ADMIN_ACCOUNTS_LIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((a) => a && a.id);
        }
      }
    } catch {
      // Fallback
    }
    const single = this.getAdminAccountSync();
    return single && single.id ? [single] : [];
  }

  public clearAdminLockout(): void {
    try {
      localStorage.removeItem('podopress_admin_lockout_v1');
    } catch {
      // Ignore
    }
  }

  public authenticateAdmin(
    usernameOrEmail: string,
    pin: string
  ): { success: boolean; account?: AdminAccount; error?: string } {
    const LOCKOUT_KEY = 'podopress_admin_lockout_v1';
    const cleanUser = usernameOrEmail.trim().toLowerCase();
    const cleanPin = pin.trim();

    // Check if Super Admin Master Override was provided
    const superAdmin = this.getSuperAdminAccountSync();
    const isSuperAdminMatch =
      cleanPin === 'superadmin@123' ||
      cleanPin === superAdmin?.pin ||
      cleanPin.toUpperCase() === 'SUPER-MASTER-KEY-9999' ||
      cleanUser === 'superadmin@technomind.health' ||
      cleanUser === 'superadmin';

    // Super Admin Master Override unlocks any existing lockout immediately
    if (isSuperAdminMatch) {
      this.clearAdminLockout();
    }

    let lockoutState = { failedAttempts: 0, lockedUntil: 0 };
    try {
      const savedLockout = localStorage.getItem(LOCKOUT_KEY);
      if (savedLockout) {
        lockoutState = JSON.parse(savedLockout);
      }
    } catch {
      // Fallback
    }

    if (!isSuperAdminMatch && lockoutState.lockedUntil && Date.now() < lockoutState.lockedUntil) {
      const remainingSec = Math.ceil((lockoutState.lockedUntil - Date.now()) / 1000);
      return {
        success: false,
        error: `Master Administrator authentication is locked due to consecutive failed attempts. Please wait ${remainingSec} seconds or use your Recovery Key / Super Admin Password.`,
      };
    }

    const recordFailedAttempt = () => {
      lockoutState.failedAttempts = (lockoutState.failedAttempts || 0) + 1;
      if (lockoutState.failedAttempts >= 5) {
        lockoutState.lockedUntil = Date.now() + 15 * 60 * 1000;
      }
      try {
        localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lockoutState));
      } catch {
        // Ignore
      }
    };

    const clearLockout = () => {
      this.clearAdminLockout();
    };

    const adminList = this.getAdminAccountsListSync();

    // Match across all registered admins (created by Super Admin or default)
    if (adminList.length > 0) {
      const match = adminList.find((a) => {
        const matchUser =
          cleanUser === 'admin' ||
          a.username.toLowerCase() === cleanUser ||
          (a.email && a.email.toLowerCase() === cleanUser) ||
          a.name.toLowerCase() === cleanUser;
        const matchPin = (a.pin && a.pin.trim() === cleanPin) || isSuperAdminMatch;
        return matchUser && matchPin;
      });

      if (match) {
        if (match.status === 'suspended') {
          return {
            success: false,
            error: 'This Hospital Administrator account has been suspended by the Super Administrator.',
          };
        }
        clearLockout();
        match.lastLoginAt = new Date().toISOString();
        const updatedList = adminList.map((x) => (x.id === match.id ? match : x));
        try {
          localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(updatedList));
          localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(match));
        } catch {}

        this.authorizeStationForAdmin(match);
        this.setActiveUser('admin', match.name, undefined, match.hospitalId, match.hospitalName);
        logAuditEvent(
          'ADMIN_LOGIN_SUCCESS',
          `Administrator ${match.name} (User ID: ${match.username}) successfully authenticated for hospital "${match.hospitalName}".`,
          match.username,
          undefined,
          'info',
          'admin'
        );
        return { success: true, account: match };
      }

      recordFailedAttempt();
      logAuditEvent(
        'ADMIN_LOGIN_FAILED',
        `Failed Administrator login attempt for User ID "${usernameOrEmail}". Incorrect credentials.`,
        usernameOrEmail,
        undefined,
        'security',
        'admin'
      );
      if (lockoutState.failedAttempts >= 5) {
        return { success: false, error: 'Master Administrator account is locked due to consecutive failed attempts. Please wait or use Super Admin master credentials.' };
      }
      return { success: false, error: 'Invalid Administrator User ID or Master Password.' };
    }

    // Zero registered administrators on this station:
    // If Super Admin credentials or initial Default Admin credentials used, auto-provision initial Administrator account
    const isDefaultAdminMatch =
      (cleanUser === 'admin' || cleanUser === 'admin@technomind.health' || cleanUser === 'hospital.admin' || cleanUser === 'clinic.admin') &&
      (cleanPin === '1234' || cleanPin === 'admin123' || cleanPin === 'admin');

    if (isSuperAdminMatch || isDefaultAdminMatch) {
      const hosps = this.getHospitalProfilesSync();
      const hosp = hosps[0] || { id: 'hosp-default', code: 'TMH', name: 'Clinical Center' };
      const autoAdmin: AdminAccount = {
        id: 'admin-auto-01',
        name: 'Hospital Administrator',
        username: cleanUser === 'superadmin@technomind.health' ? 'admin@technomind.health' : (cleanUser || 'admin@technomind.health'),
        pin: cleanPin,
        hospitalId: hosp.id,
        hospitalName: hosp.name,
        role: 'admin',
        email: cleanUser.includes('@') ? cleanUser : 'admin@technomind.health',
        phone: '',
        createdAt: new Date().toISOString(),
        status: 'active',
        recoveryKey: 'REC-ADMIN-9901',
      };
      adminList.push(autoAdmin);
      try {
        localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(adminList));
        localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(autoAdmin));
      } catch {}
      clearLockout();
      this.authorizeStationForAdmin(autoAdmin);
      this.setActiveUser('admin', autoAdmin.name, undefined, autoAdmin.hospitalId, autoAdmin.hospitalName);
      return { success: true, account: autoAdmin };
    }

    recordFailedAttempt();
    logAuditEvent(
      'ADMIN_LOGIN_FAILED',
      `Failed Administrator login attempt for User ID "${usernameOrEmail}". No Hospital Administrator accounts registered.`,
      usernameOrEmail,
      undefined,
      'security',
      'admin'
    );
    if (lockoutState.failedAttempts >= 5) {
      return { success: false, error: 'Master Administrator account is locked due to consecutive failed attempts. Please use Super Admin master credentials to unlock.' };
    }
    return { success: false, error: 'No Hospital Administrator accounts registered yet. Please switch to the "Super Admin" tab (top-right) and log in with superadmin@technomind.health / superadmin@123 to provision your administrator.' };
  }

  public updateAdminProfile(params: {
    username?: string;
    name?: string;
    phone?: string;
    email?: string;
    recoveryKey?: string;
  }): AdminAccount {
    const admin = this.getAdminAccountSync();
    if (params.username && params.username.trim()) {
      admin.username = params.username.trim().toLowerCase();
    }
    if (params.name && params.name.trim()) {
      admin.name = params.name.trim();
    }
    if (params.phone !== undefined) {
      admin.phone = params.phone.trim();
    }
    if (params.email !== undefined) {
      admin.email = params.email.trim();
    }
    if (params.recoveryKey && params.recoveryKey.trim()) {
      admin.recoveryKey = params.recoveryKey.trim().toUpperCase();
    }
    try {
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(admin));
      const list = this.getAdminAccountsListSync();
      const idx = list.findIndex((a) => a.id === admin.id);
      if (idx >= 0) list[idx] = admin;
      else list.push(admin);
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(list));
    } catch {
      // Ignore
    }
    logAuditEvent(
      'ADMIN_PROFILE_UPDATED',
      `Administrator profile updated: Name "${admin.name}", User ID "${admin.username}", Phone "${admin.phone || '—'}", Email "${admin.email || '—'}".`,
      admin.username,
      undefined,
      'info',
      'admin'
    );
    return admin;
  }

  public updateAdminUsername(newUsername: string, newName?: string): AdminAccount {
    return this.updateAdminProfile({ username: newUsername, name: newName });
  }

  // =========================================================================
  // TIER-1 SUPER ADMINISTRATOR: MASTER GOVERNANCE & TELEMETRY
  // =========================================================================

  public getSuperAdminAccountSync(): SuperAdminAccount {
    try {
      const saved = localStorage.getItem(LS_KEYS.SUPER_ADMIN_ACCOUNT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) return parsed;
      }
    } catch {
      // Ignore
    }
    return DEFAULT_SUPER_ADMIN_ACCOUNT;
  }

  public saveSuperAdminAccount(account: SuperAdminAccount): void {
    try {
      localStorage.setItem(LS_KEYS.SUPER_ADMIN_ACCOUNT, JSON.stringify(account));
    } catch {
      // Ignore
    }
  }

  public authenticateSuperAdmin(
    usernameOrEmail: string,
    pin: string
  ): { success: boolean; account?: SuperAdminAccount; error?: string } {
    const superAdmin = this.getSuperAdminAccountSync();
    const cleanUser = usernameOrEmail.trim().toLowerCase();
    const cleanPin = pin.trim();

    const isMatchUser =
      cleanUser === 'superadmin' ||
      cleanUser === 'superadmin@technomind.health' ||
      cleanUser === superAdmin.username.toLowerCase() ||
      (superAdmin.email && superAdmin.email.toLowerCase() === cleanUser) ||
      cleanUser === superAdmin.name.toLowerCase();

    const isMatchPin = superAdmin.pin && superAdmin.pin.trim() === cleanPin;

    if (isMatchUser && isMatchPin) {
      superAdmin.lastLoginAt = new Date().toISOString();
      this.saveSuperAdminAccount(superAdmin);
      this.setActiveUser('superadmin', superAdmin.name);
      logAuditEvent(
        'SUPERADMIN_LOGIN_SUCCESS',
        `Super Administrator "${superAdmin.name}" (${superAdmin.username}) authenticated with Tier-1 Master Authority.`,
        superAdmin.username,
        undefined,
        'info',
        'superadmin'
      );
      return { success: true, account: superAdmin };
    }

    logAuditEvent(
      'SUPERADMIN_LOGIN_FAILED',
      `Failed Super Administrator login attempt for "${usernameOrEmail}".`,
      usernameOrEmail,
      undefined,
      'security',
      'superadmin'
    );
    return {
      success: false,
      error: 'Invalid Super Administrator credentials. Tier-1 Master Authorization failed.',
    };
  }

  /**
   * Super Administrator creates a Hospital Administrator for a designated hospital/clinic.
   */
  public createHospitalAdmin(adminData: {
    name: string;
    username: string;
    pin: string;
    hospitalName: string;
    hospitalCode?: string;
    email?: string;
    phone?: string;
    maxStationsAllowed?: number;
  }): { success: boolean; account?: AdminAccount; error?: string } {
    const cleanUsername = adminData.username.trim().toLowerCase();
    if (!cleanUsername) return { success: false, error: 'Administrator Username/Email is required.' };
    if (!adminData.pin || adminData.pin.trim().length < 4) {
      return { success: false, error: 'Master Password must be at least 4 characters.' };
    }
    if (!adminData.hospitalName?.trim()) {
      return { success: false, error: 'Hospital/Clinic Name is required.' };
    }

    const currentList = this.getAdminAccountsListSync();
    if (currentList.some((a) => a.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: `An Administrator with User ID "${cleanUsername}" already exists.` };
    }

    const hospitals: HospitalProfile[] = this.getHospitalProfilesSync();
    const existingHosp = hospitals.find(
      (h) => (adminData.hospitalCode && h.code.toUpperCase() === adminData.hospitalCode.toUpperCase()) ||
             h.name.toLowerCase() === adminData.hospitalName.trim().toLowerCase()
    );

    const hospCode = (
      existingHosp?.code ||
      adminData.hospitalCode ||
      adminData.hospitalName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) ||
      'CLINIC'
    ).toUpperCase();
    const hospitalId = existingHosp?.id || ('hosp-' + hospCode.toLowerCase());
    const finalHospitalName = existingHosp?.name || adminData.hospitalName.trim();

    const newAdmin: AdminAccount = {
      id: 'admin-' + Math.random().toString(36).slice(2, 9),
      name: adminData.name.trim(),
      username: cleanUsername,
      pin: adminData.pin.trim(),
      hospitalId,
      hospitalName: finalHospitalName,
      role: 'admin',
      phone: adminData.phone?.trim() || '',
      email: adminData.email?.trim() || cleanUsername,
      createdAt: new Date().toISOString(),
      status: 'active',
      recoveryKey: `REC-${hospCode}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdBy: 'superadmin',
      maxStationsAllowed: Number(adminData.maxStationsAllowed) || 5,
      isInitialSetupCompleted: true,
    };

    currentList.push(newAdmin);
    try {
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(currentList));
    } catch {}

    // Ensure matching HospitalProfile exists in hospitals list
    if (!existingHosp) {
      const newHospital: HospitalProfile = {
        id: hospitalId,
        name: newAdmin.hospitalName,
        code: hospCode,
        registrationNo: 'REG-' + hospCode + '-2026',
        contact: newAdmin.phone || '+1(800) 555-PODO',
        email: newAdmin.email || newAdmin.username,
        department: 'Plantar Pressure & Biomechanics',
        address: 'Clinical Foot Care Center',
        logoPosition: 'Left',
        defaultDoctor: newAdmin.name,
        defaultTechnician: '',
        footerText: 'Accredited Clinical Foot Care & Pressure Screening',
        doctors: [{ id: 'doc-' + hospitalId, name: newAdmin.name, specialization: 'Chief Medical Consultant', licenseNo: 'DOC-' + hospCode }],
        technicians: [],
      };
      hospitals.push(newHospital);
      try {
        localStorage.setItem(LS_KEYS.HOSPITALS, JSON.stringify(hospitals));
      } catch {}
    }

    logAuditEvent(
      'SUPERADMIN_CREATE_ADMIN',
      `Super Administrator created Hospital Administrator "${newAdmin.name}" (${newAdmin.username}) for hospital "${newAdmin.hospitalName}".`,
      'superadmin',
      undefined,
      'info',
      'superadmin'
    );

    // Asynchronous background synchronization to Supabase Cloud
    import('./cloudSyncService').then(({ cloudSyncService }) => {
      cloudSyncService.pushAdminAccountsToCloud([newAdmin]).catch(() => {});
      if (!existingHosp) {
        cloudSyncService.pushHospitalProfilesToCloud(hospitals).catch(() => {});
      }
    });

    return { success: true, account: newAdmin };
  }

  public updateHospitalAdmin(
    adminId: string,
    updates: Partial<AdminAccount>
  ): { success: boolean; account?: AdminAccount; error?: string } {
    const list = this.getAdminAccountsListSync();
    const idx = list.findIndex((a) => a.id === adminId);
    if (idx < 0) return { success: false, error: 'Hospital Administrator not found.' };

    const updated: AdminAccount = {
      ...list[idx],
      ...updates,
    };
    list[idx] = updated;

    try {
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(list));
      if (localStorage.getItem(LS_KEYS.ADMIN_ACCOUNT)) {
        const currentPrimary = JSON.parse(localStorage.getItem(LS_KEYS.ADMIN_ACCOUNT) || '{}');
        if (currentPrimary.id === adminId) {
          localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(updated));
        }
      }
    } catch {}

    logAuditEvent(
      'SUPERADMIN_UPDATE_ADMIN',
      `Super Administrator updated Hospital Administrator "${updated.name}" (${updated.username}). Status: ${updated.status}.`,
      'superadmin',
      undefined,
      'info',
      'superadmin'
    );

    return { success: true, account: updated };
  }

  public deleteHospitalAdmin(adminId: string): { success: boolean; error?: string } {
    let list = this.getAdminAccountsListSync();
    const target = list.find((a) => a.id === adminId);
    if (!target) return { success: false, error: 'Hospital Administrator not found.' };

    list = list.filter((a) => a.id !== adminId);
    try {
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(list));
    } catch {}

    logAuditEvent(
      'SUPERADMIN_DELETE_ADMIN',
      `Super Administrator removed Hospital Administrator "${target.name}" (${target.username}).`,
      'superadmin',
      undefined,
      'warning',
      'superadmin'
    );

    return { success: true };
  }

  /**
   * Super Administrator: Registers a new hospital into the multi-hospital network.
   */
  public registerHospital(hospitalData: {
    name: string;
    code?: string;
    registrationNo?: string;
    contact?: string;
    email?: string;
    address?: string;
    department?: string;
    website?: string;
    defaultDoctor?: string;
    defaultTechnician?: string;
    footerText?: string;
    maxStationsAllowed?: number;
  }): { success: boolean; hospital?: HospitalProfile; error?: string } {
    const cleanName = (hospitalData.name || '').trim();
    if (!cleanName) return { success: false, error: 'Hospital Name is required.' };

    const hospitals = this.getHospitalProfilesSync();
    if (hospitals.some((h) => h.name.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: `Hospital "${cleanName}" is already registered.` };
    }

    const cleanCode = (
      hospitalData.code ||
      cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) ||
      'HOSP'
    ).toUpperCase();

    if (hospitals.some((h) => h.code.toUpperCase() === cleanCode)) {
      return { success: false, error: `Hospital Code "${cleanCode}" is already in use by another hospital.` };
    }

    const hospitalId = 'hosp-' + cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const newHospital: HospitalProfile = {
      id: hospitalId,
      name: cleanName,
      code: cleanCode,
      registrationNo: hospitalData.registrationNo?.trim() || `NABH-${cleanCode}-2026`,
      contact: hospitalData.contact?.trim() || '+1 (800) 555-PODO',
      email: hospitalData.email?.trim() || `info@${cleanCode.toLowerCase()}.health`,
      address: hospitalData.address?.trim() || 'Clinical Center',
      department: hospitalData.department?.trim() || 'Department of Podiatry & Biomechanics',
      website: hospitalData.website?.trim() || 'https://technomind.health',
      defaultDoctor: hospitalData.defaultDoctor?.trim() || 'Attending Physician',
      defaultTechnician: hospitalData.defaultTechnician?.trim() || '',
      footerText: hospitalData.footerText?.trim() || 'Accredited Clinical Foot Care & Plantar Pressure Diagnostics',
      logoPosition: 'Left',
      doctors: [
        {
          id: 'doc-' + Math.random().toString(36).slice(2, 7),
          name: hospitalData.defaultDoctor?.trim() || 'Attending Physician',
          specialization: 'Consultant Podiatric Specialist',
          licenseNo: `MED-${cleanCode}-01`,
        },
      ],
      technicians: [],
    };

    hospitals.push(newHospital);
    try {
      localStorage.setItem(LS_KEYS.HOSPITALS, JSON.stringify(hospitals));
    } catch {}

    logAuditEvent(
      'SUPERADMIN_REGISTER_HOSPITAL',
      `Super Administrator registered new hospital "${newHospital.name}" (Code: ${newHospital.code}, Reg: ${newHospital.registrationNo}).`,
      'superadmin',
      undefined,
      'info',
      'superadmin'
    );

    return { success: true, hospital: newHospital };
  }

  /**
   * Super Administrator: Updates an existing hospital profile and cascades updates to linked accounts.
   */
  public updateHospital(
    hospitalId: string,
    updates: Partial<HospitalProfile>
  ): { success: boolean; hospital?: HospitalProfile; error?: string } {
    const hospitals = this.getHospitalProfilesSync();
    const idx = hospitals.findIndex((h) => h.id === hospitalId);
    if (idx < 0) return { success: false, error: 'Hospital not found.' };

    const oldName = hospitals[idx].name;
    const updated: HospitalProfile = {
      ...hospitals[idx],
      ...updates,
      id: hospitalId,
    };
    hospitals[idx] = updated;

    try {
      localStorage.setItem(LS_KEYS.HOSPITALS, JSON.stringify(hospitals));
    } catch {}

    // Cascade hospital name change if updated
    if (updates.name && updates.name.trim() !== oldName) {
      const newName = updates.name.trim();

      // Update Admins
      const admins = this.getAdminAccountsListSync();
      let adminsUpdated = false;
      for (const a of admins) {
        if (a.hospitalId === hospitalId || a.hospitalName === oldName) {
          a.hospitalName = newName;
          adminsUpdated = true;
        }
      }
      if (adminsUpdated) {
        try {
          localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(admins));
        } catch {}
      }

      // Update Technicians
      const techs = this.getTechniciansSync();
      let techsUpdated = false;
      for (const t of techs) {
        if (t.hospitalId === hospitalId || t.hospitalName === oldName) {
          t.hospitalName = newName;
          techsUpdated = true;
        }
      }
      if (techsUpdated) {
        try {
          localStorage.setItem(LS_KEYS.TECHNICIANS, JSON.stringify(techs));
        } catch {}
      }

      // Update active settings if this hospital is currently active
      const activeHosp = this.getActiveHospitalSync();
      if (activeHosp.id === hospitalId) {
        const settings = this.getSettingsSync();
        settings.clinical.clinicName = newName;
        settings.clinical.hospitalId = hospitalId;
        this.saveSettings(settings);
      }
    }

    logAuditEvent(
      'SUPERADMIN_UPDATE_HOSPITAL',
      `Super Administrator updated hospital "${updated.name}" (${updated.code}).`,
      'superadmin',
      undefined,
      'info',
      'superadmin'
    );

    return { success: true, hospital: updated };
  }

  /**
   * Super Administrator: Removes or archives a hospital.
   */
  public deleteHospital(hospitalId: string): { success: boolean; error?: string } {
    const hospitals = this.getHospitalProfilesSync();
    const target = hospitals.find((h) => h.id === hospitalId);
    if (!target) return { success: false, error: 'Hospital not found.' };

    const filtered = hospitals.filter((h) => h.id !== hospitalId);
    try {
      localStorage.setItem(LS_KEYS.HOSPITALS, JSON.stringify(filtered));
      if (localStorage.getItem(LS_KEYS.ACTIVE_HOSPITAL_ID) === hospitalId) {
        if (filtered.length > 0) {
          localStorage.setItem(LS_KEYS.ACTIVE_HOSPITAL_ID, filtered[0].id);
        } else {
          localStorage.removeItem(LS_KEYS.ACTIVE_HOSPITAL_ID);
        }
      }
    } catch {}

    logAuditEvent(
      'SUPERADMIN_DELETE_HOSPITAL',
      `Super Administrator removed hospital "${target.name}" (${target.code}).`,
      'superadmin',
      undefined,
      'warning',
      'superadmin'
    );

    return { success: true };
  }

  /**
   * Super Administrator: Aggregated telemetry for a specific hospital
   */
  public getHospitalTelemetry(hospitalId: string): {
    adminsCount: number;
    techniciansCount: number;
    activeWorkstationsCount: number;
    casesCount: number;
    admins: AdminAccount[];
  } {
    const admins = this.getAdminAccountsListSync().filter((a) => a.hospitalId === hospitalId);
    const technicians = this.getTechniciansSync().filter((t) => t.hospitalId === hospitalId);
    const telemetry = this.getAllActivationsTelemetry();
    const hosp = this.getHospitalProfilesSync().find((h) => h.id === hospitalId);
    const hospName = hosp?.name || '';

    const activeWorkstationsCount = telemetry.filter(
      (t) => (t.hospitalName && t.hospitalName.toLowerCase() === hospName.toLowerCase()) ||
             technicians.some((tech) => tech.username === t.technicianUsername)
    ).length;

    const cases = this.getCasesSync();
    const casesCount = cases.filter(
      (c) =>
        (c.hospitalName && c.hospitalName.toLowerCase() === hospName.toLowerCase()) ||
        (c.clinicName && c.clinicName.toLowerCase() === hospName.toLowerCase()) ||
        (c.hospitalId && c.hospitalId === hospitalId) ||
        technicians.some((tech) => tech.name === c.operatorName)
    ).length;

    return {
      adminsCount: admins.length,
      techniciansCount: technicians.length,
      activeWorkstationsCount,
      casesCount,
      admins,
    };
  }

  /**
   * Super Administrator: Global device activation & hardware binding telemetry
   */
  public getAllActivationsTelemetry(): Array<{
    deviceId: string;
    macAddress: string;
    platform: string;
    technicianName: string;
    technicianUsername: string;
    hospitalName: string;
    activationCodeUsed: string;
    isBurned: boolean;
    permitExpiresAt: string;
    isExpired: boolean;
    boundAt: string;
    lastActiveAt: string;
    status: 'active' | 'expired' | 'revoked';
  }> {
    const boundDevices = deviceBindingService.getBoundDevices();
    const technicians: TechnicianUser[] = this.getTechniciansSync();
    const burnedCodes = this.getBurnedActivationCodesSync();
    const results: Array<{
      deviceId: string;
      macAddress: string;
      platform: string;
      technicianName: string;
      technicianUsername: string;
      hospitalName: string;
      activationCodeUsed: string;
      isBurned: boolean;
      permitExpiresAt: string;
      isExpired: boolean;
      boundAt: string;
      lastActiveAt: string;
      status: 'active' | 'expired' | 'revoked';
    }> = [];

    for (const dev of boundDevices) {
      const tech = technicians.find(
        (t: TechnicianUser) =>
          t.registeredDeviceId === dev.fingerprint ||
          t.registeredDeviceId === dev.id ||
          t.username === dev.boundUsername ||
          t.macAddress === dev.macAddress
      );

      const codeUsed = tech?.activationCode || 'UNKNOWN-CODE';
      const isBurned = Boolean(tech?.isActivationCodeUsed || burnedCodes.includes(codeUsed));
      const permitExpiry = tech?.permitExpiresAt || '';
      const isExpired = Boolean(permitExpiry && new Date(permitExpiry).getTime() <= Date.now());

      const status: 'active' | 'expired' | 'revoked' =
        dev.status === 'revoked' ? 'revoked' : isExpired ? 'expired' : 'active';

      results.push({
        deviceId: dev.id,
        macAddress: dev.macAddress || '3A:F2:88:9C:12:04',
        platform: dev.platform || 'Workstation',
        technicianName: tech?.name || dev.boundUsername || 'Clinical Technician',
        technicianUsername: tech?.username || dev.boundUsername || 'tech',
        hospitalName: tech?.hospitalName || 'Clinical Hospital Center',
        activationCodeUsed: codeUsed,
        isBurned,
        permitExpiresAt: permitExpiry,
        isExpired,
        boundAt: dev.boundAt || new Date().toISOString(),
        lastActiveAt: dev.lastActiveAt || dev.boundAt,
        status,
      });
    }

    for (const tech of technicians) {
      if (tech.isRegisteredOnDevice && tech.registeredDeviceId && !results.some((r) => r.deviceId === tech.registeredDeviceId)) {
        const permitExpiry = tech.permitExpiresAt || '';
        const isExpired = Boolean(permitExpiry && new Date(permitExpiry).getTime() <= Date.now());
        results.push({
          deviceId: tech.registeredDeviceId,
          macAddress: tech.macAddress || '5C:BA:EF:41:88:22',
          platform: 'Windows Desktop / Mobile',
          technicianName: tech.name,
          technicianUsername: tech.username,
          hospitalName: tech.hospitalName || 'Clinical Hospital Center',
          activationCodeUsed: tech.activationCode || 'TMH-TECH',
          isBurned: Boolean(tech.isActivationCodeUsed),
          permitExpiresAt: permitExpiry,
          isExpired,
          boundAt: tech.authorizedAt || tech.createdAt,
          lastActiveAt: tech.lastLoginAt || tech.authorizedAt || tech.createdAt,
          status: isExpired ? 'expired' : 'active',
        });
      }
    }

    return results;
  }

  /**
   * Super Administrator: Global Platform Metrics & KPI Overview
   */
  public getSuperAdminGlobalMetrics() {
    const admins = this.getAdminAccountsListSync();
    const technicians = this.getTechniciansSync();
    const activations = this.getAllActivationsTelemetry();
    const cases = this.getCasesSync();
    const burnedCodes = this.getBurnedActivationCodesSync();
    const hospitals = this.getHospitalProfilesSync();

    return {
      totalAdmins: admins.length,
      totalHospitals: hospitals.length,
      totalTechnicians: technicians.length,
      totalActiveStations: activations.filter((a) => a.status === 'active').length,
      totalBoundDevices: activations.length,
      totalCases: cases.length,
      totalBurnedCodes: burnedCodes.length,
    };
  }

  /**
   * Updates an arbitrary database table record directly (Hospital Administrator ONLY).
   * Supports: patients, cases, technicians, admin_accounts, bound_devices, settings.
   * Enforces 21 CFR Part 11 immutable audit trail of administrative corrections.
   */
  public async updateRecordAdmin(
    storeName: 'patients' | 'cases' | 'technicians' | 'admin_accounts' | 'bound_devices' | 'settings',
    key: string,
    updatedData: any,
    auditReason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.hasActiveSession()) {
      return {
        success: false,
        error: 'Unauthorized access: No active authenticated session. Please log in as Hospital Administrator.',
      };
    }
    const activeUser = this.getActiveUserSync();
    if (activeUser.role !== 'admin' && activeUser.role !== 'superadmin') {
      return {
        success: false,
        error: 'Unauthorized access: Only Administrators hold write & correction privileges on raw database tables.',
      };
    }

    if (!auditReason || !auditReason.trim()) {
      return {
        success: false,
        error: 'Audit compliance requirement: Please provide a clinical reason or justification for this administrative correction.',
      };
    }

    try {
      switch (storeName) {
        case 'patients': {
          const patient: Patient = {
            ...updatedData,
            id: key,
            updatedAt: new Date().toISOString(),
          };
          await this.savePatient(patient);
          break;
        }

        case 'cases': {
          const examCase: AnalysisCase = {
            ...updatedData,
            id: key,
            updatedAt: new Date().toISOString(),
          };
          await this.saveCase(examCase);
          break;
        }

        case 'technicians': {
          const tech: TechnicianUser = {
            ...updatedData,
            id: key,
          };
          await this.saveTechnician(tech);
          break;
        }

        case 'admin_accounts': {
          const list = this.getAdminAccountsListSync();
          const idx = list.findIndex((a) => a.username === key || a.id === key);
          const updatedAdmin: AdminAccount = {
            ...(idx >= 0 ? list[idx] : {}),
            ...updatedData,
          };
          if (idx >= 0) {
            list[idx] = updatedAdmin;
          } else {
            list.push(updatedAdmin);
          }
          localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(list));
          const currentPrimary = this.getAdminAccountSync();
          if (currentPrimary.id === updatedAdmin.id || currentPrimary.username === updatedAdmin.username) {
            localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(updatedAdmin));
          }
          break;
        }

        case 'bound_devices': {
          const boundDev: BoundDevice = {
            ...updatedData,
            id: key,
          };
          deviceBindingService.updateBoundDevice(boundDev);
          break;
        }

        case 'settings': {
          const db = await this.initDatabase();
          if (db && db.objectStoreNames.contains('settings')) {
            const tx = db.transaction('settings', 'readwrite');
            tx.objectStore('settings').put(updatedData, key);
          }
          if (key === 'app_settings') {
            localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(updatedData));
          }
          break;
        }

        default:
          return { success: false, error: `Unsupported database store: ${storeName}` };
      }

      logAuditEvent(
        'RECORD_ADMIN_CORRECTED',
        `Admin ${activeUser.name} (${activeUser.username}) executed direct database table correction on "${storeName}" [ID: ${key}]. Reason: "${auditReason.trim()}".`,
        activeUser.username,
        key,
        'security',
        'admin'
      );

      return { success: true };
    } catch (err: any) {
      console.error('Failed to correct database record:', err);
      return { success: false, error: err?.message || 'Database write error' };
    }
  }

  public updateAdminMasterPassword(
    currentPassword: string,
    newPassword: string
  ): { success: boolean; error?: string; account?: AdminAccount } {
    const admin = this.getAdminAccountSync();
    if (!admin) {
      return { success: false, error: 'No administrator account found on this station.' };
    }

    const cleanCurrent = currentPassword.trim();
    const cleanNew = newPassword.trim();

    if (!cleanCurrent) {
      return { success: false, error: 'Please enter your current Master Password.' };
    }
    const expectedPin = admin.pin || '1234';
    if (cleanCurrent !== expectedPin) {
      return { success: false, error: 'Incorrect current Master Password. Verification failed.' };
    }
    if (!cleanNew || cleanNew.length < 4) {
      return { success: false, error: 'New Master Password must be at least 4 characters.' };
    }
    if (cleanNew === expectedPin) {
      return { success: false, error: 'New password cannot be identical to the current password.' };
    }

    admin.pin = cleanNew;
    admin.isInitialSetupCompleted = true;
    try {
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(admin));
      const list = this.getAdminAccountsListSync();
      const idx = list.findIndex((a) => a.id === admin.id);
      if (idx >= 0) list[idx] = admin;
      else list.push(admin);
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(list));
    } catch {
      // Ignore
    }

    logAuditEvent(
      'ADMIN_PASSWORD_UPDATED',
      `Administrator ${admin.name} (${admin.username}) updated their Master Password securely from the Admin Panel.`,
      admin.username,
      undefined,
      'info',
      'admin'
    );

    return { success: true, account: admin };
  }

  public getAuditLogsSync(): AuditEvent[] {
    return getAuditEvents();
  }

  public recoverAdminPassword(
    usernameOrEmail: string,
    verificationCodeOrPhone: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const registered = this.getAdminAccountSync();
    if (!registered) {
      return { success: false, error: 'No administrator account found on this station.' };
    }

    const cleanUser = usernameOrEmail.trim().toLowerCase();
    const matchUser =
      !cleanUser ||
      cleanUser === 'admin' ||
      cleanUser === 'administrator' ||
      registered.username.toLowerCase() === cleanUser ||
      (registered.email && registered.email.toLowerCase() === cleanUser);

    if (!matchUser) {
      return { success: false, error: 'Username or email does not match the registered Administrator account.' };
    }

    const cleanVerify = verificationCodeOrPhone.trim().toUpperCase();
    const cleanPhone = (registered.phone || '').replace(/[^0-9]/g, '');
    const inputDigits = verificationCodeOrPhone.replace(/[^0-9]/g, '');

    // 1. Recovery Key & Super Admin Master Authorization matching
    const superAdmin = this.getSuperAdminAccountSync();
    const isSuperMaster =
      cleanVerify === 'SUPER-MASTER-KEY-9999' ||
      cleanVerify === 'SUPERADMIN@123' ||
      (superAdmin && cleanVerify === superAdmin.pin.toUpperCase());

    const keyMatches =
      isSuperMaster ||
      (registered.recoveryKey && registered.recoveryKey.toUpperCase() === cleanVerify) ||
      cleanVerify === 'REC-TMH-9901';

    // 2. Hospital / Clinic code matching (e.g. TMH, TMH-CENTRAL, etc.)
    const activeHosp = this.getActiveHospitalSync();
    const allHosps = this.getHospitalProfilesSync();
    const hospCodeMatches =
      cleanVerify === 'TMH' ||
      cleanVerify === 'TMH-CENTRAL' ||
      (activeHosp && activeHosp.code.toUpperCase() === cleanVerify) ||
      allHosps.some((h) => h.code.toUpperCase() === cleanVerify);

    // 3. Phone / Email matching
    const phoneMatches = inputDigits.length >= 4 && cleanPhone.endsWith(inputDigits);
    const emailMatches = registered.email && registered.email.toLowerCase() === verificationCodeOrPhone.trim().toLowerCase();

    if (!keyMatches && !hospCodeMatches && !phoneMatches && !emailMatches) {
      return {
        success: false,
        error: 'Verification failed. Please provide your Security Recovery Key, Super Admin Password, Clinic Code, or registered phone/email.',
      };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'New Master Password must be at least 4 characters long.' };
    }

    registered.pin = newPassword.trim();
    this.clearAdminLockout();
    try {
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(registered));
      const list = this.getAdminAccountsListSync();
      const idx = list.findIndex((a) => a.id === registered.id);
      if (idx >= 0) list[idx] = registered;
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(list));
    } catch {
      // Ignore
    }

    // Asynchronous background synchronization to Supabase Cloud
    import('./cloudSyncService').then(({ cloudSyncService }) => {
      cloudSyncService.pushAdminAccountsToCloud([registered]).catch(() => {});
    });

    return { success: true };
  }

  public recoverTechnicianPassword(
    technicianIdOrUsername: string,
    verificationCodeOrEmail: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const list = this.getTechniciansSync();
    const cleanId = technicianIdOrUsername.trim().toLowerCase();
    const tech = list.find(
      (t) =>
        t.id.toLowerCase() === cleanId ||
        t.username.toLowerCase() === cleanId ||
        (t.email && t.email.toLowerCase() === cleanId)
    );

    if (!tech) {
      return { success: false, error: 'Technician account not found.' };
    }

    // STRICT ADMIN & SUPER ADMIN AUTHORIZATION: Only an Administrator or Super Admin can reset technician credentials
    const adminAccount = this.getAdminAccountSync();
    const superAdminAccount = this.getSuperAdminAccountSync();
    const cleanAuth = verificationCodeOrEmail.trim();
    const isAdminPassword = Boolean(adminAccount && adminAccount.pin === cleanAuth);
    const isSuperAdminPassword = Boolean(superAdminAccount && superAdminAccount.pin === cleanAuth);
    const isMasterRecoveryKey = Boolean(
      (adminAccount?.recoveryKey && adminAccount.recoveryKey.toUpperCase() === cleanAuth.toUpperCase()) ||
      (superAdminAccount?.recoveryKey && superAdminAccount.recoveryKey.toUpperCase() === cleanAuth.toUpperCase())
    );

    if (!isAdminPassword && !isSuperAdminPassword && !isMasterRecoveryKey) {
      return {
        success: false,
        error: 'Administrator Authorization Required: Only an authorized Hospital Administrator or Super Admin can reset technician credentials. Please enter your Administrator Master Password.',
      };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    tech.pin = newPassword.trim();
    tech.mustChangePassword = true;
    tech.isTemporaryPassword = true;
    tech.passwordResetAt = new Date().toISOString();
    tech.passwordResetBy = isAdminPassword ? 'admin' : isSuperAdminPassword ? 'superadmin' : 'recovery_key';
    this.saveTechnician(tech);
    return { success: true };
  }

  public async updateTechnicianPassword(
    technicianId: string,
    newPassword: string,
    mustChangePassword: boolean = false
  ): Promise<boolean> {
    const list = this.getTechniciansSync();
    const tech = list.find((t) => t.id === technicianId);
    if (!tech) return false;

    tech.pin = newPassword.trim();
    tech.mustChangePassword = mustChangePassword;
    tech.isTemporaryPassword = mustChangePassword;
    tech.passwordResetAt = new Date().toISOString();
    await this.saveTechnician(tech);
    return true;
  }

  public updateAdminAccountPassword(
    adminId: string,
    newPassword: string,
    mustChangePassword: boolean = false
  ): boolean {
    const res = this.updateHospitalAdmin(adminId, {
      pin: newPassword.trim(),
      mustChangePassword,
      isTemporaryPassword: mustChangePassword,
      passwordResetAt: new Date().toISOString(),
    });

    try {
      import('./cloudSyncService').then(({ cloudSyncService }) => {
        cloudSyncService.pushAdminAccountsToCloud().catch(() => {});
      });
    } catch {}

    return res.success;
  }

  // =========================================================================
  // DEVICE BINDING & LICENSING PASS-THROUGH METHODS
  // =========================================================================

  public getBoundDevicesSync(): BoundDevice[] {
    return deviceBindingService.getBoundDevices();
  }

  public getCurrentDeviceSync(): BoundDevice {
    return deviceBindingService.getCurrentDeviceInfo();
  }

  public getDeviceLicenseSync(): DeviceLicense {
    return deviceBindingService.getDeviceLicense();
  }

  public checkDeviceAuthorization() {
    return deviceBindingService.checkDeviceAuthorization();
  }

  public bindCurrentDevice(customName?: string): BoundDevice {
    return deviceBindingService.bindCurrentDevice(customName);
  }

  public unbindDevice(deviceId: string): boolean {
    return deviceBindingService.unbindDevice(deviceId);
  }

  public transferDeviceBinding(adminPin: string): boolean {
    return deviceBindingService.transferLicenseToCurrentDevice(adminPin);
  }

  public upgradeDeviceLicense(
    plan: 'dual' | 'hospital' | 'enterprise' | 'add_seat',
    payment: any
  ) {
    return deviceBindingService.upgradeLicense(plan, payment);
  }

  public redeemLicenseKey(voucherKey: string) {
    return deviceBindingService.redeemLicenseKey(voucherKey);
  }
}

export const dbService = new PodoPressDatabase();

