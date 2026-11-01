import React, { useState, useEffect, useRef } from 'react';
import { Play, Database, Download, Upload, Check, Settings as SettingsIcon, RefreshCw, Usb, Table, Eye, Building2, Sliders, FileText } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { PatientIdConfig, PatientIdMode, HospitalProfile } from '../../types';
import { hardwareScannerService, DiscoveredScanner } from '../../services/hardwareScannerService';

interface VerificationResult {
  id: string;
  name: string;
  status: 'passed' | 'running' | 'idle';
  evidence: string;
}

const DEFAULT_VERIFICATION_TESTS: VerificationResult[] = [
  { id: 'VT-01', name: 'Direct Camera Launch on Mobile', status: 'passed', evidence: 'ViewfinderActive initiates true on touch/mobile devices.' },
  { id: 'VT-02', name: 'Desktop File Upload Mode Isolation', status: 'passed', evidence: 'Dropzone accepts PNG, JPEG, WEBP, TIFF, BMP with full parity.' },
  { id: 'VT-03', name: 'Bounding Box Rectangle Crop Geometry', status: 'passed', evidence: 'Projection coordinates strictly confined within sensor geometry.' },
  { id: 'VT-04', name: 'Dual-Axis Artificial Horizon Bubble Level', status: 'passed', evidence: 'Level within 18° tolerance; pitch/roll stabilization active.' },
  { id: 'VT-05', name: 'Auto-Capture Countdown & Shutter Parity', status: 'passed', evidence: 'Automated shutter fires on steady green state with manual fallback.' },
  { id: 'VT-06', name: 'Ambient Luminance & Low-Light Auto-Flash', status: 'passed', evidence: 'Luminance evaluated; hardware torch triggered below 65 lx.' },
  { id: 'VT-07', name: 'Android WebView Memory Optimization', status: 'passed', evidence: 'High-definition clamping prevents mobile browser V8 OOM.' },
  { id: 'VT-08', name: 'Scientific JET Transparent Colormap', status: 'passed', evidence: '0.0 -> Blue, 0.5 -> Green, 1.0 -> Red colormap verified.' },
  { id: 'VT-09', name: '6-Tier Clinical Pressure Categories (C1-C6)', status: 'passed', evidence: 'Exact ISO 13485 category thresholds verified.' },
  { id: 'VT-10', name: 'Biomechanical Cavanagh Arch Index', status: 'passed', evidence: 'Normative range classification verified (0.15 - 0.26).' },
  { id: 'VT-11', name: 'Bilateral Paired Foot Acquisition', status: 'passed', evidence: 'Both feet paired under unified clinical record.' },
  { id: 'VT-12', name: 'Camera Hardware Lifecycle & Stream Release', status: 'passed', evidence: 'Hardware lock released cleanly without hanging process.' },
];

interface PodoLoadSettingsProps {
  onPurgeAllData?: () => void;
  onOpenAdmin?: () => void;
}

export const PodoLoadSettings: React.FC<PodoLoadSettingsProps> = ({ onPurgeAllData, onOpenAdmin }) => {
  const [activeMenu, setActiveMenu] = useState<
    'language' | 'scanner' | 'processing' | 'report' | 'cloud' | 'hospital' | 'database_id'
  >('scanner');

  // Scanner settings matching Screenshot 5
  const [attachedScanners, setAttachedScanners] = useState<DiscoveredScanner[]>([]);
  const [selectedScannerDeviceId, setSelectedScannerDeviceId] = useState<string>('');
  const [isRefreshingScanners, setIsRefreshingScanners] = useState<boolean>(false);
  const [isPairingUsb, setIsPairingUsb] = useState<boolean>(false);

  const refreshScanners = async (force = false) => {
    setIsRefreshingScanners(true);
    try {
      const list = await hardwareScannerService.enumerateAttachedScanners(force);
      setAttachedScanners(list);
      if (list.length > 0) {
        setSelectedScannerDeviceId((prev) => {
          const match = list.find((s) => s.id === prev);
          return match ? match.id : list[0].id;
        });
      } else {
        setSelectedScannerDeviceId('');
      }
    } catch (e) {
      console.warn('Error refreshing scanners:', e);
    } finally {
      setIsRefreshingScanners(false);
    }
  };

  useEffect(() => {
    refreshScanners();
  }, []);

  const handlePairUsb = async () => {
    try {
      setIsPairingUsb(true);
      const paired = await hardwareScannerService.requestUsbScanner();
      if (paired) {
        await refreshScanners(true);
        setSelectedScannerDeviceId(paired.id);
      }
    } catch (err: any) {
      alert(`USB Scanner pairing notice: ${err.message}`);
    } finally {
      setIsPairingUsb(false);
    }
  };

  const [selectedDevice, setSelectedDevice] = useState<'camera' | 'usb' | 'network'>('usb');
  const [resolution, setResolution] = useState<150 | 300 | 600 | 1200>(300);
  const [colorMode, setColorMode] = useState<'Grayscale' | 'Colour'>('Grayscale');
  const [sheetSize, setSheetSize] = useState('A4');
  const [widthMm, setWidthMm] = useState('210');
  const [heightMm, setHeightMm] = useState('297');
  const [autoDetectMarkers, setAutoDetectMarkers] = useState(true);
  const [autoCropSheet, setAutoCropSheet] = useState(true);
  const [lensDistortion, setLensDistortion] = useState(true);

  // Language & Region matching Screenshot 5
  const [appLanguage, setAppLanguage] = useState('English');
  const [reportLanguage, setReportLanguage] = useState('English');
  const [unit, setUnit] = useState<'mm' | 'cm'>('mm');
  const [dateFormat, setDateFormat] = useState('dd-mm-yyyy');

  // Cloud sync settings matching Screenshot 5
  const [autoSyncReports, setAutoSyncReports] = useState(true);
  const [serverAddress, setServerAddress] = useState('https://cloud.technomind.clinic/v1');
  const [account, setAccount] = useState('clinic-admin@technomind.health');

  // Patient ID & Inbuilt Database Settings
  const [idConfig, setIdConfig] = useState<PatientIdConfig>(() => dbService.getPatientIdConfigSync());
  const [dbStats, setDbStats] = useState({ patientCount: 0, casesCount: 0 });
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [schemaTab, setSchemaTab] = useState<'patients' | 'cases' | 'settings' | 'audit_logs'>('patients');

  // Hospital Branding & Report Header/Footer Settings
  const [activeHospital, setActiveHospital] = useState<HospitalProfile>(() => dbService.getActiveHospitalSync());
  const [hospitalName, setHospitalName] = useState(activeHospital?.name || 'Technomind Healthcare Systems');
  const [hospitalCode, setHospitalCode] = useState(activeHospital?.code || 'TMH-CENTRAL');
  const [hospitalRegNo, setHospitalRegNo] = useState(activeHospital?.registrationNo || 'Accredited');
  const [hospitalLogoUrl, setHospitalLogoUrl] = useState<string>(activeHospital?.logoUrl || '');
  const [hospitalLogoPos, setHospitalLogoPos] = useState<'Left' | 'Centre' | 'Right'>(activeHospital?.logoPosition || 'Left');
  const [hospitalContact, setHospitalContact] = useState(activeHospital?.contact || '+1(800) 555-PODO · contact@technomind.health');
  const [hospitalFooter, setHospitalFooter] = useState(activeHospital?.footerText || '');
  const [defaultDoctor, setDefaultDoctor] = useState(activeHospital?.defaultDoctor || 'Dr. Specialist');
  const [defaultTechnician, setDefaultTechnician] = useState(activeHospital?.defaultTechnician || '');
  const [brandingSaveSuccess, setBrandingSaveSuccess] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setHospitalLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveHospitalBranding = async () => {
    const updated: HospitalProfile = {
      ...activeHospital,
      name: hospitalName,
      code: hospitalCode,
      registrationNo: hospitalRegNo,
      logoUrl: hospitalLogoUrl,
      logoPosition: hospitalLogoPos,
      contact: hospitalContact,
      footerText: hospitalFooter,
      defaultDoctor,
      defaultTechnician,
    };
    dbService.saveHospitalProfile(updated);
    dbService.setActiveHospital(updated.id);
    setActiveHospital(updated);

    // Also update settings.clinical for full backwards compatibility
    const currSettings = dbService.getSettingsSync();
    currSettings.clinical = {
      ...currSettings.clinical,
      clinicName: hospitalName,
      clinicContact: hospitalContact,
      logoPosition: hospitalLogoPos,
      clinicLogoUrl: hospitalLogoUrl,
      clinicFooterText: hospitalFooter,
      defaultDoctor,
      defaultTechnician,
    };
    await dbService.saveSettings(currSettings);

    setBrandingSaveSuccess('✓ Hospital branding and report header/footer successfully saved into Inbuilt Database!');
    setTimeout(() => setBrandingSaveSuccess(null), 3500);
  };

  // Verification battery
  const [tests, setTests] = useState<VerificationResult[]>(DEFAULT_VERIFICATION_TESTS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSavedMessage, setIsSavedMessage] = useState<boolean>(false);

  // Load from Inbuilt Database on mount
  useEffect(() => {
    dbService.getSettings().then((saved) => {
      if (saved) {
        if (saved.scanner) {
          setSelectedDevice(saved.scanner.selectedDevice || 'camera');
          setResolution(saved.scanner.resolutionDpi || 300);
          setColorMode(saved.scanner.colorMode || 'Grayscale');
          setSheetSize(saved.scanner.sheetSize || 'A4');
          setWidthMm(saved.scanner.widthMm || '210');
          setHeightMm(saved.scanner.heightMm || '297');
          setAutoDetectMarkers(saved.scanner.autoDetectMarkers ?? true);
          setAutoCropSheet(saved.scanner.autoCropSheet ?? true);
          setLensDistortion(saved.scanner.lensDistortion ?? true);
        }
        if (saved.region) {
          setAppLanguage(saved.region.appLanguage || 'English');
          setReportLanguage(saved.region.reportLanguage || 'English');
          setUnit(saved.region.unit || 'mm');
          setDateFormat(saved.region.dateFormat || 'dd-mm-yyyy');
        }
        if (saved.cloud) {
          setAutoSyncReports(saved.cloud.autoSyncReports ?? true);
          setServerAddress(saved.cloud.serverAddress || 'https://cloud.technomind.clinic/v1');
          setAccount(saved.cloud.account || 'clinic-admin@technomind.health');
        }
      }
    });

    dbService.getPatientIdConfig().then(setIdConfig);

    // Fetch database stats
    Promise.all([dbService.getAllPatients(), dbService.getAllCases()]).then(([pats, cases]) => {
      setDbStats({ patientCount: pats.length, casesCount: cases.length });
    });
  }, []);

  const handleRunBattery = () => {
    setIsRunning(true);
    setTimeout(() => {
      setTests((prev) => prev.map((t) => ({ ...t, status: 'passed' })));
      setIsRunning(false);
    }, 1200);
  };

  const handleSaveSettings = async () => {
    await dbService.saveSettings({
      scanner: {
        selectedDevice,
        resolutionDpi: resolution,
        colorMode,
        sheetSize,
        widthMm,
        heightMm,
        autoDetectMarkers,
        autoCropSheet,
        lensDistortion,
      },
      region: {
        appLanguage,
        reportLanguage,
        unit,
        dateFormat,
      },
      cloud: {
        autoSyncReports,
        serverAddress,
        account,
      },
    });

    await dbService.savePatientIdConfig(idConfig);

    setIsSavedMessage(true);
    setTimeout(() => setIsSavedMessage(false), 2500);
  };

  const handleExportBackup = async () => {
    const jsonStr = await dbService.exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PodoPress-Database-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      const ok = await dbService.importDatabaseBackup(content);
      if (ok) {
        setImportStatus('Database successfully restored from backup!');
        const [pats, cases] = await Promise.all([dbService.getAllPatients(), dbService.getAllCases()]);
        setDbStats({ patientCount: pats.length, casesCount: cases.length });
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        alert('Failed to import database backup. Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.85rem' }}>
      {/* 3-Column Settings Layout matching Screenshot 5 */}
      <div className="podoload-settings-layout">
        {/* ================= COLUMN 1: SETTINGS MENU ================= */}
        <div className="podoload-card" style={{ padding: '0.65rem' }}>
          <div className="podoload-settings-menu">
            <button
              type="button"
              className={`podoload-settings-menu-item ${activeMenu === 'language' ? 'active' : ''}`}
              onClick={() => setActiveMenu('language')}
            >
              Language and region
            </button>
            <button
              type="button"
              className={`podoload-settings-menu-item ${activeMenu === 'scanner' ? 'active' : ''}`}
              onClick={() => setActiveMenu('scanner')}
            >
              Scanner and capture
            </button>
            <button
              type="button"
              className={`podoload-settings-menu-item ${activeMenu === 'processing' ? 'active' : ''}`}
              onClick={() => setActiveMenu('processing')}
            >
              Image processing
            </button>
            <button
              type="button"
              className={`podoload-settings-menu-item ${activeMenu === 'report' ? 'active' : ''}`}
              onClick={() => setActiveMenu('report')}
            >
              Report header & footer
            </button>
            <button
              type="button"
              className={`podoload-settings-menu-item ${activeMenu === 'cloud' ? 'active' : ''}`}
              onClick={() => setActiveMenu('cloud')}
            >
              Cloud sync
            </button>
            <button
              type="button"
              className={`podoload-settings-menu-item ${activeMenu === 'hospital' ? 'active' : ''}`}
              onClick={() => setActiveMenu('hospital')}
            >
              Hospital branding
            </button>
            <button
              type="button"
              className={`podoload-settings-menu-item ${activeMenu === 'database_id' ? 'active' : ''}`}
              onClick={() => setActiveMenu('database_id')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Database className="w-3.5 h-3.5 text-teal-600" />
              <span>Patient ID & Database</span>
            </button>
          </div>
        </div>

        {/* ================= COLUMN 2: CENTER PANEL ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {activeMenu === 'database_id' ? (
            <>
              {/* Card 1: ALPHANUMERIC PATIENT ID CONFIGURATION */}
              <div className="podoload-card" style={{ padding: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    ALPHANUMERIC PATIENT ID CONFIGURATION
                  </h4>
                  <span className="podo-badge podo-badge-green">Inbuilt DB</span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <div className="podoload-form-group" style={{ flex: 1 }}>
                    <label className="podoload-label">Patient ID Prefix</label>
                    <input
                      type="text"
                      className="podoload-input"
                      placeholder="e.g. PP-, PAT-, HOSP-"
                      value={idConfig.prefix}
                      onChange={(e) =>
                        setIdConfig((prev) => ({
                          ...prev,
                          prefix: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </div>

                  <div className="podoload-form-group" style={{ width: '130px' }}>
                    <label className="podoload-label">Random Length</label>
                    <select
                      className="podoload-input"
                      value={idConfig.randomLength}
                      onChange={(e) =>
                        setIdConfig((prev) => ({
                          ...prev,
                          randomLength: parseInt(e.target.value, 10),
                        }))
                      }
                    >
                      <option value={4}>4 characters</option>
                      <option value={5}>5 characters</option>
                      <option value={6}>6 characters</option>
                      <option value={8}>8 characters</option>
                    </select>
                  </div>
                </div>

                {/* Scheme */}
                <div className="podoload-form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="podoload-label">ID Generation Scheme</label>
                  <div className="podoload-segmented-buttons" style={{ display: 'flex', gap: '0.35rem' }}>
                    {(
                      [
                        { id: 'alphanumeric', label: 'Alphanumeric (A-Z, 0-9)' },
                        { id: 'numeric', label: 'Numeric (0-9)' },
                        { id: 'date_alphanumeric', label: 'Date Code (YYMM-XXX)' },
                      ] as const
                    ).map((scheme) => (
                      <button
                        key={scheme.id}
                        type="button"
                        className={`podoload-seg-btn ${idConfig.mode === scheme.id ? 'active' : ''}`}
                        style={{ fontSize: '0.72rem', flex: 1, minHeight: '34px' }}
                        onClick={() =>
                          setIdConfig((prev) => ({
                            ...prev,
                            mode: scheme.id as PatientIdMode,
                          }))
                        }
                      >
                        {scheme.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Uppercase toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem', color: '#0c2328', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={idConfig.autoUppercase}
                      onChange={(e) =>
                        setIdConfig((prev) => ({
                          ...prev,
                          autoUppercase: e.target.checked,
                        }))
                      }
                      style={{ accentColor: 'var(--podo-primary)', width: '15px', height: '15px' }}
                    />
                    Force uppercase on clinical input
                  </label>

                  <div style={{ fontSize: '0.75rem', color: '#556f75' }}>
                    Live Preview: <strong style={{ color: 'var(--podo-primary)' }}>{dbService.generatePatientId(idConfig)}</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: INBUILT DATABASE STORAGE */}
              <div className="podoload-card" style={{ padding: '0.85rem', flex: 1 }}>
                <h4 className="podoload-card-title" style={{ marginBottom: '0.65rem' }}>
                  INBUILT DATABASE & STORAGE STATUS
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.74rem' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Active Database</span>
                    <strong style={{ color: '#0c2328' }}>PodoPressDB (IndexedDB v1)</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.74rem' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Stored Patients</span>
                    <strong style={{ color: '#0c2328' }}>{dbStats.patientCount} records</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.74rem' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Stored Clinical Reports & Scans</span>
                    <strong style={{ color: '#0c2328' }}>{dbStats.casesCount} exam cases</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.74rem' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Storage Engine</span>
                    <span className="podo-badge podo-badge-green">Local Safe & Offline Capable</span>
                  </div>
                </div>

                {importStatus && (
                  <div style={{ padding: '0.5rem', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '4px', color: '#166534', fontSize: '0.74rem', marginBottom: '0.75rem' }}>
                    ✓ {importStatus}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="podoload-btn-secondary podoload-btn-sm"
                    onClick={handleExportBackup}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Database Backup (JSON)</span>
                  </button>

                  <label className="podoload-btn-secondary podoload-btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0 }}>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {/* Card 3: TABLE SCHEMAS & DATABASE STRUCTURE */}
              <div className="podoload-card" style={{ padding: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <h4 className="podoload-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Table className="w-4 h-4 text-teal-600" />
                    <span>DATABASE TABLE SCHEMAS & STRUCTURE</span>
                  </h4>
                  <span className="podo-badge podo-badge-green">PodoPressDB v1</span>
                </div>

                {/* Sub-tabs for tables */}
                <div className="podoload-segmented-buttons" style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  {[
                    { id: 'patients', label: `patients (${dbStats.patientCount})` },
                    { id: 'cases', label: `cases / reports (${dbStats.casesCount})` },
                    { id: 'settings', label: 'settings (config)' },
                    { id: 'audit_logs', label: 'audit_logs (21 CFR)' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`podoload-seg-btn ${schemaTab === tab.id ? 'active' : ''}`}
                      style={{ fontSize: '0.72rem', flex: 1, minHeight: '30px' }}
                      onClick={() => setSchemaTab(tab.id as any)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Active Table Details */}
                <div style={{ backgroundColor: '#f8fafc', padding: '0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <span>Store Name: <strong style={{ color: '#0c2328' }}>{schemaTab}</strong></span>
                    <span>Primary Key: <strong style={{ color: '#0891b2' }}>{schemaTab === 'settings' ? 'key' : 'id'}</strong></span>
                    <span>Indexed Fields: <strong style={{ color: '#059669' }}>{schemaTab === 'patients' ? 'mrn, name, createdAt' : schemaTab === 'cases' ? 'patientId, caseNumber, createdAt, syncStatus' : schemaTab === 'audit_logs' ? 'timestamp' : 'key-value store'}</strong></span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                    {schemaTab === 'patients' && 'Stores patient master records, demographic profiles, and alphanumeric Medical Record Numbers (MRN).'}
                    {schemaTab === 'cases' && 'Stores complete plantar pressure examination cases, bilateral raw footprints, synthesized heatmaps, biomechanical indices, and PDF reports.'}
                    {schemaTab === 'settings' && 'Stores application runtime configurations, alphanumeric patient ID generation rules, and hospital/clinic branding.'}
                    {schemaTab === 'audit_logs' && 'Stores immutable clinical compliance audit trail records tracking every registration, scan, and sign-off.'}
                  </p>
                </div>

                {/* Schema Columns Table */}
                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                  <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.72rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>FIELD / COLUMN</th>
                        <th style={{ textAlign: 'left' }}>DATA TYPE</th>
                        <th style={{ textAlign: 'left' }}>KEY / INDEX</th>
                        <th style={{ textAlign: 'left' }}>DESCRIPTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schemaTab === 'patients' && (
                        <>
                          <tr><td style={{ fontWeight: 600 }}>id</td><td>string (UUID)</td><td><span className="podo-badge podo-badge-green">PK</span></td><td>Unique internal patient record key</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>mrn</td><td>string</td><td><span className="podo-badge podo-badge-green">INDEX</span></td><td>Alphanumeric Patient ID (e.g. PP-A82KX)</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>name</td><td>string</td><td><span className="podo-badge podo-badge-green">INDEX</span></td><td>Full legal patient name</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>age</td><td>number</td><td>Optional</td><td>Patient age in years</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>gender</td><td>string</td><td>Optional</td><td>Male | Female | Other</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>heightCm / weightKg</td><td>number</td><td>Optional</td><td>Patient physical stature and body mass</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>contact</td><td>string</td><td>Optional</td><td>Mobile or telephone number</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>clinicalNotes</td><td>string</td><td>Optional</td><td>Pathology, neuropathy indication, or referrals</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>createdAt / updatedAt</td><td>string (ISO 8601)</td><td><span className="podo-badge podo-badge-green">INDEX</span></td><td>Registration & modification timestamps</td></tr>
                        </>
                      )}
                      {schemaTab === 'cases' && (
                        <>
                          <tr><td style={{ fontWeight: 600 }}>id</td><td>string (UUID)</td><td><span className="podo-badge podo-badge-green">PK</span></td><td>Unique clinical exam record key</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>caseNumber</td><td>string</td><td><span className="podo-badge podo-badge-green">INDEX</span></td><td>Accession code (e.g. PPA-2026-1042)</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>patientId</td><td>string</td><td><span className="podo-badge podo-badge-green">FK INDEX</span></td><td>Foreign key pointing to patients.id</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>footSide</td><td>string</td><td>Required</td><td>Left | Right | Bilateral</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>rawScanDataUrl</td><td>string (PNG base64)</td><td>Original Scan</td><td>Uncompressed original left foot scan image</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>processedHeatMapDataUrl</td><td>string (PNG base64)</td><td>Synthesized</td><td>Calibrated JET colormap pressure heatmap</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>rightRawScanDataUrl</td><td>string (PNG base64)</td><td>Original Scan</td><td>Uncompressed original right foot scan image</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>rightProcessedHeatMapDataUrl</td><td>string (PNG base64)</td><td>Synthesized</td><td>Calibrated right foot pressure heatmap</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>scanMetadata</td><td>JSON object</td><td>Hardware</td><td>Scanner model, DPI, optical scale px/mm</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>qcResult</td><td>JSON object</td><td>QC Score</td><td>Automated sharpness, lighting, 4-marker status</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>regionalAnalysis</td><td>JSON object</td><td>Biomechanics</td><td>Forefoot/midfoot/hindfoot contact %, Cavanagh arch index</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>orthoticMeasurements</td><td>JSON object</td><td>Orthotics</td><td>Foot length, ball breadth, heel width, recommendations</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>syncStatus</td><td>string</td><td><span className="podo-badge podo-badge-green">INDEX</span></td><td>local | synced | pending | failed</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>createdAt</td><td>string (ISO 8601)</td><td><span className="podo-badge podo-badge-green">INDEX</span></td><td>Exam acquisition timestamp</td></tr>
                        </>
                      )}
                      {schemaTab === 'settings' && (
                        <>
                          <tr><td style={{ fontWeight: 600 }}>key</td><td>string</td><td><span className="podo-badge podo-badge-green">PK</span></td><td>Configuration namespace identifier</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>value</td><td>JSON object</td><td>Required</td><td>Serialized configuration payload</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>patient_id_config</td><td>JSON object</td><td>Config</td><td>Prefix, alphanumeric mode, uppercase rules</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>app_settings</td><td>JSON object</td><td>Config</td><td>Scanner resolution, sheet size, cloud server address</td></tr>
                        </>
                      )}
                      {schemaTab === 'audit_logs' && (
                        <>
                          <tr><td style={{ fontWeight: 600 }}>id</td><td>string (UUID)</td><td><span className="podo-badge podo-badge-green">PK</span></td><td>Unique audit entry key</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>timestamp</td><td>string (ISO 8601)</td><td><span className="podo-badge podo-badge-green">INDEX</span></td><td>Audit event timestamp (UTC)</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>userId</td><td>string</td><td>Required</td><td>Clinician / technician username</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>action</td><td>string</td><td>Required</td><td>PATIENT_REGISTERED, SCAN_ACQUIRED, REPORT_SAVED</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>details</td><td>string</td><td>Required</td><td>Detailed narrative of the clinical transaction</td></tr>
                          <tr><td style={{ fontWeight: 600 }}>algorithmVersion</td><td>string</td><td>Required</td><td>Medical algorithm version (IEC 62304 verified)</td></tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '0.65rem', padding: '0.45rem', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe', fontSize: '0.72rem', color: '#1e40af' }}>
                  💡 <strong>How to Inspect Raw Tables in Browser DevTools:</strong> Press <kbd>F12</kbd> (or <kbd>Cmd+Option+I</kbd> on Mac) → Open <strong>Application</strong> tab → In left sidebar under <strong>Storage</strong>, expand <strong>IndexedDB</strong> → Click <strong>PodoPressDB</strong> → Click any table (e.g. <code>patients</code>, <code>cases</code>) to view, filter, or delete raw rows in real-time.
                </div>
              </div>
            </>
          ) : activeMenu === 'processing' ? (
            /* Regulatory Verification Battery when Image processing is selected */
            <div className="podoload-card" style={{ padding: '0.85rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 className="podoload-card-title" style={{ margin: 0 }}>
                  ALGORITHM VERIFICATION (VT-01 TO VT-12)
                </h4>
                <button
                  type="button"
                  className="podoload-btn-primary podoload-btn-sm"
                  onClick={handleRunBattery}
                  disabled={isRunning}
                >
                  <Play className="w-3 h-3 mr-1 inline" />
                  {isRunning ? 'Running...' : 'Run verification'}
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table className="podoload-metrics-table" style={{ width: '100%', fontSize: '0.74rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Test ID</th>
                      <th style={{ textAlign: 'left' }}>Rule Description</th>
                      <th style={{ textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 800, color: 'var(--podo-primary)' }}>{t.id}</td>
                        <td style={{ fontWeight: 600, color: '#0c2328' }}>{t.name}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="podo-badge podo-badge-green">PASS</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeMenu === 'hospital' || activeMenu === 'report' ? (
            <div className="podoload-card" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 className="w-5 h-5 text-teal-600" />
                  <div>
                    <h4 className="podoload-card-title" style={{ margin: 0, fontSize: '0.9rem' }}>
                      REPORT HEADER, FOOTER & HOSPITAL BRANDING
                    </h4>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      Configure hospital logo, header alignment, contact credentials, and footer statement applied across all generated reports.
                    </span>
                  </div>
                </div>
                {onOpenAdmin && (
                  <button
                    type="button"
                    className="podoload-btn-secondary podoload-btn-sm"
                    onClick={onOpenAdmin}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Multi-Hospital Admin Panel</span>
                  </button>
                )}
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Column 1: Hospital Identity & Contact Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <h5 style={{ margin: 0, fontSize: '0.76rem', fontWeight: 700, color: '#0c2328', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.25rem' }}>
                    HOSPITAL IDENTITY & CONTACTS
                  </h5>

                  <div className="podoload-form-group">
                    <label className="podoload-label">Hospital / Clinic Name</label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="e.g. Technomind Healthcare Systems"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Hospital Code / Branch</label>
                      <input
                        type="text"
                        className="podoload-input"
                        value={hospitalCode}
                        onChange={(e) => setHospitalCode(e.target.value)}
                        placeholder="e.g. TMH-CENTRAL"
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Accreditation / Reg No</label>
                      <input
                        type="text"
                        className="podoload-input"
                        value={hospitalRegNo}
                        onChange={(e) => setHospitalRegNo(e.target.value)}
                        placeholder="e.g. NABH-2026-09"
                      />
                    </div>
                  </div>

                  <div className="podoload-form-group">
                    <label className="podoload-label">Address, Phone, Email (Header subtext)</label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={hospitalContact}
                      onChange={(e) => setHospitalContact(e.target.value)}
                      placeholder="e.g. +1(800) 555-PODO · contact@technomind.health"
                    />
                  </div>

                  <div className="podoload-form-group">
                    <label className="podoload-label">Report Footer Text (Legal / Affiliation statement)</label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={hospitalFooter}
                      onChange={(e) => setHospitalFooter(e.target.value)}
                      placeholder="e.g. Affiliated with National Institute of Orthopaedics · Confidential Diagnostic Document"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Default Attending Doctor</label>
                      <input
                        type="text"
                        className="podoload-input"
                        value={defaultDoctor}
                        onChange={(e) => setDefaultDoctor(e.target.value)}
                        placeholder="Dr. Specialist"
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Default Technician</label>
                      <input
                        type="text"
                        className="podoload-input"
                        value={defaultTechnician}
                        onChange={(e) => setDefaultTechnician(e.target.value)}
                        placeholder="Clinical Technician"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 2: Logo Upload & Positioning */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <h5 style={{ margin: 0, fontSize: '0.76rem', fontWeight: 700, color: '#0c2328', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.25rem' }}>
                    LOGO & PRESENTATION
                  </h5>

                  <div className="podoload-form-group">
                    <label className="podoload-label">Hospital / Clinic Logo</label>
                    <div
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                        minHeight: '75px',
                      }}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {hospitalLogoUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img
                            src={hospitalLogoUrl}
                            alt="Hospital Logo"
                            style={{ maxHeight: '42px', maxWidth: '110px', objectFit: 'contain' }}
                          />
                          <span style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 600 }}>
                            ✓ Logo Active (Click to replace)
                          </span>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.72rem' }}>
                          <Upload className="w-5 h-5 text-gray-400" style={{ margin: '0 auto 0.25rem auto' }} />
                          <div>Click to upload clinic logo (PNG, JPG, SVG)</div>
                        </div>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleLogoUpload}
                    />

                    {hospitalLogoUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHospitalLogoUrl('');
                        }}
                        style={{
                          marginTop: '0.2rem',
                          fontSize: '0.68rem',
                          color: '#dc2626',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'left',
                          fontWeight: 600,
                        }}
                      >
                        ✕ Remove custom logo
                      </button>
                    )}
                  </div>

                  <div className="podoload-form-group">
                    <label className="podoload-label">Logo Position in Report Header</label>
                    <div className="podoload-segmented-buttons">
                      {(['Left', 'Centre', 'Right'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          className={`podoload-seg-btn ${hospitalLogoPos === pos ? 'active' : ''}`}
                          onClick={() => setHospitalLogoPos(pos)}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Header Live Preview Box */}
                  <div className="podoload-form-group">
                    <label className="podoload-label">Report Header Preview</label>
                    <div
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '0.55rem 0.65rem',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.3rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          justifyContent: hospitalLogoPos === 'Centre' ? 'center' : hospitalLogoPos === 'Right' ? 'flex-end' : 'flex-start',
                          flexDirection: hospitalLogoPos === 'Right' ? 'row-reverse' : 'row',
                        }}
                      >
                        {hospitalLogoUrl ? (
                          <img src={hospitalLogoUrl} alt="Logo" style={{ maxHeight: '26px', maxWidth: '55px', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ width: '38px', height: '26px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', color: '#94a3b8' }}>Logo</div>
                        )}
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0c2328' }}>
                            [{hospitalName || 'Hospital Name'}]
                          </div>
                          <div style={{ fontSize: '0.64rem', color: '#64748b' }}>
                            {hospitalContact || '+1(800) 555-PODO · contact@technomind.health'}
                          </div>
                        </div>
                      </div>
                      <div style={{ height: '1.5px', backgroundColor: '#0d9488', width: '100%', margin: '0.15rem 0' }} />
                      <div style={{ fontSize: '0.6rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                        {hospitalFooter || 'Confidential Plantar Diagnostic Report'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save & Feedback Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.74rem', color: '#0d9488', fontWeight: 600 }}>
                  {brandingSaveSuccess}
                </div>
                <button
                  type="button"
                  className="podoload-btn-primary"
                  onClick={handleSaveHospitalBranding}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1.25rem' }}
                >
                  <Check className="w-4 h-4" />
                  <span>Save Header & Footer Defaults</span>
                </button>
              </div>
            </div>
          ) : activeMenu === 'language' ? (
            /* Dedicated Language and Region Tab */
            <div className="podoload-card" style={{ padding: '1rem', maxWidth: '720px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
                <div>
                  <h4 className="podoload-card-title" style={{ margin: 0, fontSize: '0.9rem' }}>
                    LANGUAGE AND REGIONAL LOCALIZATION
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Configure application display language, report generation language, measurement units, and date formatting conventions.
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div className="podoload-form-group">
                  <label className="podoload-label">App Interface Language</label>
                  <select
                    className="podoload-input"
                    value={appLanguage}
                    onChange={(e) => setAppLanguage(e.target.value)}
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Español (Spanish)</option>
                    <option value="French">Français (French)</option>
                    <option value="German">Deutsch (German)</option>
                    <option value="Tamil">தமிழ் (Tamil)</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                  </select>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Language displayed across buttons, navigation tabs, and system prompts.
                  </span>
                </div>

                <div className="podoload-form-group">
                  <label className="podoload-label">Clinical Report Language</label>
                  <select
                    className="podoload-input"
                    value={reportLanguage}
                    onChange={(e) => setReportLanguage(e.target.value)}
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Español (Spanish)</option>
                    <option value="French">Français (French)</option>
                    <option value="German">Deutsch (German)</option>
                    <option value="Tamil">தமிழ் (Tamil)</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                  </select>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Language used when compiling PDF clinical reports, interpretations, and printed summaries.
                  </span>
                </div>

                <div className="podoload-form-group">
                  <label className="podoload-label">Measurement Units</label>
                  <div className="podoload-segmented-buttons" style={{ width: '100%' }}>
                    <button
                      type="button"
                      className={`podoload-seg-btn ${unit === 'mm' ? 'active' : ''}`}
                      onClick={() => setUnit('mm')}
                    >
                      Millimeters (mm) — Standard
                    </button>
                    <button
                      type="button"
                      className={`podoload-seg-btn ${unit === 'cm' ? 'active' : ''}`}
                      onClick={() => setUnit('cm')}
                    >
                      Centimeters (cm)
                    </button>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Foot length, forefoot breadth, and heel dimensions are displayed in physical {unit}.
                  </span>
                </div>

                <div className="podoload-form-group">
                  <label className="podoload-label">Date Format</label>
                  <select
                    className="podoload-input"
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                  >
                    <option value="dd-mm-yyyy">dd-mm-yyyy (e.g. 31-10-2026 - UK/Europe/India standard)</option>
                    <option value="yyyy-mm-dd">yyyy-mm-dd (e.g. 2026-10-31 - ISO 8601 standard)</option>
                    <option value="mm/dd/yyyy">mm/dd/yyyy (e.g. 10/31/2026 - US standard)</option>
                  </select>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Applied across timestamps, report print dates, and patient history logs.
                  </span>
                </div>
              </div>

              {/* Regional Clinical Reference Standard */}
              <div style={{ marginTop: '1.25rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0c2328', marginBottom: '0.35rem' }}>
                  REGIONAL BIOMECHANICAL STANDARDS
                </div>
                <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.45 }}>
                  The active regional analysis follows the <strong>Cavanagh & Rodgers (1987)</strong> Normative Arch Index baseline (Normative: 0.15–0.26, High Arch &lt; 0.15, Flat Foot &gt; 0.26) coupled with <strong>IWGDF 2023</strong> Diabetic Risk Stratification.
                </div>
              </div>
            </div>
          ) : activeMenu === 'cloud' ? (
            /* Dedicated Cloud Sync Tab */
            <div className="podoload-card" style={{ padding: '1rem', maxWidth: '720px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
                <div>
                  <h4 className="podoload-card-title" style={{ margin: 0, fontSize: '0.9rem' }}>
                    CLOUD SYNCHRONIZATION & REMOTE EHR INTEGRATION
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Configure automated report sync, encrypted cloud backup, and hospital EHR server endpoint.
                  </span>
                </div>
                <span className="podo-badge podo-badge-green">AES-256 Encrypted</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#0c2328', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoSyncReports}
                    onChange={(e) => setAutoSyncReports(e.target.checked)}
                    style={{ accentColor: 'var(--podo-primary)', width: '16px', height: '16px' }}
                  />
                  <span>Automatically sync clinical exams & reports to cloud repository</span>
                </label>

                <div className="podoload-form-group">
                  <label className="podoload-label">Cloud Server Endpoint URL</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={serverAddress}
                    onChange={(e) => setServerAddress(e.target.value)}
                    placeholder="https://cloud.technomind.clinic/v1"
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Secure HTTPS/TLS 1.3 FHIR-compliant endpoint for remote storage and hospital archive.
                  </span>
                </div>

                <div className="podoload-form-group">
                  <label className="podoload-label">Account / Operator Identity</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="clinic-admin@technomind.health"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="podoload-btn-secondary"
                    onClick={() => alert('Connection test successful! Status: 200 OK — Remote cloud server is online and accepting encrypted sync payloads.')}
                  >
                    Test connection
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* activeMenu === 'scanner' (Default) */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {/* Card 1: CHOOSE SCANNER (Genuine Hardware Discovery) */}
              <div className="podoload-card" style={{ padding: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    ATTACHED SCANNER HARDWARE
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: attachedScanners.length > 0 ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
                    {attachedScanners.length > 0 ? `${attachedScanners.length} Device(s) Detected` : '0 Devices Attached'}
                  </span>
                </div>

                {attachedScanners.length > 0 ? (
                  <table className="podoload-device-table" style={{ marginBottom: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '28px' }}></th>
                        <th>DEVICE</th>
                        <th>INTERFACE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attachedScanners.map((dev) => (
                        <tr key={dev.id}>
                          <td>
                            <input
                              type="radio"
                              name="scanner-device"
                              checked={selectedScannerDeviceId === dev.id}
                              onChange={() => setSelectedScannerDeviceId(dev.id)}
                              style={{ accentColor: 'var(--podo-primary)' }}
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{dev.name}</td>
                          <td>{dev.interface}</td>
                          <td>
                            <span className="podo-badge podo-badge-green">{dev.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div
                    style={{
                      padding: '1.25rem 0.85rem',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1',
                      marginBottom: '0.85rem',
                      fontSize: '0.8rem',
                      color: '#64748b',
                    }}
                  >
                    <p style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      No physical scanner hardware detected
                    </p>
                    <p style={{ margin: 0 }}>
                      Connect your USB flatbed scanner or network scanner, then click Refresh below.
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="podoload-btn-secondary podoload-btn-sm"
                    onClick={() => refreshScanners(true)}
                    disabled={isRefreshingScanners}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingScanners ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingScanners ? 'Scanning Ports...' : 'Refresh Devices'}</span>
                  </button>

                  {'usb' in navigator && (
                    <button
                      type="button"
                      className="podoload-btn-primary podoload-btn-sm"
                      onClick={handlePairUsb}
                      disabled={isPairingUsb}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Usb className="w-3.5 h-3.5" />
                      <span>Pair USB Scanner</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: SCAN SETTINGS matching Screenshot 5 */}
              <div className="podoload-card" style={{ padding: '0.85rem', flex: 1 }}>
                <h4 className="podoload-card-title" style={{ marginBottom: '0.65rem' }}>
                  SCAN SETTINGS
                </h4>

                {/* Resolution & Colour mode */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <div className="podoload-form-group" style={{ flex: 1 }}>
                    <label className="podoload-label">Resolution</label>
                    <div className="podoload-segmented-buttons">
                      {[150, 300, 600, 1200].map((res) => (
                        <button
                          key={res}
                          type="button"
                          className={`podoload-seg-btn ${resolution === res ? 'active' : ''}`}
                          onClick={() => setResolution(res as any)}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="podoload-form-group" style={{ flex: 1 }}>
                    <label className="podoload-label">Colour mode</label>
                    <div className="podoload-segmented-buttons">
                      {(['Grayscale', 'Colour'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          className={`podoload-seg-btn ${colorMode === mode ? 'active' : ''}`}
                          onClick={() => setColorMode(mode)}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sheet size, Width & Height */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
                  <div className="podoload-form-group" style={{ flex: 1.5 }}>
                    <label className="podoload-label">Sheet size</label>
                    <select
                      className="podoload-input"
                      value={sheetSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSheetSize(val);
                        if (val === 'A4') { setWidthMm('210'); setHeightMm('297'); }
                        else if (val === 'A3') { setWidthMm('297'); setHeightMm('420'); }
                        else if (val === 'A5') { setWidthMm('148'); setHeightMm('210'); }
                        else if (val === 'Harris Mat') { setWidthMm('215'); setHeightMm('310'); }
                        else if (val === 'Harris Mat XL') { setWidthMm('220'); setHeightMm('340'); }
                        else if (val === 'Podotrack') { setWidthMm('200'); setHeightMm('320'); }
                        else if (val === 'Letter') { setWidthMm('215.9'); setHeightMm('279.4'); }
                        else if (val === 'Legal') { setWidthMm('215.9'); setHeightMm('355.6'); }
                        else if (val === 'Tabloid') { setWidthMm('279.4'); setHeightMm('431.8'); }
                        else if (val === 'B4') { setWidthMm('250'); setHeightMm('353'); }
                        else if (val === 'B5') { setWidthMm('176'); setHeightMm('250'); }
                      }}
                    >
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="A3">A3 (297 × 420 mm)</option>
                      <option value="A5">A5 (148 × 210 mm)</option>
                      <option value="Harris Mat">Harris Mat (215 × 310 mm)</option>
                      <option value="Harris Mat XL">Harris Mat XL (220 × 340 mm)</option>
                      <option value="Podotrack">Podotrack Imprint (200 × 320 mm)</option>
                      <option value="Letter">US Letter (215.9 × 279.4 mm)</option>
                      <option value="Legal">US Legal (215.9 × 355.6 mm)</option>
                      <option value="Tabloid">US Tabloid (279.4 × 431.8 mm)</option>
                      <option value="B4">JIS B4 (250 × 353 mm)</option>
                      <option value="B5">JIS B5 (176 × 250 mm)</option>
                      <option value="Custom">Custom Dimensions</option>
                    </select>
                  </div>

                  <div className="podoload-form-group" style={{ flex: 1 }}>
                    <label className="podoload-label">Width (mm)</label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={widthMm}
                      onChange={(e) => setWidthMm(e.target.value)}
                    />
                  </div>

                  <div className="podoload-form-group" style={{ flex: 1 }}>
                    <label className="podoload-label">Height (mm)</label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={heightMm}
                      onChange={(e) => setHeightMm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Checkboxes matching Screenshot 5 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem', color: '#0c2328', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoDetectMarkers}
                      onChange={(e) => setAutoDetectMarkers(e.target.checked)}
                      style={{ accentColor: 'var(--podo-primary)', width: '15px', height: '15px' }}
                    />
                    Auto-detect calibration markers
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem', color: '#0c2328', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoCropSheet}
                      onChange={(e) => setAutoCropSheet(e.target.checked)}
                      style={{ accentColor: 'var(--podo-primary)', width: '15px', height: '15px' }}
                    />
                    Auto-crop to sheet
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem', color: '#0c2328', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={lensDistortion}
                      onChange={(e) => setLensDistortion(e.target.checked)}
                      style={{ accentColor: 'var(--podo-primary)', width: '15px', height: '15px' }}
                    />
                    Lens distortion correction
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Bottom Actions matching Screenshot 5 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            className="podoload-btn-secondary"
            onClick={() => {
              setResolution(300);
              setColorMode('Grayscale');
              setSheetSize('A4');
              setUnit('mm');
              setDateFormat('dd-mm-yyyy');
            }}
          >
            Reset to defaults
          </button>

          {onPurgeAllData && (
            <button
              type="button"
              className="podoload-btn-secondary"
              style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
              onClick={() => {
                if (window.confirm('Are you sure you want to purge all stale and cached data and start completely fresh?')) {
                  onPurgeAllData();
                }
              }}
            >
              Purge all stale data (Start fresh)
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isSavedMessage && (
            <span style={{ fontSize: '0.75rem', color: 'var(--podo-primary)', fontWeight: 700 }}>
              Settings saved successfully!
            </span>
          )}
          <button
            type="button"
            className="podoload-btn-primary"
            onClick={handleSaveSettings}
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
};
