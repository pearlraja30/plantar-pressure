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
  Edit3,
  Save,
  AlertCircle,
  AlertTriangle,
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

  // Administrative Correction Modal State (Hospital Administrator ONLY)
  const [editingRecord, setEditingRecord] = useState<{
    store: 'patients' | 'cases' | 'technicians' | 'admin_accounts' | 'bound_devices' | 'settings';
    id: string;
    data: any;
    auditReason: string;
    mode: 'form' | 'json';
    jsonText: string;
  } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEditRecord = (
    store: 'patients' | 'cases' | 'technicians' | 'admin_accounts' | 'bound_devices' | 'settings',
    id: string,
    data: any
  ) => {
    setEditError(null);
    setEditSuccess(null);
    setEditingRecord({
      store,
      id,
      data: JSON.parse(JSON.stringify(data)),
      auditReason: '',
      mode: 'form',
      jsonText: JSON.stringify(data, null, 2),
    });
  };

  const handleUpdateFormField = (field: string, value: any) => {
    if (!editingRecord) return;
    const updatedData = { ...editingRecord.data, [field]: value };
    setEditingRecord({
      ...editingRecord,
      data: updatedData,
      jsonText: JSON.stringify(updatedData, null, 2),
    });
  };

  const handleSaveCorrection = async () => {
    if (!editingRecord) return;
    setEditError(null);

    if (!editingRecord.auditReason.trim()) {
      setEditError('21 CFR Part 11 Audit Requirement: Please state a clear reason for this administrative correction.');
      return;
    }

    let payloadToSave: any = editingRecord.data;
    if (editingRecord.mode === 'json') {
      try {
        payloadToSave = JSON.parse(editingRecord.jsonText);
      } catch (err: any) {
        setEditError(`Invalid JSON syntax: ${err?.message || 'Check JSON formatting'}`);
        return;
      }
    }

    setIsSavingEdit(true);
    try {
      const res = await dbService.updateRecordAdmin(
        editingRecord.store,
        editingRecord.id,
        payloadToSave,
        editingRecord.auditReason.trim()
      );

      if (!res.success) {
        setEditError(res.error || 'Failed to save administrative correction to database.');
        setIsSavingEdit(false);
        return;
      }

      setEditSuccess(`✓ Record successfully updated and committed to offline IndexedDB table '${editingRecord.store}'.`);
      await loadDatabaseRecords();
      setTimeout(() => {
        setEditingRecord(null);
        setEditSuccess(null);
        setIsSavingEdit(false);
      }, 1400);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to write correction to database.');
      setIsSavingEdit(false);
    }
  };

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
                            style={{ fontSize: '0.64rem', padding: '0.15rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0f766e', borderColor: '#99f6e4' }}
                            onClick={() => handleOpenEditRecord('patients', p.id, p)}
                            title="Hospital Administrator: Direct table correction"
                          >
                            <Edit3 className="w-3 h-3 text-teal-600" />
                            <span>Correct</span>
                          </button>
                          <button
                            type="button"
                            className="podoload-btn-secondary podoload-btn-sm"
                            style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            onClick={() => setInspectingRecord({ store: 'patients', id: p.mrn || p.id, data: p })}
                            title="Inspect full JSON record"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>Inspect</span>
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
                            style={{ fontSize: '0.64rem', padding: '0.15rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0f766e', borderColor: '#99f6e4' }}
                            onClick={() => handleOpenEditRecord('cases', c.id, c)}
                            title="Hospital Administrator: Direct table correction"
                          >
                            <Edit3 className="w-3 h-3 text-teal-600" />
                            <span>Correct</span>
                          </button>
                          <button
                            type="button"
                            className="podoload-btn-secondary podoload-btn-sm"
                            style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            onClick={() => setInspectingRecord({ store: 'cases', id: c.caseNumber || c.id, data: c })}
                            title="Inspect full examination record payload"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>Inspect</span>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          style={{ fontSize: '0.64rem', padding: '0.15rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0f766e', borderColor: '#99f6e4' }}
                          onClick={() => handleOpenEditRecord('technicians', t.id, t)}
                          title="Hospital Administrator: Direct table correction"
                        >
                          <Edit3 className="w-3 h-3 text-teal-600" />
                          <span>Correct</span>
                        </button>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                          onClick={() => setInspectingRecord({ store: 'technicians', id: t.username, data: t })}
                        >
                          Inspect JSON
                        </button>
                      </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          style={{ fontSize: '0.64rem', padding: '0.15rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0f766e', borderColor: '#99f6e4' }}
                          onClick={() => handleOpenEditRecord('admin_accounts', a.username, a)}
                          title="Hospital Administrator: Direct table correction"
                        >
                          <Edit3 className="w-3 h-3 text-teal-600" />
                          <span>Correct</span>
                        </button>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                          onClick={() => setInspectingRecord({ store: 'admin_accounts', id: a.username, data: a })}
                        >
                          Inspect JSON
                        </button>
                      </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          style={{ fontSize: '0.64rem', padding: '0.15rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0f766e', borderColor: '#99f6e4' }}
                          onClick={() => handleOpenEditRecord('bound_devices', d.id, d)}
                          title="Hospital Administrator: Direct table correction"
                        >
                          <Edit3 className="w-3 h-3 text-teal-600" />
                          <span>Correct</span>
                        </button>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                          onClick={() => setInspectingRecord({ store: 'bound_devices', id: d.id, data: d })}
                        >
                          Inspect JSON
                        </button>
                      </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          style={{ fontSize: '0.64rem', padding: '0.15rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0f766e', borderColor: '#99f6e4' }}
                          onClick={() => handleOpenEditRecord('settings', k, v)}
                          title="Hospital Administrator: Direct table correction"
                        >
                          <Edit3 className="w-3 h-3 text-teal-600" />
                          <span>Correct</span>
                        </button>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          style={{ fontSize: '0.64rem', padding: '0.15rem 0.4rem' }}
                          onClick={() => setInspectingRecord({ store: 'settings', id: k, data: v })}
                        >
                          Inspect JSON
                        </button>
                      </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <button
                  type="button"
                  className="podoload-btn-secondary"
                  onClick={handleCopyRecord}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem' }}
                >
                  {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copySuccess ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
                </button>
                {inspectingRecord.store !== 'audit_logs' && (
                  <button
                    type="button"
                    className="podoload-btn-primary"
                    onClick={() => {
                      const st = inspectingRecord.store as any;
                      const id = inspectingRecord.id;
                      const dt = inspectingRecord.data;
                      setInspectingRecord(null);
                      handleOpenEditRecord(st, id, dt);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem' }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit &amp; Correct Record</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                className="podoload-btn-secondary"
                onClick={() => setInspectingRecord(null)}
                style={{ fontSize: '0.74rem' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 21 CFR Part 11 Administrator Record Correction Modal */}
      {editingRecord && (
        <div
          className="podoload-modal-backdrop"
          onClick={() => {
            if (!isSavingEdit) setEditingRecord(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="podoload-modal-box"
            style={{ maxWidth: '680px', width: '94%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="podoload-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#ccfbf1', color: '#0f766e' }}>
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0c2328' }}>
                    Administrator Table Correction: <code>{editingRecord.store}.{editingRecord.id}</code>
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                    Hospital Administrator Direct Write Privileges · 21 CFR Part 11 Audit Trail Enabled
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="podoload-modal-close-btn"
                onClick={() => {
                  if (!isSavingEdit) setEditingRecord(null);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  className={editingRecord.mode === 'form' ? 'podoload-btn-primary podoload-btn-sm' : 'podoload-btn-secondary podoload-btn-sm'}
                  onClick={() => setEditingRecord({ ...editingRecord, mode: 'form' })}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                >
                  📋 Form View
                </button>
                <button
                  type="button"
                  className={editingRecord.mode === 'json' ? 'podoload-btn-primary podoload-btn-sm' : 'podoload-btn-secondary podoload-btn-sm'}
                  onClick={() => setEditingRecord({ ...editingRecord, mode: 'json' })}
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                >
                  {'{ }'} Raw JSON View
                </button>
              </div>

              <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                Direct Offline Commit
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {editingRecord.mode === 'form' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* STORE: PATIENTS */}
                  {editingRecord.store === 'patients' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Patient Full Name *</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.name || ''}
                          onChange={(e) => handleUpdateFormField('name', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Medical Record Number (MRN) *</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.mrn || ''}
                          onChange={(e) => handleUpdateFormField('mrn', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Mobile / Phone Number *</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.phone || ''}
                          onChange={(e) => handleUpdateFormField('phone', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Gender</label>
                        <select
                          className="podoload-input"
                          value={editingRecord.data.gender || 'Male'}
                          onChange={(e) => handleUpdateFormField('gender', e.target.value)}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Referring Doctor / Clinician</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.referringDoctor || ''}
                          onChange={(e) => handleUpdateFormField('referringDoctor', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Assigned Hospital Facility</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.hospitalName || ''}
                          onChange={(e) => handleUpdateFormField('hospitalName', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="podoload-label">Clinical Indication &amp; Notes</label>
                        <textarea
                          className="podoload-input"
                          rows={2}
                          value={editingRecord.data.clinicalNotes || ''}
                          onChange={(e) => handleUpdateFormField('clinicalNotes', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* STORE: CASES */}
                  {editingRecord.store === 'cases' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Case Accession Number *</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.caseNumber || ''}
                          onChange={(e) => handleUpdateFormField('caseNumber', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Foot Side</label>
                        <select
                          className="podoload-input"
                          value={editingRecord.data.footSide || 'Bilateral'}
                          onChange={(e) => handleUpdateFormField('footSide', e.target.value)}
                        >
                          <option value="Left">Left</option>
                          <option value="Right">Right</option>
                          <option value="Bilateral">Bilateral</option>
                        </select>
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Technician / Operator Name</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.operatorName || ''}
                          onChange={(e) => handleUpdateFormField('operatorName', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Facility / Clinic Name</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.clinicName || ''}
                          onChange={(e) => handleUpdateFormField('clinicName', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="podoload-label">Clinical Indication</label>
                        <textarea
                          className="podoload-input"
                          rows={2}
                          value={editingRecord.data.indication || ''}
                          onChange={(e) => handleUpdateFormField('indication', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* STORE: TECHNICIANS */}
                  {editingRecord.store === 'technicians' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Technician Full Name *</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.name || ''}
                          onChange={(e) => handleUpdateFormField('name', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Login User ID / Username *</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.username || ''}
                          onChange={(e) => handleUpdateFormField('username', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Contact Phone Number</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.phone || ''}
                          onChange={(e) => handleUpdateFormField('phone', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Official Email Address</label>
                        <input
                          type="email"
                          className="podoload-input"
                          value={editingRecord.data.email || ''}
                          onChange={(e) => handleUpdateFormField('email', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Account Status</label>
                        <select
                          className="podoload-input"
                          value={editingRecord.data.status || 'active'}
                          onChange={(e) => handleUpdateFormField('status', e.target.value)}
                        >
                          <option value="active">Active (Permitted)</option>
                          <option value="inactive">Inactive (Disabled)</option>
                        </select>
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Password / PIN</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.pin || ''}
                          onChange={(e) => handleUpdateFormField('pin', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="podoload-label">Administrative Notes</label>
                        <textarea
                          className="podoload-input"
                          rows={2}
                          value={editingRecord.data.notes || ''}
                          onChange={(e) => handleUpdateFormField('notes', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* STORE: ADMIN ACCOUNTS */}
                  {editingRecord.store === 'admin_accounts' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Administrator Full Name *</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.name || ''}
                          onChange={(e) => handleUpdateFormField('name', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Admin Login User ID / Username *</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.username || ''}
                          onChange={(e) => handleUpdateFormField('username', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Mobile / Phone Number</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.phone || ''}
                          onChange={(e) => handleUpdateFormField('phone', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Official Email Address</label>
                        <input
                          type="email"
                          className="podoload-input"
                          value={editingRecord.data.email || ''}
                          onChange={(e) => handleUpdateFormField('email', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* STORE: BOUND DEVICES */}
                  {editingRecord.store === 'bound_devices' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Terminal Station Name *</label>
                        <input
                          type="text"
                          className="podoload-input"
                          value={editingRecord.data.name || ''}
                          onChange={(e) => handleUpdateFormField('name', e.target.value)}
                        />
                      </div>
                      <div className="podoload-form-group">
                        <label className="podoload-label">Binding Status</label>
                        <select
                          className="podoload-input"
                          value={editingRecord.data.status || 'active'}
                          onChange={(e) => handleUpdateFormField('status', e.target.value)}
                        >
                          <option value="active">Active (Authorized)</option>
                          <option value="revoked">Revoked (Unbound)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* STORE: SETTINGS */}
                  {editingRecord.store === 'settings' && (
                    <div className="podoload-form-group">
                      <label className="podoload-label">Configuration Value Payload</label>
                      <textarea
                        className="podoload-input"
                        rows={7}
                        value={editingRecord.jsonText}
                        onChange={(e) => setEditingRecord({ ...editingRecord, jsonText: e.target.value })}
                        style={{ fontFamily: 'monospace', fontSize: '0.74rem' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* RAW JSON VIEW */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <label className="podoload-label">Raw JSON Document Payload</label>
                  <textarea
                    className="podoload-input"
                    rows={12}
                    value={editingRecord.jsonText}
                    onChange={(e) => setEditingRecord({ ...editingRecord, jsonText: e.target.value })}
                    style={{ fontFamily: 'monospace', fontSize: '0.74rem', backgroundColor: '#0f172a', color: '#38bdf8' }}
                  />
                </div>
              )}

              {/* 21 CFR Part 11 Audit Reason Required */}
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#fffbeb',
                  border: '1.5px solid #fcd34d',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e' }}>
                  21 CFR Part 11 Audit Correction Justification *
                </label>
                <input
                  type="text"
                  className="podoload-input"
                  placeholder="e.g. Corrected typo in mobile phone, updated clinician referral, or refreshed MRN"
                  value={editingRecord.auditReason}
                  onChange={(e) => setEditingRecord({ ...editingRecord, auditReason: e.target.value })}
                  style={{ fontSize: '0.76rem' }}
                  required
                />
              </div>

              {editError && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>
                  {editError}
                </div>
              )}

              {editSuccess && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>
                  {editSuccess}
                </div>
              )}
            </div>

            <div className="podoload-modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="podoload-btn-secondary"
                onClick={() => {
                  if (!isSavingEdit) setEditingRecord(null);
                }}
                disabled={isSavingEdit}
                style={{ fontSize: '0.74rem' }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="podoload-btn-primary"
                onClick={handleSaveCorrection}
                disabled={isSavingEdit || Boolean(editSuccess)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem' }}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingEdit ? 'Committing Correction...' : 'Save & Commit Database Correction'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
