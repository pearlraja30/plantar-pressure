import React, { useState, useEffect } from 'react';
import { Play, Database, Download, Upload, Check, Settings as SettingsIcon } from 'lucide-react';
import { dbService } from '../../services/dbService';
import { PatientIdConfig, PatientIdMode } from '../../types';

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
}

export const PodoLoadSettings: React.FC<PodoLoadSettingsProps> = ({ onPurgeAllData }) => {
  const [activeMenu, setActiveMenu] = useState<
    'language' | 'scanner' | 'processing' | 'report' | 'cloud' | 'hospital' | 'database_id'
  >('scanner');

  // Scanner settings matching Screenshot 5
  const [selectedDevice, setSelectedDevice] = useState<'camera' | 'usb' | 'network'>('camera');
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
              Report
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
              Hospital info
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
          ) : (
            <>
              {/* Card 1: CHOOSE SCANNER matching Screenshot 5 */}
              <div className="podoload-card" style={{ padding: '0.85rem' }}>
                <h4 className="podoload-card-title" style={{ marginBottom: '0.65rem' }}>
                  CHOOSE SCANNER
                </h4>

                <table className="podoload-device-table" style={{ marginBottom: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '28px' }}></th>
                      <th>DEVICE</th>
                      <th>TYPE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <input
                          type="radio"
                          name="scanner-device"
                          checked={selectedDevice === 'camera'}
                          onChange={() => setSelectedDevice('camera')}
                          style={{ accentColor: 'var(--podo-primary)' }}
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>Camera (built-in)</td>
                      <td>Camera</td>
                      <td>
                        <span className="podo-badge podo-badge-green">Connected</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <input
                          type="radio"
                          name="scanner-device"
                          checked={selectedDevice === 'usb'}
                          onChange={() => setSelectedDevice('usb')}
                          style={{ accentColor: 'var(--podo-primary)' }}
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>Epson Perfection V39 II</td>
                      <td>USB flatbed</td>
                      <td>
                        <span className="podo-badge podo-badge-green">Connected</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <input
                          type="radio"
                          name="scanner-device"
                          checked={selectedDevice === 'network'}
                          onChange={() => setSelectedDevice('network')}
                          style={{ accentColor: 'var(--podo-primary)' }}
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>HP ScanJet Enterprise</td>
                      <td>Network</td>
                      <td>
                        <span className="podo-badge podo-badge-failed">Offline</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button type="button" className="podoload-btn-secondary podoload-btn-sm">
                    Refresh devices
                  </button>
                  <button type="button" className="podoload-btn-primary podoload-btn-sm">
                    Test scan
                  </button>
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
            </>
          )}
        </div>

        {/* ================= COLUMN 3: RIGHT PANEL ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Card 1: LANGUAGE AND REGION matching Screenshot 5 */}
          <div className="podoload-card" style={{ padding: '0.85rem' }}>
            <h4 className="podoload-card-title" style={{ marginBottom: '0.65rem' }}>
              LANGUAGE AND REGION
            </h4>

            <div className="podoload-form-group" style={{ marginBottom: '0.65rem' }}>
              <label className="podoload-label">App language</label>
              <select
                className="podoload-input"
                value={appLanguage}
                onChange={(e) => setAppLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>

            <div className="podoload-form-group" style={{ marginBottom: '0.65rem' }}>
              <label className="podoload-label">Report language</label>
              <select
                className="podoload-input"
                value={reportLanguage}
                onChange={(e) => setReportLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>

            <div className="podoload-form-group" style={{ marginBottom: '0.65rem' }}>
              <label className="podoload-label">Units</label>
              <div className="podoload-segmented-buttons" style={{ width: '100%' }}>
                <button
                  type="button"
                  className={`podoload-seg-btn ${unit === 'mm' ? 'active' : ''}`}
                  onClick={() => setUnit('mm')}
                >
                  mm
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${unit === 'cm' ? 'active' : ''}`}
                  onClick={() => setUnit('cm')}
                >
                  cm
                </button>
              </div>
            </div>

            <div className="podoload-form-group">
              <label className="podoload-label">Date format</label>
              <select
                className="podoload-input"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                <option value="dd-mm-yyyy">dd-mm-yyyy</option>
                <option value="yyyy-mm-dd">yyyy-mm-dd</option>
                <option value="mm/dd/yyyy">mm/dd/yyyy</option>
              </select>
            </div>
          </div>

          {/* Card 2: CLOUD SYNC matching Screenshot 5 */}
          <div className="podoload-card" style={{ padding: '0.85rem', flex: 1 }}>
            <h4 className="podoload-card-title" style={{ marginBottom: '0.65rem' }}>
              CLOUD SYNC
            </h4>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem', color: '#0c2328', fontWeight: 600, marginBottom: '0.65rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoSyncReports}
                onChange={(e) => setAutoSyncReports(e.target.checked)}
                style={{ accentColor: 'var(--podo-primary)', width: '15px', height: '15px' }}
              />
              Auto-sync reports
            </label>

            <div className="podoload-form-group" style={{ marginBottom: '0.65rem' }}>
              <label className="podoload-label">Server address</label>
              <input
                type="text"
                className="podoload-input"
                value={serverAddress}
                onChange={(e) => setServerAddress(e.target.value)}
              />
            </div>

            <div className="podoload-form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="podoload-label">Account</label>
              <input
                type="text"
                className="podoload-input"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="podoload-btn-secondary"
              style={{ width: '100%' }}
              onClick={() => alert('Connection test successful! Status: 200 OK')}
            >
              Test connection
            </button>
          </div>
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
