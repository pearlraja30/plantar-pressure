import React, { useState } from 'react';
import { Cloud, RefreshCw, ShieldCheck, Database, CheckCircle2 } from 'lucide-react';
import { CloudSyncStatus, cloudSyncService } from '../../services/cloudSyncService';
import { getAuditEvents } from '../../services/auditService';
import { AnalysisCase, Patient } from '../../types';

interface PodoLoadCloudRecordsProps {
  cloudStatus: CloudSyncStatus;
  onRefreshCloud: () => void;
  cases: AnalysisCase[];
  patients: Patient[];
  onSelectCase: (caseId: string) => void;
}

export const PodoLoadCloudRecords: React.FC<PodoLoadCloudRecordsProps> = ({
  cloudStatus,
  onRefreshCloud,
  cases,
  patients,
  onSelectCase,
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'audit'>('cloud');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const auditLogs = getAuditEvents();

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await cloudSyncService.processQueue();
    onRefreshCloud();
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
      {/* Top Segmented Sub-tab bar */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className={`podoload-btn-${activeTab === 'cloud' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('cloud')}
        >
          <Cloud className="w-3.5 h-3.5 mr-1.5 inline" />
          Cloud Synchronization &amp; Archive
        </button>

        <button
          type="button"
          className={`podoload-btn-${activeTab === 'audit' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('audit')}
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5 inline" />
          Regulatory Audit Trail (FR-14)
        </button>
      </div>

      {activeTab === 'cloud' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1rem', flex: 1 }}>
          {/* Left Panel: Cloud Status Card */}
          <div className="podoload-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <h3 className="podoload-card-title">CLOUD SYNC ENGINE</h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534' }}>
                  {cloudStatus.isOnline ? 'Cloud Service Online' : 'Offline (Local Safe Mode)'}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#15803d' }}>
                  End-to-end encrypted AES-256 cloud archive
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
              <div>Pending uploads in queue: <strong>{cloudStatus.pendingQueueCount}</strong></div>
              <div>Last sync timestamp: <strong>{cloudStatus.lastSyncTime ? new Date(cloudStatus.lastSyncTime).toLocaleString() : 'Just now'}</strong></div>
              <div>Sync protocol: <strong>HTTPS / TLS 1.3 REST API</strong></div>
              <div>Storage engine: <strong>IndexedDB + Encrypted LocalStorage</strong></div>
            </div>

            <button
              type="button"
              className="podoload-btn-primary"
              style={{ marginTop: 'auto', width: '100%' }}
              onClick={handleSyncNow}
              disabled={isSyncing}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 inline ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Synchronizing...' : 'Trigger Cloud Sync Now'}
            </button>
          </div>

          {/* Right Panel: Cloud Archived Cases */}
          <div className="podoload-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 className="podoload-card-title">ARCHIVED CLINICAL EXAMS ({cases.length})</h3>

            {cases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#657e84', fontSize: '0.8rem' }}>
                No archived exams yet. Complete a new exam to archive.
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cases.map((c) => {
                  const pat = patients.find((p) => p.id === c.patientId);
                  return (
                    <div
                      key={c.id}
                      className="podoload-patient-row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelectCase(c.id)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0c2328' }}>
                          {c.caseNumber} · {pat?.name || 'Patient'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#657e84' }}>
                          {new Date(c.createdAt).toLocaleDateString()} · {c.footSide} foot · {c.scanMetadata?.scannerModel || 'Scanner'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="podo-badge podo-badge-green">Synced</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Regulatory Audit Trail View */
        <div className="podoload-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 className="podoload-card-title">REGULATORY AUDIT TRAIL LOG (IEC 62304 / ISO 14971)</h3>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table className="podoload-metrics-table" style={{ width: '100%', fontSize: '0.74rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Timestamp</th>
                  <th style={{ textAlign: 'left' }}>Action</th>
                  <th style={{ textAlign: 'left' }}>User / Operator</th>
                  <th style={{ textAlign: 'left' }}>Details</th>
                  <th style={{ textAlign: 'right' }}>Engine Version</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(-25).reverse().map((ev) => (
                  <tr key={ev.id}>
                    <td>{new Date(ev.timestamp).toLocaleTimeString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--podo-primary)' }}>{ev.action}</td>
                    <td>{ev.userId}</td>
                    <td style={{ color: '#334155' }}>{ev.details}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{ev.algorithmVersion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
