// PodoPress Inbuilt Database & Persistence Engine (IndexedDB + Storage Cache)
// Provides unified persistence for Application Settings, Alphanumeric Patient IDs, Patient Profiles, and Clinical Exam Reports.

import { AnalysisCase, AuditEvent, Patient, PatientIdConfig, SystemSettings, HospitalProfile, TechnicianUser, AdminAccount, BoundDevice, DeviceLicense, LicenseInvoice } from '../types';
import { safeStorage, stripHeavyCasePayloads } from './storageUtils';
import { deviceBindingService } from './deviceBindingService';

const DB_NAME = 'PodoPressDB';
const DB_VERSION = 2;

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
    hospitalId: 'hosp-technomind-main',
    hospitalName: 'Technomind Healthcare Systems',
    role: 'technician',
    status: 'active',
    createdAt: '2026-01-15T08:00:00.000Z',
    phone: '+1 (800) 555-PODO',
    email: 'tech@technomind.health',
    notes: 'Primary Clinical Lab Technician',
    recoveryKey: 'REC-TECH-1001',
  },
  {
    id: 'tech-user-02',
    name: 'Kavita Rao',
    username: 'kavita.rao',
    pin: '1234',
    hospitalId: 'hosp-metro-podiatry',
    hospitalName: 'Metropolitan Podiatry Center',
    role: 'technician',
    status: 'active',
    createdAt: '2026-02-01T09:30:00.000Z',
    phone: '+1 (800) 555-METRO',
    email: 'kavita@metropodiatry.com',
    notes: 'Outpatient Biomechanics Technician',
    recoveryKey: 'REC-TECH-1002',
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

    return tech || null;
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

  public getAdminAccountSync(): AdminAccount | null {
    try {
      const saved = localStorage.getItem(LS_KEYS.ADMIN_ACCOUNT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch {
      // Fallback
    }
    return null;
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
        registered.username.toLowerCase() === cleanUser ||
        (registered.email && registered.email.toLowerCase() === cleanUser);
      const matchPin = registered.pin === cleanPin;

      if (matchUser && matchPin) {
        registered.lastLoginAt = new Date().toISOString();
        try {
          localStorage.setItem(LS_KEYS.ADMIN_ACCOUNT, JSON.stringify(registered));
        } catch {
          // Ignore
        }
        return { success: true, account: registered };
      }
      return { success: false, error: 'Invalid Administrator username or Master Password.' };
    }

    // Fallback if no admin account created yet: allow default credentials once for first-time onboarding
    if ((cleanUser === 'admin@technomind.health' || cleanUser === 'admin') && (cleanPin === '1234' || cleanPin === 'admin')) {
      return { success: true, account: DEFAULT_ADMIN_ACCOUNT };
    }

    return { success: false, error: 'No administration account registered yet. Please create an administrator account first.' };
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
      registered.username.toLowerCase() === cleanUser ||
      (registered.email && registered.email.toLowerCase() === cleanUser);

    if (!matchUser) {
      return { success: false, error: 'Username or email does not match the registered Administrator account.' };
    }

    const cleanVerify = verificationCodeOrPhone.trim().toUpperCase();
    const cleanPhone = (registered.phone || '').replace(/[^0-9]/g, '');
    const inputDigits = verificationCodeOrPhone.replace(/[^0-9]/g, '');

    const keyMatches = registered.recoveryKey && registered.recoveryKey.toUpperCase() === cleanVerify;
    const phoneMatches = inputDigits.length >= 4 && cleanPhone.endsWith(inputDigits);
    const emailMatches = registered.email && registered.email.toLowerCase() === verificationCodeOrPhone.trim().toLowerCase();

    if (!keyMatches && !phoneMatches && !emailMatches) {
      return {
        success: false,
        error: 'Verification failed. Please provide your Security Recovery Key, registered phone number, or email.',
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

    const cleanVerify = verificationCodeOrEmail.trim().toUpperCase();
    const techDigits = (tech.phone || '').replace(/[^0-9]/g, '');
    const inputDigits = verificationCodeOrEmail.replace(/[^0-9]/g, '');

    const keyMatches = tech.recoveryKey && tech.recoveryKey.toUpperCase() === cleanVerify;
    const phoneMatches = inputDigits.length >= 4 && techDigits.endsWith(inputDigits);
    const emailMatches = tech.email && tech.email.toLowerCase() === verificationCodeOrEmail.trim().toLowerCase();

    // Also check if admin master password provided as authorized reset
    const adminAccount = this.getAdminAccountSync();
    const adminOverride = adminAccount && adminAccount.pin === verificationCodeOrEmail.trim();

    if (!keyMatches && !phoneMatches && !emailMatches && !adminOverride) {
      return {
        success: false,
        error: 'Verification failed. Please enter the technician registered email/phone or have an Administrator authorize with Master Password.',
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

