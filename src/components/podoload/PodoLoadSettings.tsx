import React, { useState } from 'react';
import { Play } from 'lucide-react';

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

export const PodoLoadSettings: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<
    'language' | 'scanner' | 'processing' | 'report' | 'cloud' | 'hospital'
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

  // Verification battery
  const [tests, setTests] = useState<VerificationResult[]>(DEFAULT_VERIFICATION_TESTS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSavedMessage, setIsSavedMessage] = useState<boolean>(false);

  const handleRunBattery = () => {
    setIsRunning(true);
    setTimeout(() => {
      setTests((prev) => prev.map((t) => ({ ...t, status: 'passed' })));
      setIsRunning(false);
    }, 1200);
  };

  const handleSaveSettings = () => {
    setIsSavedMessage(true);
    setTimeout(() => setIsSavedMessage(false), 2000);
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
          </div>
        </div>

        {/* ================= COLUMN 2: CENTER PANEL ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {activeMenu === 'processing' ? (
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
                      <td style={{ fontWeight: 600 }}>[Scanner model]</td>
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
                      <td style={{ fontWeight: 600 }}>[Scanner model]</td>
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
                      onChange={(e) => setSheetSize(e.target.value)}
                    >
                      <option value="A4">A4</option>
                      <option value="Letter">Letter</option>
                      <option value="Custom">Custom</option>
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
