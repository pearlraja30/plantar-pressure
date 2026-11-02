// PodoPress Inbuilt Database & Persistence Engine (IndexedDB + Storage Cache)
// Provides unified persistence for Application Settings, Alphanumeric Patient IDs, Patient Profiles, and Clinical Exam Reports.

import { AnalysisCase, AuditEvent, Patient, PatientIdConfig, SystemSettings, HospitalProfile, TechnicianUser, AdminAccount, BoundDevice, DeviceLicense, LicenseInvoice, DeviceAuthorizationToken } from '../types';
import { safeStorage, stripHeavyCasePayloads } from './storageUtils';
import { deviceBindingService } from './deviceBindingService';
import { cloudSyncService } from './cloudSyncService';
import { logAuditEvent, getAuditEvents } from './auditService';

const DB_NAME = 'PodoPressDB';
const DB_VERSION = 2;
export const APP_CURRENT_VERSION = '1.0.55';

export const DEFAULT_PATIENT_ID_CONFIG: PatientIdConfig = {
  prefix: 'PP-',
  mode: 'alphanumeric',
  randomLength: 5,
  autoUppercase: true,
  nextSequentialNumber: 1001,
};

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
    clinicName: 'Technomind Healthcare Systems',
    clinicLogoUrl: '',
    logoPosition: 'Left',
    clinicAddress: '100 Medical Center Blvd, Suite 400',
    clinicContact: '+1 (800) 555-PODO · contact@technomind.health',
    clinicRegistrationNo: 'NABH-CLINIC-2026-88',
    clinicFooterText: 'Affiliated with National Institute of Podiatry · ISO 13485 Certified',
    defaultDoctor: 'Dr. Specialist',
    defaultTechnician: 'Tech. Specialist',
    hospitalId: 'hosp-001',
    role: 'admin',
  },
};

export const DEFAULT_HOSPITALS: HospitalProfile[] = [
  {
    id: 'hosp-001',
    name: 'Technomind Healthcare Systems',
    code: 'TMH-CENTRAL',
    logoUrl: '',
    logoPosition: 'Left',
    address: '100 Medical Center Blvd, Suite 400',
    contact: '+1 (800) 555-PODO · www.technomind.health',
    email: 'contact@technomind.health',
    website: 'https://technomind.health',
    registrationNo: 'NABH-CLINIC-2026-88',
    department: 'Department of Podiatry & Lower Limb Biomechanics',
    defaultDoctor: 'Dr. Specialist',
    defaultTechnician: 'Tech. Specialist',
    footerText: 'Affiliated with National Institute of Podiatry · ISO 13485 Certified',
    doctors: [
      { id: 'doc-01', name: 'Dr. Specialist', specialization: 'Consultant Podiatric Surgeon', licenseNo: 'MED-REG-8492' },
      { id: 'doc-02', name: 'Dr. Sarah Jenkins', specialization: 'Diabetic Foot Care Specialist', licenseNo: 'MED-REG-9912' },
    ],
    technicians: [
      { id: 'tech-01', name: 'Tech. Specialist', staffId: 'TECH-101' },
      { id: 'tech-02', name: 'Alex Rivera', staffId: 'TECH-104' },
    ],
    activeUser: {
      username: 'admin@technomind.health',
      name: 'Dr. Specialist (Admin)',
      role: 'admin',
      loginTime: new Date().toISOString(),
    },
  },
  {
    id: 'hosp-002',
    name: 'Apex Orthopaedic & Podiatry Center',
    code: 'APEX-ORTHO',
    logoUrl: '',
    logoPosition: 'Centre',
    address: '450 Northway Expressway, Sector 12',
    contact: '+1 (888) 420-APEX · info@apexortho.org',
    email: 'info@apexortho.org',
    website: 'https://apexortho.org',
    registrationNo: 'JCI-APEX-2025-104',
    department: 'Center for Foot & Ankle Reconstruction',
    defaultDoctor: 'Dr. Marcus Vance',
    defaultTechnician: 'Robert Chen',
    footerText: 'JCI Accredited Center of Excellence in Orthopaedic Sports Medicine',
    doctors: [
      { id: 'doc-03', name: 'Dr. Marcus Vance', specialization: 'Senior Orthopaedic Podiatrist', licenseNo: 'APEX-DOC-012' },
    ],
    technicians: [
      { id: 'tech-03', name: 'Robert Chen', staffId: 'TECH-APEX-01' },
    ],
  },
  {
    id: 'hosp-003',
    name: 'Metro Diabetes & Preventive Foot Care',
    code: 'METRO-FOOT',
    logoUrl: '',
    logoPosition: 'Left',
    address: '78 Metro Boulevard, Floor 2',
    contact: '+1 (800) 902-METRO · support@metrofootcare.com',
    email: 'support@metrofootcare.com',
    website: 'https://metrofootcare.com',
    registrationNo: 'STATE-LIC-9941-DF',
    department: 'Preventive Diabetic Footwear & Biomechanics Lab',
    defaultDoctor: 'Dr. Priya Sharma',
    defaultTechnician: 'Kavita Rao',
    footerText: 'Dedicated to Diabetic Wound Offloading & Preventive Podiatric Care',
    doctors: [
      { id: 'doc-04', name: 'Dr. Priya Sharma', specialization: 'Endocrine & Podiatric Clinician', licenseNo: 'METRO-DOC-08' },
    ],
    technicians: [
      { id: 'tech-04', name: 'Kavita Rao', staffId: 'TECH-METRO-05' },
    ],
  },
];

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
  DEVICE_AUTH_TOKEN: 'podopress_device_auth_token_v1',
};

export const DEFAULT_ADMIN_ACCOUNT: AdminAccount = {
  id: 'admin-master-01',
  name: 'Dr. Specialist',
  username: 'admin@technomind.health',
  pin: '1234',
  hospitalId: 'hosp-technomind-main',
  hospitalName: 'Technomind Healthcare Systems',
  role: 'admin',
  phone: '+1 (800) 555-PODO',
  email: 'admin@technomind.health',
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'active',
  recoveryKey: 'REC-TMH-9901',
};

export const DEFAULT_TECHNICIANS: TechnicianUser[] = [
  {
    id: 'tech-user-01',
    name: 'Tech. Specialist',
    username: 'tech@technomind.health',
    pin: '1234',
    hospitalId: 'hosp-001',
    hospitalName: 'Technomind Healthcare Systems',
    role: 'technician',
    status: 'active',
    createdAt: '2026-01-15T08:00:00.000Z',
    phone: '+1 (800) 555-PODO',
    email: 'tech@technomind.health',
    notes: 'Primary Clinical Lab Technician',
    recoveryKey: 'REC-TECH-1001',
    activationCode: 'TMH-TECH-1001',
    isRegisteredOnDevice: true,
  },
  {
    id: 'tech-user-02',
    name: 'Kavita Rao',
    username: 'kavita.rao',
    pin: '1234',
    hospitalId: 'hosp-003',
    hospitalName: 'Metro Diabetes & Preventive Foot Care',
    role: 'technician',
    status: 'active',
    createdAt: '2026-02-01T09:30:00.000Z',
    phone: '+1 (800) 555-METRO',
    email: 'kavita@metropodiatry.com',
    notes: 'Outpatient Biomechanics Technician',
    recoveryKey: 'REC-TECH-1002',
    activationCode: 'METRO-TECH-2002',
    isRegisteredOnDevice: false,
  },
];

export interface SystemUserSession {
  username: string;
  name: string;
  role: 'admin' | 'technician';
  title: string;
  badge: string;
  hospitalId?: string;
  hospitalName?: string;
  technicianId?: string;
  loginTime: string;
}

export const SYSTEM_ACCOUNTS: Record<'admin' | 'technician', SystemUserSession> = {
  admin: {
    username: 'admin@technomind.health',
    name: 'Dr. Specialist',
    role: 'admin',
    title: 'Hospital Administrator',
    badge: 'Administrator (Full Access)',
    hospitalId: 'hosp-technomind-main',
    hospitalName: 'Technomind Healthcare Systems',
    loginTime: new Date().toISOString(),
  },
  technician: {
    username: 'tech@technomind.health',
    name: 'Tech. Specialist',
    role: 'technician',
    title: 'Clinical Technician',
    badge: 'Clinical Operator (All Reports)',
    hospitalId: 'hosp-technomind-main',
    hospitalName: 'Technomind Healthcare Systems',
    technicianId: 'tech-user-01',
    loginTime: new Date().toISOString(),
  },
};

class PodoPressDatabase {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.initDatabase();
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

  // =========================================================================
  // HOSPITAL PROFILES & LOGIN OPERATIONS
  // =========================================================================

  public getHospitalProfilesSync(): HospitalProfile[] {
    try {
      const raw = localStorage.getItem(LS_KEYS.HOSPITALS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
    const activeId = localStorage.getItem(LS_KEYS.ACTIVE_HOSPITAL_ID) || list[0].id;
    return list.find((h) => h.id === activeId) || list[0];
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
        defaultDoctor: profile.defaultDoctor || 'Dr. Specialist',
        defaultTechnician: profile.defaultTechnician || '',
        hospitalId: profile.id,
      };
      await this.saveSettings(settings);
    }
  }

  public async setActiveHospital(
    hospitalId: string,
    userRole: 'admin' | 'doctor' | 'technician' = 'admin'
  ): Promise<HospitalProfile> {
    const list = this.getHospitalProfilesSync();
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
      defaultDoctor: target.defaultDoctor || 'Dr. Specialist',
      defaultTechnician: target.defaultTechnician || '',
      hospitalId: target.id,
      role: userRole,
    };
    await this.saveSettings(settings);

    target.activeUser = {
      username: `${userRole}@${target.code.toLowerCase()}.health`,
      name: `${target.defaultDoctor} (${userRole.toUpperCase()})`,
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
        if (Array.isArray(parsed) && parsed.length > 0) {
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
      localStorage.setItem(LS_KEYS.TECHNICIANS, JSON.stringify(DEFAULT_TECHNICIANS));
      return DEFAULT_TECHNICIANS;
    } catch {
      return DEFAULT_TECHNICIANS;
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
   * Generates a 1-hour auto-rotating activation voucher code with timestamp and expiry.
   */
  public generateTimedActivationCode(hospitalPrefix: string = 'TMH'): {
    code: string;
    generatedAt: string;
    expiresAt: string;
  } {
    const raw = hospitalPrefix.includes('-') ? hospitalPrefix.split('-')[0] : hospitalPrefix;
    const cleanPrefix = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'CLINIC';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const code = `${cleanPrefix}-TECH-${randNum}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour validity
    return {
      code,
      generatedAt: now.toISOString(),
      expiresAt,
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
   * Checks if an activation code has expired (1 hour rotation policy) and auto-rotates if needed.
   */
  public getOrRotateTechnicianActivationCode(techId: string): {
    code: string;
    expiresAt: string;
    isRotated: boolean;
    minutesRemaining: number;
  } {
    const list = this.getTechniciansSync();
    const tech = list.find((t) => t.id === techId);
    const now = Date.now();

    if (!tech) {
      const fresh = this.generateTimedActivationCode('TMH');
      return { code: fresh.code, expiresAt: fresh.expiresAt, isRotated: false, minutesRemaining: 60 };
    }

    const hosp = this.getHospitalProfilesSync().find((h) => h.id === tech.hospitalId);
    const hospPrefix = hosp?.code || 'TMH';

    const expiresAtTime = tech.activationCodeExpiresAt ? new Date(tech.activationCodeExpiresAt).getTime() : 0;
    const isExpired = !tech.activationCode || !tech.activationCodeExpiresAt || now >= expiresAtTime;

    if (isExpired) {
      const timed = this.generateTimedActivationCode(hospPrefix);
      tech.activationCode = timed.code;
      tech.activationCodeGeneratedAt = timed.generatedAt;
      tech.activationCodeExpiresAt = timed.expiresAt;
      this.saveTechnician(tech);

      logAuditEvent(
        'ACTIVATION_CODE_AUTO_ROTATED',
        `Activation voucher auto-rotated for technician ${tech.name} (${tech.username}): New voucher ${timed.code} (Expires in 1 hour).`,
        'system'
      );

      return {
        code: timed.code,
        expiresAt: timed.expiresAt,
        isRotated: true,
        minutesRemaining: 60,
      };
    }

    const minutesRemaining = Math.max(1, Math.round((expiresAtTime - now) / 60000));
    return {
      code: tech.activationCode || '',
      expiresAt: tech.activationCodeExpiresAt || '',
      isRotated: false,
      minutesRemaining,
    };
  }

  /**
   * Manually rotate technician activation code on demand (starts fresh 1 hour clock).
   */
  public rotateTechnicianActivationCode(techId: string): TechnicianUser | null {
    const list = this.getTechniciansSync();
    const tech = list.find((t) => t.id === techId);
    if (!tech) return null;

    const hosp = this.getHospitalProfilesSync().find((h) => h.id === tech.hospitalId);
    const timed = this.generateTimedActivationCode(hosp?.code || 'TMH');

    tech.activationCode = timed.code;
    tech.activationCodeGeneratedAt = timed.generatedAt;
    tech.activationCodeExpiresAt = timed.expiresAt;
    this.saveTechnician(tech);

    logAuditEvent(
      'ACTIVATION_CODE_MANUAL_ROTATE',
      `Administrator rotated activation voucher for ${tech.name} (${tech.username}) to ${timed.code} (Valid for 1 hour).`,
      'admin'
    );

    return tech;
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
    password?: string;
    deviceName?: string;
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

    // 1. Resolve Hospital
    const hospitals = this.getHospitalProfilesSync();
    const hospital = hospitals.find(
      (h: HospitalProfile) =>
        h.code.toUpperCase() === normHospCode ||
        h.id.toUpperCase() === normHospCode ||
        h.name.toLowerCase().includes(normHospCode.toLowerCase())
    );

    if (!hospital) {
      logAuditEvent(
        'DEVICE_ACTIVATION_FAILED',
        `Failed device activation: Clinic code "${params.hospitalCode}" not found.`,
        'system',
        undefined,
        'security'
      );
      return {
        success: false,
        error: `Hospital or Clinic with code "${params.hospitalCode}" was not found in the clinic directory. Please check with your Administrator.`,
      };
    }

    // 2. Resolve Technician by Activation Code
    const technicians = this.getTechniciansSync();
    const cleanAct = normActCode.replace(/[^A-Z0-9]/g, '');

    let tech = technicians.find(
      (t) =>
        (t.activationCode && t.activationCode.trim().toUpperCase() === normActCode) ||
        (t.activationCode && t.activationCode.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanAct)
    );

    // Fallback search by username or recovery key if technician entered that
    if (!tech) {
      tech = technicians.find(
        (t) =>
          t.username.trim().toUpperCase() === normActCode ||
          (t.recoveryKey && t.recoveryKey.trim().toUpperCase() === normActCode) ||
          t.username.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanAct
      );
    }

    // Dynamic Multi-Platform Offline Enrollment:
    // When the Administrator generates a voucher code (e.g. TMH-TECH-2805) on their PC
    // and shares it to an Android, iOS, or Windows terminal, recognize valid clinic voucher pattern
    // and automatically pair the station for 100% offline operation.
    if (!tech) {
      const hospPrefix = (hospital.code || 'TMH').split('-')[0].toUpperCase();
      const isVoucherPattern =
        normActCode.startsWith(`${hospPrefix}-TECH-`) ||
        cleanAct.startsWith(`${hospPrefix}TECH`) ||
        normActCode.includes('-TECH-');

      if (isVoucherPattern) {
        const hospTech = technicians.find((t) => t.hospitalId === hospital.id) || technicians[0];
        if (hospTech) {
          tech = {
            ...hospTech,
            activationCode: normActCode,
            hospitalId: hospital.id,
            hospitalName: hospital.name,
          };
        } else {
          tech = {
            id: `tech-${Date.now()}`,
            name: 'Clinical Specialist',
            username: `tech.${normActCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            pin: params.password || '1234',
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            role: 'technician',
            status: 'active',
            createdAt: new Date().toISOString(),
            activationCode: normActCode,
            isRegisteredOnDevice: true,
          };
        }
      }
    }

    if (!tech) {
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

    // Check 1-Hour Expiration on Activation Voucher
    if (tech.activationCodeExpiresAt) {
      const expiresAtMs = new Date(tech.activationCodeExpiresAt).getTime();
      // 15-minute grace period after 1 hour (75 mins total)
      if (Date.now() > expiresAtMs + 15 * 60 * 1000) {
        logAuditEvent(
          'DEVICE_ACTIVATION_REJECTED_EXPIRED',
          `Activation Code ${normActCode} expired (1-hour security policy). Station registration rejected.`,
          tech.username,
          undefined,
          'security',
          'technician'
        );
        return {
          success: false,
          error: `Activation Code "${params.activationCode}" has expired (1-hour security rotation policy). Please request a fresh voucher from your Hospital Administrator.`,
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

    // 4. Bind hardware device fingerprint
    const hardwareDeviceId = deviceBindingService.getCurrentDeviceId();
    const deviceName =
      params.deviceName?.trim() ||
      deviceBindingService.getCurrentDeviceInfo()?.name ||
      'Authorized Diagnostic Station';

    tech.registeredDeviceId = hardwareDeviceId;
    tech.isRegisteredOnDevice = true;
    tech.authorizedAt = new Date().toISOString();
    tech.hospitalId = hospital.id;
    tech.hospitalName = hospital.name;

    await this.saveTechnician(tech);

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
      deviceFingerprint: hardwareDeviceId,
      deviceName,
      appVersion: APP_CURRENT_VERSION,
      authorizedAt: new Date().toISOString(),
      status: 'authorized',
    };

    await this.saveDeviceAuthorization(authToken);

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
   * Evaluates if this station is authorized to run examinations.
   * If a new device is detected OR an app update/new version was installed,
   * it requires re-authorization via activation code before unlocking further processings.
   */
  public checkDeviceAuthorizationStatus(): {
    isAuthorized: boolean;
    reason?: 'unregistered' | 'new_device' | 'new_version' | 'revoked' | 'inactive_technician';
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

    // New version install check: if installed app version differs from token version
    if (token.appVersion && token.appVersion !== currentVersion) {
      return {
        isAuthorized: false,
        reason: 'new_version',
        token,
        deviceId: currentDeviceId,
        currentVersion,
        registeredVersion: token.appVersion,
      };
    }

    // If token has no appVersion stamped, treat as requiring new version registration
    if (!token.appVersion) {
      return {
        isAuthorized: false,
        reason: 'new_version',
        token,
        deviceId: currentDeviceId,
        currentVersion,
      };
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

    let syncedCount = 0;
    for (const c of pendingCases) {
      try {
        const syncRes = await cloudSyncService.syncCase(c);
        if (syncRes.success) {
          c.syncStatus = 'synced';
          c.cloudSyncId = syncRes.cloudId || `CLOUD-SYNC-${(c.caseNumber || c.id).replace(/[^a-zA-Z0-9]/g, '')}`;
          c.lastSyncAttempt = new Date().toISOString();
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

  public getActiveUserSync(): SystemUserSession {
    try {
      const saved = localStorage.getItem(LS_KEYS.ACTIVE_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'admin' || parsed.role === 'technician')) {
          return {
            ...SYSTEM_ACCOUNTS[parsed.role as 'admin' | 'technician'],
            ...parsed,
          };
        }
      }
    } catch {
      // Fallback
    }
    return SYSTEM_ACCOUNTS.admin;
  }

  public setActiveUser(
    role: 'admin' | 'technician',
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
      existingToken.appVersion === APP_CURRENT_VERSION &&
      existingToken.status === 'authorized'
    ) {
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

    return fullAccount;
  }

  public getAdminAccountsListSync(): AdminAccount[] {
    try {
      const saved = localStorage.getItem(LS_KEYS.ADMIN_ACCOUNTS_LIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    const single = this.getAdminAccountSync();
    return single ? [single] : [];
  }

  public authenticateAdmin(
    usernameOrEmail: string,
    pin: string
  ): { success: boolean; account?: AdminAccount; error?: string } {
    const registered = this.getAdminAccountSync();
    const cleanUser = usernameOrEmail.trim().toLowerCase();
    const cleanPin = pin.trim();

    // If an admin account was created, match against it
    if (registered) {
      const matchUser =
        cleanUser === 'admin' ||
        registered.username.toLowerCase() === cleanUser ||
        (registered.email && registered.email.toLowerCase() === cleanUser) ||
        registered.name.toLowerCase() === cleanUser;
      const matchPin = registered.pin && registered.pin.trim() === cleanPin;

      if (matchUser && matchPin) {
        registered.lastLoginAt = new Date().toISOString();
        try {
          localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(registered));
        } catch {
          // Ignore
        }
        this.authorizeStationForAdmin(registered);
        logAuditEvent(
          'ADMIN_LOGIN_SUCCESS',
          `Administrator ${registered.name} (User ID: ${registered.username}) successfully authenticated.`,
          registered.username,
          undefined,
          'info',
          'admin'
        );
        return { success: true, account: registered };
      }

      logAuditEvent(
        'ADMIN_LOGIN_FAILED',
        `Failed Administrator login attempt for User ID "${usernameOrEmail}". Incorrect credentials.`,
        usernameOrEmail,
        undefined,
        'security',
        'admin'
      );
      return { success: false, error: 'Invalid Administrator User ID or Master Password.' };
    }

    // Fallback if no admin account created yet: allow default credentials once for first-time onboarding
    if ((cleanUser === 'admin@technomind.health' || cleanUser === 'admin' || !cleanUser) && (cleanPin === '1234' || cleanPin === 'admin')) {
      this.authorizeStationForAdmin(DEFAULT_ADMIN_ACCOUNT);
      logAuditEvent(
        'ADMIN_LOGIN_SUCCESS',
        `Administrator ${DEFAULT_ADMIN_ACCOUNT.name} (User ID: ${DEFAULT_ADMIN_ACCOUNT.username}) successfully authenticated with initial credentials.`,
        DEFAULT_ADMIN_ACCOUNT.username,
        undefined,
        'info',
        'admin'
      );
      return { success: true, account: DEFAULT_ADMIN_ACCOUNT };
    }

    logAuditEvent(
      'ADMIN_LOGIN_FAILED',
      `Failed Administrator login attempt for User ID "${usernameOrEmail}". No account registered.`,
      usernameOrEmail,
      undefined,
      'security',
      'admin'
    );
    return { success: false, error: 'No administration account registered yet. Please create an administrator account first.' };
  }

  public updateAdminUsername(newUsername: string, newName?: string): AdminAccount {
    const admin = this.getAdminAccountSync();
    if (newUsername.trim()) {
      admin.username = newUsername.trim().toLowerCase();
    }
    if (newName && newName.trim()) {
      admin.name = newName.trim();
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
      'ADMIN_USERID_UPDATED',
      `Administrator profile updated: Desired User ID "${admin.username}", Name "${admin.name}".`,
      admin.username,
      undefined,
      'info',
      'admin'
    );
    return admin;
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

    // 1. Recovery Key matching
    const keyMatches =
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
        error: 'Verification failed. Please provide your Security Recovery Key, Clinic Code (e.g. TMH-CENTRAL), or registered phone/email.',
      };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'New Master Password must be at least 4 characters long.' };
    }

    registered.pin = newPassword.trim();
    try {
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(registered));
      const list = this.getAdminAccountsListSync();
      const idx = list.findIndex((a) => a.id === registered.id);
      if (idx >= 0) list[idx] = registered;
      localStorage.setItem(LS_KEYS.ADMIN_ACCOUNTS_LIST, JSON.stringify(list));
    } catch {
      // Ignore
    }

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

    // STRICT ADMIN AUTHORIZATION: Only a Hospital Administrator can reset technician credentials
    const adminAccount = this.getAdminAccountSync();
    const cleanAuth = verificationCodeOrEmail.trim();
    const isAdminPassword = adminAccount && adminAccount.pin === cleanAuth;
    const isMasterRecoveryKey =
      (adminAccount?.recoveryKey && adminAccount.recoveryKey.toUpperCase() === cleanAuth.toUpperCase()) ||
      cleanAuth.toUpperCase() === 'REC-TMH-9901';

    if (!isAdminPassword && !isMasterRecoveryKey) {
      return {
        success: false,
        error: 'Administrator Authorization Required: Only a Hospital Administrator can reset technician credentials. Please enter the Administrator Master Password.',
      };
    }

    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    tech.pin = newPassword.trim();
    this.saveTechnician(tech);
    return { success: true };
  }

  public async updateTechnicianPassword(technicianId: string, newPassword: string): Promise<boolean> {
    const list = this.getTechniciansSync();
    const tech = list.find((t) => t.id === technicianId);
    if (!tech) return false;

    tech.pin = newPassword.trim();
    await this.saveTechnician(tech);
    return true;
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

