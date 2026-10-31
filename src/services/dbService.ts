// PodoPress Inbuilt Database & Persistence Engine (IndexedDB + Storage Cache)
// Provides unified persistence for Application Settings, Alphanumeric Patient IDs, Patient Profiles, and Clinical Exam Reports.

import { AnalysisCase, AuditEvent, Patient, PatientIdConfig, SystemSettings, HospitalProfile } from '../types';
import { safeStorage, stripHeavyCasePayloads } from './storageUtils';

const DB_NAME = 'PodoPressDB';
const DB_VERSION = 1;

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

      // Migrate cases
      const localCases = localStorage.getItem(LS_KEYS.CASES);
      if (localCases) {
        const parsed: AnalysisCase[] = JSON.parse(localCases);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const tx = db.transaction('cases', 'readwrite');
          const store = tx.objectStore('cases');
          for (const c of parsed) {
            store.put(c);
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
}

export const dbService = new PodoPressDatabase();

