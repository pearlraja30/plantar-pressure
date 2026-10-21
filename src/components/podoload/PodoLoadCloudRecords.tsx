import React, { useState } from 'react';
import { CloudSyncStatus, cloudSyncService } from '../../services/cloudSyncService';
import { AnalysisCase, Patient } from '../../types';

interface PodoLoadCloudRecordsProps {
  cloudStatus: CloudSyncStatus;
  onRefreshCloud: () => void;
  cases: AnalysisCase[];
  patients: Patient[];
  onSelectCase: (caseId: string) => void;
}

interface ReportRow {
  id: string;
  reportNo: string;
  patientName: string;
  patientId: string;
  date: string;
  cloudStatus: 'Synced' | 'Pending' | 'Failed';
}

const SAMPLE_REPORTS: ReportRow[] = [
  { id: '1', reportNo: '[RPT-0000]', patientName: '[Patient name]', patientId: '[00000]', date: '[date]', cloudStatus: 'Synced' },
  { id: '2', reportNo: '[RPT-0000]', patientName: '[Patient name]', patientId: '[00000]', date: '[date]', cloudStatus: 'Synced' },
  { id: '3', reportNo: '[RPT-0000]', patientName: '[Patient name]', patientId: '[00000]', date: '[date]', cloudStatus: 'Pending' },
  { id: '4', reportNo: '[RPT-0000]', patientName: '[Patient name]', patientId: '[00000]', date: '[date]', cloudStatus: 'Failed' },
  { id: '5', reportNo: '[RPT-0000]', patientName: '[Patient name]', patientId: '[00000]', date: '[date]', cloudStatus: 'Synced' },
  { id: '6', reportNo: '[RPT-0000]', patientName: '[Patient name]', patientId: '[00000]', date: '[date]', cloudStatus: 'Pending' },
];

export const PodoLoadCloudRecords: React.FC<PodoLoadCloudRecordsProps> = ({
  cloudStatus,
  onRefreshCloud,
  cases,
  patients,
  onSelectCase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Merge real cases if available, otherwise show sample reports matching Screenshot 4
  const displayReports: ReportRow[] = cases.length > 0
    ? cases.map((c) => {
        const pat = patients.find((p) => p.id === c.patientId);
        return {
          id: c.id,
          reportNo: c.caseNumber || '[RPT-0000]',
          patientName: pat?.name || '[Patient name]',
          patientId: pat?.mrn || '[00000]',
          date: new Date(c.createdAt).toLocaleDateString(),
          cloudStatus: c.syncStatus === 'synced' ? 'Synced' : 'Pending',
        };
      })
    : SAMPLE_REPORTS;

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
              [{selectedIds.length}] selected
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
                  <th style={{ textAlign: 'left' }}>DATE</th>
                  <th style={{ textAlign: 'left' }}>CLOUD</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {displayReports.map((row) => {
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
                })}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: '0.7rem', color: '#556f75', marginTop: '0.75rem' }}>
            Showing 1–{displayReports.length} of [{displayReports.length}] reports
          </div>
        </div>

        {/* ================= RIGHT COLUMN: CLOUD SYNC & UPLOAD QUEUE ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Card 1: CLOUD SYNC matching Screenshot 4 */}
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
                [n] of [N] uploaded
              </span>
            </div>

            <div className="podoload-progress-track" style={{ marginBottom: '0.85rem' }}>
              <div className="podoload-progress-fill" style={{ width: '65%' }} />
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

          {/* Card 2: UPLOAD QUEUE matching Screenshot 4 */}
          <div className="podoload-card podoload-upload-queue-card" style={{ padding: '0.85rem', flex: 1 }}>
            <h4 className="podoload-card-title" style={{ margin: 0 }}>
              UPLOAD QUEUE
            </h4>

            {/* Queue Item 1: Uploading */}
            <div className="podoload-queue-item">
              <div className="podoload-queue-item-header">
                <span>[RPT-0000] · [Patient name]</span>
                <span className="podo-badge podo-badge-amber">Uploading</span>
              </div>
              <div className="podoload-progress-track">
                <div className="podoload-progress-fill" style={{ width: '45%' }} />
              </div>
            </div>

            {/* Queue Item 2: Pending */}
            <div className="podoload-queue-item">
              <div className="podoload-queue-item-header">
                <span>[RPT-0000] · [Patient name]</span>
                <span className="podo-badge podo-badge-pending">Pending</span>
              </div>
            </div>

            {/* Queue Item 3: Failed */}
            <div className="podoload-queue-item">
              <div className="podoload-queue-item-header">
                <span>[RPT-0000] · [Patient name]</span>
                <span className="podo-badge podo-badge-failed">Failed</span>
              </div>
            </div>

            {/* Retry Failed Button */}
            <button
              type="button"
              className="podoload-btn-secondary"
              style={{ width: '100%', marginTop: '0.25rem' }}
              onClick={handleSyncNow}
            >
              Retry failed
            </button>

            {/* Caption */}
            <p style={{ fontSize: '0.68rem', color: '#657e84', margin: 0, marginTop: 'auto', lineHeight: 1.35 }}>
              Reports save locally when offline and upload automatically when the connection returns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
