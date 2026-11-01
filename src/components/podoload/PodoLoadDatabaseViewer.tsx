import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  RefreshCw,
  Download,
  Upload,
  Eye,
  FileText,
  Users,
  ShieldCheck,
  UserCheck,
  Laptop,
  CheckCircle2,
  Copy,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { Patient, AnalysisCase, TechnicianUser, AdminAccount, BoundDevice } from '../../types';

interface PodoLoadDatabaseViewerProps {
  onSelectPatient?: (patient: Patient) => void;
  onSelectReport?: (caseId: string, step?: 4 | 5) => void;
  onOpenSettings?: () => void;
  onOpenAdmin?: () => void;
}

export const PodoLoadDatabaseViewer: React.FC<PodoLoadDatabaseViewerProps> = ({
  onSelectPatient,
  onSelectReport,
  onOpenSettings,
  onOpenAdmin,
}) => {
  // Store Selection: patients | cases | technicians | admin_accounts | bound_devices | audit_logs | settings
  const [activeStore, setActiveStore] = useState<
    'patients' | 'cases' | 'technicians' | 'admin_accounts' | 'bound_devices' | 'audit_logs' | 'settings'
  >('patients');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Loaded database collections
  const [patients, setPatients] = useState<Patient[]>([]);
  const [cases, setCases] = useState<AnalysisCase[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianUser[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [devices, setDevices] = useState<BoundDevice[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<any>(null);

  // Record Inspector Modal State
  const [inspectingRecord, setInspectingRecord] = useState<{
    store: string;
    id: string;
    data: any;
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Load all database collections
  const loadDatabaseRecords = async () => {
    setIsRefreshing(true);
    try {
      const [pats, cs, techs, logs, cfg] = await Promise.all([
        dbService.getAllPatients(),
        dbService.getAllCases(),
        dbService.getTechnicians(),
        dbService.getAuditLogs(),
        dbService.getSettings(),
      ]);

      setPatients(pats || []);
      setCases(cs || []);
      setTechnicians(techs || dbService.getTechniciansSync());
      setAdmins(dbService.getAdminAccountsListSync());
      setDevices(dbService.getBoundDevicesSync());
      setAuditLogs(logs || []);
      setSettingsData(cfg || {});
    } catch (err) {
      console.warn('PodoPress: Failed to load all database tables:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    loadDatabaseRecords();
  }, []);

  // Filtered Records for Active Store
  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    switch (activeStore) {
      case 'patients':
        if (!q) return patients;
        return patients.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.mrn.toLowerCase().includes(q) ||
            (p.phone && p.phone.toLowerCase().includes(q)) ||
            (p.referringDoctor && p.referringDoctor.toLowerCase().includes(q)) ||
            (p.hospitalName && p.hospitalName.toLowerCase().includes(q))
        );

      case 'cases':
        if (!q) return cases;
        return cases.filter(
          (c) =>
            c.caseNumber.toLowerCase().includes(q) ||
            c.patientId.toLowerCase().includes(q) ||
            c.footSide.toLowerCase().includes(q) ||
            (c.operatorName && c.operatorName.toLowerCase().includes(q)) ||
            (c.syncStatus && c.syncStatus.toLowerCase().includes(q))
        );

      case 'technicians':
        if (!q) return technicians;
        return technicians.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.username.toLowerCase().includes(q) ||
            (t.hospitalName && t.hospitalName.toLowerCase().includes(q)) ||
            (t.email && t.email.toLowerCase().includes(q))
        );

      case 'admin_accounts':
        if (!q) return admins;
        return admins.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.username.toLowerCase().includes(q) ||
            a.hospitalName.toLowerCase().includes(q)
        );

      case 'bound_devices':
        if (!q) return devices;
        return devices.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.id.toLowerCase().includes(q) ||
            d.platform.toLowerCase().includes(q)
        );

      case 'audit_logs':
        if (!q) return auditLogs;
        return auditLogs.filter(
          (l) =>
            (l.action && l.action.toLowerCase().includes(q)) ||
            (l.userId && l.userId.toLowerCase().includes(q)) ||
            (l.details && l.details.toLowerCase().includes(q))
        );

      case 'settings': {
        const entries = settingsData ? Object.entries(settingsData) : [];
        if (!q) return entries;
        return entries.filter(
          ([k, v]) =>
            k.toLowerCase().includes(q) ||
            JSON.stringify(v).toLowerCase().includes(q)
        );
      }

      default:
        return [];
    }
  }, [activeStore, searchQuery, patients, cases, technicians, admins, devices, auditLogs, settingsData]);

  // Export Database Backup JSON
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

  // Import Database Backup JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      const ok = await dbService.importDatabaseBackup(content);
      if (ok) {
        setImportStatus('Database successfully restored from backup!');
        await loadDatabaseRecords();
        setTimeout(() => setImportStatus(null), 3500);
      } else {
        alert('Failed to import database backup. Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  // Copy record JSON
  const handleCopyRecord = () => {
    if (!inspectingRecord) return;
    navigator.clipboard.writeText(JSON.stringify(inspectingRecord.data, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
      {/* Top Header Card */}
      <div
        className="podoload-card"
        style={{
          padding: '0.85rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ccfbf1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f766e',
            }}
          >
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0c2328', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>Inbuilt Database Records Explorer</span>
              <span className="podo-badge podo-badge-green" style={{ fontSize: '0.64rem' }}>
                PodoPressDB v1 (IndexedDB)
              </span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
              Direct access to check, inspect, search, and audit all clinical data records stored in the offline database.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="podoload-btn-secondary podoload-btn-sm"
            onClick={loadDatabaseRecords}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
            title="Reload latest records from IndexedDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Records'}</span>
          </button>

          <button
            type="button"
            className="podoload-btn-secondary podoload-btn-sm"
            onClick={handleExportBackup}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
            title="Download full database JSON backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup (JSON)</span>
          </button>

          <label
            className="podoload-btn-secondary podoload-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', cursor: 'pointer', margin: 0 }}
            title="Restore database from JSON backup file"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Backup</span>
            <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {importStatus && (
        <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', color: '#166534', fontSize: '0.74rem' }}>
          ✓ {importStatus}
        </div>
      )}

      {/* Database Summary Metric Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
        <div style={{ padding: '0.45rem 0.65rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>PATIENTS</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0c2328' }}>{patients.length}</div>
        </div>
        <div style={{ padding: '0.45rem 0.65rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>CLINICAL EXAMS</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f766e' }}>{cases.length}</div>
        </div>
        <div style={{ padding: '0.45rem 0.65rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>TECHNICIANS</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0284c7' }}>{technicians.length}</div>
        </div>
        <div style={{ padding: '0.45rem 0.65rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>ADMIN ACCOUNTS</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d' }}>{admins.length}</div>
        </div>
        <div style={{ padding: '0.45rem 0.65rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>BOUND STATIONS</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#7c3aed' }}>{devices.length}</div>
        </div>
        <div style={{ padding: '0.45rem 0.65rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>AUDIT LOGS</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#b45309' }}>{auditLogs.length}</div>
        </div>
      </div>

      {/* Main Database Table Explorer Card */}
      <div className="podoload-card" style={{ padding: '0.85rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Store Tabs & Live Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
          {/* Store Tabs */}
          <div className="podoload-segmented-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {[
              { id: 'patients', label: `patients (${patients.length})`, icon: Users },
              { id: 'cases', label: `cases (${cases.length})`, icon: FileText },
              { id: 'technicians', label: `technicians (${technicians.length})`, icon: UserCheck },
              { id: 'admin_accounts', label: `admin_accounts (${admins.length})`, icon: ShieldCheck },
              { id: 'bound_devices', label: `bound_devices (${devices.length})`, icon: Laptop },
              { id: 'audit_logs', label: `audit_logs (${auditLogs.length})`, icon: CheckCircle2 },
              { id: 'settings', label: 'settings', icon: Database },
            ].map((tab) => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`podoload-seg-btn ${activeStore === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveStore(tab.id as any);
                    setSearchQuery('');
                  }}
                  style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.55rem' }}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Table Search Input */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="podoload-input"
              placeholder={`Filter ${activeStore}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.74rem', paddingLeft: '1.8rem', height: '30px' }}
            />
          </div>
        </div>

        {/* Store Information Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
          <div>
            Showing <strong>{filteredData.length}</strong> records in store <code>{activeStore}</code>
            {searchQuery && <span> matching "<strong>{searchQuery}</strong>"</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.62rem' }}>
              IndexedDB Store: {activeStore}
            </span>
          </div>
        </div>

        {/* Table Records Grid */}
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '55vh', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          {/* 1. PATIENTS STORE */}
          {activeStore === 'patients' && (
            <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>PATIENT ID / MRN</th>
                  <th style={{ textAlign: 'left' }}>PATIENT NAME</th>
                  <th style={{ textAlign: 'left' }}>AGE / GENDER</th>
                  <th style={{ textAlign: 'left' }}>CONTACT</th>
                  <th style={{ textAlign: 'left' }}>HOSPITAL FACILITY</th>
                  <th style={{ textAlign: 'left' }}>REGISTERED DATE</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                      No patient records found in database.
                    </td>
                  </tr>
                ) : (
                  (filteredData as Patient[]).map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>
                        <span className="podo-badge podo-badge-green" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                          {p.mrn || p.id}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0c2328' }}>{p.name}</td>
                      <td>
                        {p.dateOfBirth
                          ? `${Math.max(1, new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear())}y`
                          : '—'}{' '}
                        · {p.gender || '—'}
                      </td>
                      <td>{p.phone || '—'}</td>
                      <td>
                        <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.62rem' }}>
                          {p.hospitalName || 'Clinic'}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="podoload-btn-secondary podoload-btn-sm"
                            style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            onClick={() => setInspectingRecord({ store: 'patients', id: p.mrn || p.id, data: p })}
                            title="Inspect full JSON record"
                          >
                            <Eye className="w-3 h-3 text-teal-600" />
                            <span>Inspect JSON</span>
                          </button>
                          {onSelectPatient && (
                            <button
                              type="button"
                              className="podoload-btn-primary podoload-btn-sm"
                              style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                              onClick={() => onSelectPatient(p)}
                              title="Open this patient profile in registration"
                            >
                              Open
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 2. CASES STORE (REPORTS & SCANS) */}
          {activeStore === 'cases' && (
            <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>CASE / ACCESSION #</th>
                  <th style={{ textAlign: 'left' }}>PATIENT</th>
                  <th style={{ textAlign: 'left' }}>FOOT SIDE</th>
                  <th style={{ textAlign: 'left' }}>CAVANAGH ARCH INDEX</th>
                  <th style={{ textAlign: 'left' }}>PEAK PRESSURE</th>
                  <th style={{ textAlign: 'left' }}>EXAM DATE</th>
                  <th style={{ textAlign: 'center' }}>SYNC</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                      No clinical exam cases found in database.
                    </td>
                  </tr>
                ) : (
                  (filteredData as AnalysisCase[]).map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700 }}>
                        <span className="podo-badge podo-badge-green" style={{ fontSize: '0.68rem' }}>
                          {c.caseNumber || c.id}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {patients.find((p) => p.id === c.patientId || p.mrn === c.patientId)?.name || 'Clinical Patient'}
                        </strong>
                        <div style={{ fontSize: '0.64rem', color: '#64748b' }}>{c.patientId}</div>
                      </td>
                      <td>
                        <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.64rem' }}>
                          {c.footSide || 'Bilateral'}
                        </span>
                      </td>
                      <td>
                        {c.regionalAnalysis?.cavanaghArchIndex !== undefined ? (
                          <span>
                            <strong>{c.regionalAnalysis.cavanaghArchIndex.toFixed(2)}</strong> (
                            {c.regionalAnalysis.archClassification || 'Normative'})
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className="podo-badge podo-badge-green" style={{ fontSize: '0.64rem' }}>
                          {c.regionalAnalysis?.peakContactCategory || 'C4 (Normal)'}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="podo-badge podo-badge-green" style={{ fontSize: '0.6rem' }}>
                          {c.syncStatus || 'local safe'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="podoload-btn-secondary podoload-btn-sm"
                            style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            onClick={() => setInspectingRecord({ store: 'cases', id: c.caseNumber || c.id, data: c })}
                            title="Inspect full examination record payload"
                          >
                            <Eye className="w-3 h-3 text-teal-600" />
                            <span>Inspect JSON</span>
                          </button>
                          {onSelectReport && (
                            <button
                              type="button"
                              className="podoload-btn-primary podoload-btn-sm"
                              style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                              onClick={() => onSelectReport(c.id, 5)}
                              title="Open report in Viewer"
                            >
                              Report
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 3. TECHNICIANS STORE */}
          {activeStore === 'technicians' && (
            <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>TECHNICIAN NAME</th>
                  <th style={{ textAlign: 'left' }}>LOGIN USERNAME</th>
                  <th style={{ textAlign: 'left' }}>ASSIGNED HOSPITAL</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'left' }}>PASSWORD</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {(filteredData as TechnicianUser[]).map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700, color: '#0c2328' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>{t.name}</span>
                      </div>
                    </td>
                    <td>
                      <code>{t.username}</code>
                    </td>
                    <td>{t.hospitalName || 'Clinic'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`podo-badge ${t.status === 'active' ? 'podo-badge-green' : 'podo-badge-gray'}`} style={{ fontSize: '0.62rem' }}>
                        {t.status === 'active' ? '✓ Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <code>{t.pin || '••••••••'}</code>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="podoload-btn-secondary podoload-btn-sm"
                        style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                        onClick={() => setInspectingRecord({ store: 'technicians', id: t.username, data: t })}
                      >
                        Inspect JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 4. ADMIN ACCOUNTS STORE */}
          {activeStore === 'admin_accounts' && (
            <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>ADMINISTRATOR NAME</th>
                  <th style={{ textAlign: 'left' }}>LOGIN USERNAME / EMAIL</th>
                  <th style={{ textAlign: 'left' }}>FACILITY</th>
                  <th style={{ textAlign: 'left' }}>PHONE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {(filteredData as AdminAccount[]).map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 700, color: '#0c2328' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>{a.name}</span>
                      </div>
                    </td>
                    <td>
                      <code>{a.username}</code>
                    </td>
                    <td>{a.hospitalName}</td>
                    <td>{a.phone || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                        Active
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="podoload-btn-secondary podoload-btn-sm"
                        style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                        onClick={() => setInspectingRecord({ store: 'admin_accounts', id: a.username, data: a })}
                      >
                        Inspect JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 5. BOUND DEVICES STORE */}
          {activeStore === 'bound_devices' && (
            <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>DEVICE ID</th>
                  <th style={{ textAlign: 'left' }}>TERMINAL STATION NAME</th>
                  <th style={{ textAlign: 'left' }}>PLATFORM</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'left' }}>BOUND AT</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {(filteredData as BoundDevice[]).map((d) => (
                  <tr key={d.id}>
                    <td>
                      <code>{d.id}</code>
                    </td>
                    <td style={{ fontWeight: 700, color: '#0c2328' }}>{d.name}</td>
                    <td>{d.platform}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`podo-badge ${d.status === 'active' ? 'podo-badge-green' : 'podo-badge-gray'}`} style={{ fontSize: '0.62rem' }}>
                        {d.status === 'active' ? '● Bound Active' : 'Revoked'}
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{new Date(d.boundAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="podoload-btn-secondary podoload-btn-sm"
                        style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                        onClick={() => setInspectingRecord({ store: 'bound_devices', id: d.id, data: d })}
                      >
                        Inspect JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 6. AUDIT LOGS STORE */}
          {activeStore === 'audit_logs' && (
            <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>TIMESTAMP</th>
                  <th style={{ textAlign: 'left' }}>USER</th>
                  <th style={{ textAlign: 'left' }}>ACTION</th>
                  <th style={{ textAlign: 'left' }}>DETAILS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  (filteredData as any[]).map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td style={{ color: '#64748b' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                      </td>
                      <td>
                        <strong>{log.userId || 'system'}</strong>
                      </td>
                      <td>
                        <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                          onClick={() => setInspectingRecord({ store: 'audit_logs', id: log.id || `log-${idx}`, data: log })}
                        >
                          Inspect JSON
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 7. SETTINGS KEY-VALUE STORE */}
          {activeStore === 'settings' && (
            <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>CONFIG KEY</th>
                  <th style={{ textAlign: 'left' }}>VALUE SUMMARY</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {((filteredData as [string, any][]) || []).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ fontWeight: 700, color: '#0f766e' }}>
                      <code>{k}</code>
                    </td>
                    <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="podoload-btn-secondary podoload-btn-sm"
                        style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                        onClick={() => setInspectingRecord({ store: 'settings', id: k, data: v })}
                      >
                        Inspect JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Record Inspection Modal */}
      {inspectingRecord && (
        <div
          className="podoload-modal-backdrop"
          onClick={() => setInspectingRecord(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="podoload-modal-box"
            style={{ maxWidth: '680px', width: '92%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="podoload-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0c2328' }}>
                    Record Inspector: <code>{inspectingRecord.store}.{inspectingRecord.id}</code>
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                    Structured JSON data payload from offline IndexedDB
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="podoload-modal-close-btn"
                onClick={() => setInspectingRecord(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>
              <pre
                style={{
                  margin: 0,
                  padding: '0.75rem',
                  backgroundColor: '#0f172a',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  lineHeight: 1.45,
                  maxHeight: '52vh',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(inspectingRecord.data, null, 2)}
              </pre>
            </div>

            <div className="podoload-modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="podoload-btn-secondary"
                onClick={handleCopyRecord}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem' }}
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copySuccess ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
              </button>

              <button
                type="button"
                className="podoload-btn-primary"
                onClick={() => setInspectingRecord(null)}
                style={{ fontSize: '0.74rem' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
