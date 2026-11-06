import React, { useState } from 'react';
import { CheckCircle, Cloud, Radio, RefreshCw, Server, X, Database, Download, Copy, ExternalLink, ShieldAlert } from 'lucide-react';
import { CloudSyncStatus, cloudSyncService, RemoteStationRecord } from '../../services/cloudSyncService';
import { dbService } from '../../services/dbService';
import { AnalysisCase, Patient } from '../../types';

interface PodoLoadCloudRecordsProps {
  cloudStatus: CloudSyncStatus;
  onRefreshCloud: () => void;
  cases: AnalysisCase[];
  patients: Patient[];
  onSelectCase: (caseId: string) => void;
  onReloadCases?: () => void;
}

interface ReportRow {
  id: string;
  reportNo: string;
  patientName: string;
  patientId: string;
  technician: string;
  technicianId?: string;
  date: string;
  cloudStatus: 'Synced' | 'Pending' | 'Failed';
}

export const PodoLoadCloudRecords: React.FC<PodoLoadCloudRecordsProps> = ({
  cloudStatus,
  onRefreshCloud,
  cases,
  patients,
  onSelectCase,
  onReloadCases,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [technicianFilter, setTechnicianFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [connTestResult, setConnTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({ status: 'idle' });
  const [remoteStations, setRemoteStations] = useState<RemoteStationRecord[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState<boolean>(false);
  const [showStationsModal, setShowStationsModal] = useState<boolean>(false);
  const [isPullingCases, setIsPullingCases] = useState<boolean>(false);
  const [pullMessage, setPullMessage] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const techniciansList = dbService.getTechniciansSync();

  const handleTestConnection = async () => {
    setConnTestResult({ status: 'testing', message: 'Testing Supabase connection...' });
    const res = await cloudSyncService.testConnection();
    if (res.success) {
      setConnTestResult({ status: 'success', message: res.message });
    } else {
      setConnTestResult({ status: 'error', message: res.message });
    }
  };

  const handleLoadRemoteStations = async () => {
    setIsLoadingStations(true);
    setShowStationsModal(true);
    const list = await cloudSyncService.fetchRemoteStations();
    setRemoteStations(list);
    setIsLoadingStations(false);
  };

  const handlePullCloudCases = async () => {
    setIsPullingCases(true);
    setPullMessage(null);
    try {
      const res = await cloudSyncService.pullRemoteCases();
      if (res.success) {
        setPullMessage(`✓ Pulled and synchronized ${res.count} examination case(s) from Supabase Cloud.`);
        onReloadCases?.();
        onRefreshCloud();
      } else {
        setPullMessage(`Failed: ${res.error || 'Could not pull remote cases'}`);
      }
    } catch (e) {
      setPullMessage(`Error: ${(e as Error).message}`);
    } finally {
      setIsPullingCases(false);
      setTimeout(() => setPullMessage(null), 5000);
    }
  };

  const handleRevokeRemoteStation = async (fingerprint: string) => {
    if (!confirm(`Are you sure you want to revoke workstation authorization for station ${fingerprint}? The remote terminal will be locked out.`)) return;
    const config = cloudSyncService.getConfig();
    try {
      await fetch(`${config.url}/rest/v1/station_activations?device_fingerprint=eq.${encodeURIComponent(fingerprint)}`, {
        method: 'PATCH',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'revoked' }),
      });
      handleLoadRemoteStations();
    } catch (e) {
      alert(`Error revoking station: ${(e as Error).message}`);
    }
  };

  // Computed sync metrics from real cases
  const totalCount = cases.length;
  const syncedCount = cases.filter((c) => c.syncStatus === 'synced').length;
  const pendingCases = cases.filter((c) => c.syncStatus !== 'synced');
  const progressPct = totalCount > 0 ? Math.round((syncedCount / totalCount) * 100) : 100;

  // Map only real cases created in the system (fresh data only, zero mock records)
  const allReports: ReportRow[] = cases.map((c) => {
    const pat = patients.find((p) => p.id === c.patientId);
    return {
      id: c.id,
      reportNo: c.caseNumber || 'RPT-' + c.id.substring(0, 5).toUpperCase(),
      patientName: pat?.name || 'Clinical Patient',
      patientId: pat?.mrn || '00000',
      technician: c.technicianName || c.operatorName || 'Specialist',
      technicianId: c.technicianId,
      date: new Date(c.createdAt).toLocaleDateString(),
      cloudStatus: c.syncStatus === 'synced' ? 'Synced' : 'Pending',
    };
  });

  const displayReports = allReports.filter((r) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match =
        r.patientName.toLowerCase().includes(term) ||
        r.patientId.toLowerCase().includes(term) ||
        r.reportNo.toLowerCase().includes(term) ||
        r.technician.toLowerCase().includes(term);
      if (!match) return false;
    }
    if (statusFilter !== 'All' && r.cloudStatus !== statusFilter) return false;
    if (technicianFilter !== 'All' && r.technician !== technicianFilter && r.technicianId !== technicianFilter) return false;
    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(displayReports.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await dbService.syncAllPendingCases();
    await cloudSyncService.processQueue();
    onRefreshCloud();
    setTimeout(() => setIsSyncing(false), 900);
  };

  const handleExportSelected = (type: 'PDF' | 'CSV' | 'ZIP') => {
    alert(`Exporting ${selectedIds.length || displayReports.length} reports as ${type}...`);
  };

  return (
    <div className="podoload-cloud-reports-layout">
      {/* Top Filter Card: SEARCH REPORTS matching Screenshot 4 */}
      <div className="podoload-card podoload-search-reports-card">
        <h4 className="podoload-card-title" style={{ margin: 0 }}>
          SEARCH REPORTS
        </h4>

        <div className="podoload-search-reports-row">
          <div className="podoload-form-group" style={{ flex: 1.5, minWidth: '180px' }}>
            <label className="podoload-label">Name, ID or mobile</label>
            <input
              type="text"
              className="podoload-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="podoload-form-group" style={{ width: '130px' }}>
            <label className="podoload-label">From</label>
            <input
              type="text"
              className="podoload-input"
              placeholder="dd-mm-yyyy"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="podoload-form-group" style={{ width: '130px' }}>
            <label className="podoload-label">To</label>
            <input
              type="text"
              className="podoload-input"
              placeholder="dd-mm-yyyy"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="podoload-form-group" style={{ width: '130px' }}>
            <label className="podoload-label">Cloud status</label>
            <select
              className="podoload-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Synced">Synced</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div className="podoload-form-group" style={{ width: '150px' }}>
            <label className="podoload-label">Technician</label>
            <select
              className="podoload-input"
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
            >
              <option value="All">All Technicians</option>
              {techniciansList.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="podoload-btn-primary"
            style={{ marginBottom: '2px' }}
          >
            Search
          </button>

          <button
            type="button"
            className="podoload-btn-secondary"
            style={{ marginBottom: '2px' }}
            onClick={() => {
              setSearchTerm('');
              setFromDate('');
              setToDate('');
              setStatusFilter('All');
              setTechnicianFilter('All');
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid: Reports Table (Left) & Cloud Sync Panel (Right) */}
      <div className="podoload-cloud-reports-grid">
        {/* ================= LEFT COLUMN: REPORTS TABLE ================= */}
        <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column' }}>
          {/* Top Selected Count & Export Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2328' }}>
              {selectedIds.length} selected
            </span>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => handleExportSelected('PDF')}
              >
                Export PDF
              </button>
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => handleExportSelected('CSV')}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={() => handleExportSelected('ZIP')}
              >
                Export ZIP
              </button>
            </div>
          </div>

          {/* Table matching Screenshot 4 */}
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table className="podoload-metrics-table" style={{ width: '100%', fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '32px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === displayReports.length && displayReports.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      style={{ accentColor: 'var(--podo-primary)' }}
                    />
                  </th>
                  <th style={{ textAlign: 'left' }}>REPORT NO.</th>
                  <th style={{ textAlign: 'left' }}>PATIENT</th>
                  <th style={{ textAlign: 'left' }}>ID</th>
                  <th style={{ textAlign: 'left' }}>TECHNICIAN</th>
                  <th style={{ textAlign: 'left' }}>DATE</th>
                  <th style={{ textAlign: 'left' }}>CLOUD</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {displayReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#657e84', fontSize: '0.78rem' }}>
                      No archived exam reports found. Complete an exam and click "Save to archive" to sync reports here.
                    </td>
                  </tr>
                ) : (
                  displayReports.map((row) => {
                    const isChecked = selectedIds.includes(row.id);
                    return (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRow(row.id)}
                            style={{ accentColor: 'var(--podo-primary)' }}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: '#0c2328' }}>{row.reportNo}</td>
                        <td style={{ color: '#0c2328' }}>{row.patientName}</td>
                        <td>{row.patientId}</td>
                        <td style={{ color: '#0c2328' }}>
                          <span style={{ fontSize: '0.73rem', fontWeight: 500, color: '#134e4a' }}>
                            👤 {row.technician}
                          </span>
                        </td>
                        <td>{row.date}</td>
                        <td>
                          <span
                            className={`podo-badge ${
                              row.cloudStatus === 'Synced'
                                ? 'podo-badge-green'
                                : row.cloudStatus === 'Pending'
                                ? 'podo-badge-pending'
                                : 'podo-badge-failed'
                            }`}
                          >
                            {row.cloudStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="podo-link-btn"
                            onClick={() => onSelectCase(row.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="podo-link-btn"
                            style={{ margin: '0 0.35rem' }}
                            onClick={() => window.print()}
                          >
                            Print
                          </button>
                          <button
                            type="button"
                            className="podo-link-btn"
                            onClick={() => handleExportSelected('PDF')}
                          >
                            Export
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#556f75', marginTop: '0.75rem' }}>
            Showing 1–{displayReports.length} of {displayReports.length} reports
          </div>
        </div>

        {/* ================= RIGHT COLUMN: CLOUD SYNC & UPLOAD QUEUE ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Card 1: CLOUD SYNC */}
          <div className="podoload-card" style={{ padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 className="podoload-card-title" style={{ margin: 0 }}>
                CLOUD SYNC
              </h4>
              <span className="podo-badge podo-badge-green">
                {cloudStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#3d585e', marginBottom: '0.35rem' }}>
              Overall progress
              <span style={{ float: 'right', fontWeight: 700, color: '#0c2328' }}>
                {syncedCount} of {totalCount} uploaded
              </span>
            </div>

            <div className="podoload-progress-track" style={{ marginBottom: '0.85rem' }}>
              <div className="podoload-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                className="podoload-btn-primary"
                style={{ flex: 1 }}
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                {isSyncing ? 'Syncing...' : 'Sync now'}
              </button>

              <button
                type="button"
                className="podoload-btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>

          {/* Card 2: UPLOAD QUEUE */}
          <div className="podoload-card podoload-upload-queue-card" style={{ padding: '0.85rem', flex: 1 }}>
            <h4 className="podoload-card-title" style={{ margin: 0 }}>
              UPLOAD QUEUE
            </h4>

            {pendingCases.length > 0 ? (
              pendingCases.slice(0, 3).map((c) => {
                const pat = patients.find((p) => p.id === c.patientId);
                return (
                  <div key={c.id} className="podoload-queue-item">
                    <div className="podoload-queue-item-header">
                      <span>{c.caseNumber || 'RPT'} · {pat?.name || 'Clinical Patient'}</span>
                      <span className="podo-badge podo-badge-pending">Queued</span>
                    </div>
                    <div className="podoload-progress-track">
                      <div className="podoload-progress-fill" style={{ width: '45%' }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '1.75rem 0.5rem', color: '#657e84', fontSize: '0.74rem' }}>
                <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                Queue clear · All records synchronized
              </div>
            )}

            {pendingCases.length > 0 && (
              <button
                type="button"
                className="podoload-btn-secondary"
                style={{ width: '100%', marginTop: '0.25rem' }}
                onClick={handleSyncNow}
              >
                Sync pending queue
              </button>
            )}

            {/* Caption */}
            <p style={{ fontSize: '0.68rem', color: '#657e84', margin: 0, marginTop: 'auto', lineHeight: 1.35 }}>
              Reports save locally when offline and upload automatically when the connection returns.
            </p>
          </div>

          {/* Card 3: SUPABASE CLOUD MAILBOX (Zero DevOps / Free Tier) */}
          <div className="podoload-card" style={{ padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Cloud className="w-4 h-4 text-emerald-600" />
                <h4 className="podoload-card-title" style={{ margin: 0 }}>
                  SUPABASE MAILBOX
                </h4>
              </div>
              <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                Free Tier Active
              </span>
            </div>

            <div style={{ fontSize: '0.7rem', color: '#475569', lineHeight: 1.4, marginBottom: '0.5rem' }}>
              <div>Endpoint: <code style={{ fontSize: '0.68rem', color: '#0f766e' }}>yqfbhxtvrpfyzygzuqts.supabase.co</code></div>
              <div>Key: <code style={{ fontSize: '0.68rem', color: '#64748b' }}>sb_publishable_...yMu</code></div>
            </div>

            {connTestResult.status !== 'idle' && (
              <div
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  marginBottom: '0.6rem',
                  backgroundColor: connTestResult.status === 'success' ? '#f0fdf4' : connTestResult.status === 'testing' ? '#f8fafc' : '#fef2f2',
                  color: connTestResult.status === 'success' ? '#166534' : connTestResult.status === 'testing' ? '#334155' : '#991b1b',
                  border: `1px solid ${connTestResult.status === 'success' ? '#bbf7d0' : connTestResult.status === 'testing' ? '#e2e8f0' : '#fecaca'}`,
                }}
              >
                {connTestResult.message}
              </div>
            )}

            {pullMessage && (
              <div
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  marginBottom: '0.6rem',
                  backgroundColor: pullMessage.startsWith('✓') ? '#f0fdf4' : '#fef2f2',
                  color: pullMessage.startsWith('✓') ? '#166534' : '#991b1b',
                  border: `1px solid ${pullMessage.startsWith('✓') ? '#bbf7d0' : '#fecaca'}`,
                }}
              >
                {pullMessage}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginBottom: '0.45rem' }}>
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                style={{ fontSize: '0.68rem', padding: '0.35rem 0.4rem' }}
                onClick={handleTestConnection}
                disabled={connTestResult.status === 'testing'}
              >
                {connTestResult.status === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                style={{ fontSize: '0.68rem', padding: '0.35rem 0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                onClick={handleLoadRemoteStations}
              >
                <Radio className="w-3 h-3 text-emerald-600" />
                <span>Remote Stations</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.45rem' }}>
              <button
                type="button"
                className="podoload-btn-primary podoload-btn-sm"
                style={{ fontSize: '0.68rem', padding: '0.35rem 0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                onClick={handlePullCloudCases}
                disabled={isPullingCases}
                title="Pull and restore examination cases uploaded from other workstations to this offline station"
              >
                <Download className={`w-3 h-3 ${isPullingCases ? 'animate-bounce' : ''}`} />
                <span>{isPullingCases ? 'Pulling...' : 'Pull Cloud Cases'}</span>
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                style={{ fontSize: '0.68rem', padding: '0.35rem 0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderColor: '#14b8a6', color: '#0f766e' }}
                onClick={() => setShowSqlModal(true)}
                title="View and copy Supabase SQL script to automatically create database tables and storage"
              >
                <Database className="w-3 h-3" />
                <span>SQL Setup</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* REMOTE STATIONS MODAL */}
      {showStationsModal && (
        <div className="podoload-modal-backdrop" style={{ zIndex: 9999 }}>
          <div className="podoload-modal-card" style={{ maxWidth: '780px', width: '92%' }}>
            <div className="podoload-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="podoload-modal-title" style={{ margin: 0, fontSize: '0.96rem' }}>
                    Remote Stations Feed (Supabase Mailbox)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                    Active Windows PCs, Android terminals &amp; iOS diagnostic stations registered across clinics
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="podoload-modal-close-btn"
                onClick={() => setShowStationsModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ padding: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                  {remoteStations.length} Remote Station(s) Enrolled
                </span>
                <button
                  type="button"
                  className="podoload-btn-secondary podoload-btn-sm"
                  onClick={handleLoadRemoteStations}
                  disabled={isLoadingStations}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStations ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {isLoadingStations ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.78rem' }}>
                  Connecting to Supabase and retrieving station feed...
                </div>
              ) : remoteStations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <Radio className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>No Remote Stations Checked In Yet</div>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: '420px', margin: '4px auto 0 auto', lineHeight: 1.4 }}>
                    When a remote Windows PC enters its Station Activation Code and connects online, its hardware fingerprint and activation heartbeat will appear here automatically.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="podoload-metrics-table" style={{ width: '100%', fontSize: '0.73rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>DEVICE ID</th>
                        <th style={{ textAlign: 'left' }}>STATION NAME</th>
                        <th style={{ textAlign: 'left' }}>PLATFORM</th>
                        <th style={{ textAlign: 'left' }}>CLINIC</th>
                        <th style={{ textAlign: 'left' }}>TECHNICIAN</th>
                        <th style={{ textAlign: 'left' }}>LAST SEEN</th>
                        <th style={{ textAlign: 'left' }}>STATUS</th>
                        <th style={{ textAlign: 'center' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {remoteStations.map((st) => (
                        <tr key={st.device_fingerprint}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f766e' }}>
                            {st.device_fingerprint}
                          </td>
                          <td style={{ fontWeight: 600 }}>{st.device_name}</td>
                          <td style={{ color: '#475569' }}>{st.os_platform}</td>
                          <td style={{ fontFamily: 'monospace' }}>{st.hospital_code}</td>
                          <td>{st.technician_name || 'Technician'}</td>
                          <td style={{ color: '#64748b' }}>
                            {st.last_seen_at ? new Date(st.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </td>
                          <td>
                            <span className={`podo-badge ${st.status === 'revoked' ? 'podo-badge-red' : 'podo-badge-green'}`}>
                              {st.status || 'Active'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {st.status !== 'revoked' ? (
                              <button
                                type="button"
                                className="podoload-btn-secondary"
                                style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem', color: '#dc2626', borderColor: '#fca5a5' }}
                                onClick={() => handleRevokeRemoteStation(st.device_fingerprint)}
                                title="Revoke station authorization remotely in Supabase (immediate kill-switch)"
                              >
                                Revoke
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.62rem', color: '#dc2626' }}>Revoked</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="podoload-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 1rem' }}>
              <button
                type="button"
                className="podoload-btn-secondary"
                onClick={() => setShowStationsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPABASE SQL MIGRATION MODAL */}
      {showSqlModal && (
        <div className="podoload-modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="podoload-modal-card" style={{ maxWidth: '820px', width: '94%' }}>
            <div className="podoload-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="podoload-modal-title" style={{ margin: 0, fontSize: '0.96rem' }}>
                    Supabase PostgreSQL Cloud Schema Setup
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                    Copy and run in your Supabase SQL Editor to automatically provision tables, RLS policies, and storage buckets
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="podoload-modal-close-btn"
                onClick={() => setShowSqlModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ padding: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#334155', fontWeight: 600 }}>
                  Ready to paste into: <code>https://supabase.com/dashboard/project/yqfbhxtvrpfyzygzuqts/sql/new</code>
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="podoload-btn-secondary podoload-btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(cloudSyncService.getSupabaseSchemaSql());
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 3000);
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 text-teal-600" />
                    <span>{copiedSql ? '✓ Copied SQL!' : 'Copy SQL Script'}</span>
                  </button>
                  <a
                    href="https://supabase.com/dashboard/project/yqfbhxtvrpfyzygzuqts/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="podoload-btn-primary podoload-btn-sm"
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Supabase SQL Editor</span>
                  </a>
                </div>
              </div>

              <pre style={{
                backgroundColor: '#0f172a',
                color: '#38bdf8',
                padding: '0.85rem',
                borderRadius: '6px',
                fontSize: '0.68rem',
                lineHeight: 1.45,
                overflowX: 'auto',
                fontFamily: 'monospace',
                border: '1px solid #1e293b',
              }}>
                {cloudSyncService.getSupabaseSchemaSql()}
              </pre>
            </div>

            <div className="podoload-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 1rem' }}>
              <button
                type="button"
                className="podoload-btn-secondary"
                onClick={() => setShowSqlModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
