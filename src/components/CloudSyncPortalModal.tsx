import React, { useState } from 'react';
import {
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Lock,
  ArrowUpRight,
  Database,
} from 'lucide-react';
import { CloudSyncStatus, cloudSyncService } from '../services/cloudSyncService';
import { AnalysisCase } from '../types';

interface CloudSyncPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudStatus: CloudSyncStatus;
  currentCase: AnalysisCase;
  onSyncTriggered: () => void;
}

export const CloudSyncPortalModal: React.FC<CloudSyncPortalModalProps> = ({
  isOpen,
  onClose,
  cloudStatus,
  currentCase,
  onSyncTriggered,
}) => {
  const [isSimulatingSync, setIsSimulatingSync] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleOnline = () => {
    cloudSyncService.setOnlineStatus(!cloudStatus.isOnline);
    onSyncTriggered();
  };

  const handleManualSync = async () => {
    setIsSimulatingSync(true);
    setSyncFeedback(null);
    try {
      const res = await cloudSyncService.syncCase(currentCase);
      if (res.success) {
        setSyncFeedback(`Successfully synchronized to cloud. Assigned Ref: ${res.cloudId}`);
      } else {
        setSyncFeedback(`Sync enqueued: ${res.error}`);
      }
      onSyncTriggered();
    } finally {
      setIsSimulatingSync(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog cloud-modal">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Cloud Synchronization & Remote Access (FR-12, FR-13)
              </h2>
              <p className="text-xs text-slate-400">
                End-to-End Encrypted Transit, Offline Queueing & Centralized Clinic Archive
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body p-6 space-y-5">
          {/* Connection Status Banner */}
          <div className="flex items-center justify-between p-4 bg-slate-800/80 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-full ${
                  cloudStatus.isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                {cloudStatus.isOnline ? (
                  <Cloud className="w-6 h-6" />
                ) : (
                  <CloudOff className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-100">
                  {cloudStatus.isOnline ? 'Online — Cloud Gateway Connected' : 'Offline Mode (Local Storage)'}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Server className="w-3.5 h-3.5 text-teal-400" />
                  <span>{cloudStatus.serverEndpoint}</span>
                </div>
              </div>
            </div>

            <button
              className={`btn-secondary-sm ${cloudStatus.isOnline ? 'text-amber-300' : 'text-emerald-300'}`}
              onClick={handleToggleOnline}
            >
              {cloudStatus.isOnline ? 'Simulate Offline' : 'Simulate Online'}
            </button>
          </div>

          {/* Sync Queue State Card */}
          <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Local Offline Queue Status</span>
              <span className="badge-tag-sm">{cloudStatus.pendingQueueCount} Pending Cases</span>
            </div>

            <div className="text-xs text-slate-400">
              When working in remote clinics without reliable internet, scans and analyses are
              safely stored with transactional integrity. As soon as connection is re-established,
              the queue uploads automatically without data loss.
            </div>

            <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
              <div className="text-xs">
                <span className="text-slate-400">Current Case Status: </span>
                <span className="font-bold text-teal-400 uppercase">
                  {currentCase.syncStatus}
                </span>
                {currentCase.cloudSyncId && (
                  <span className="text-[11px] text-slate-500 font-mono ml-2">
                    ({currentCase.cloudSyncId})
                  </span>
                )}
              </div>

              <button
                className="btn-primary-sm"
                onClick={handleManualSync}
                disabled={isSimulatingSync}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1 ${isSimulatingSync ? 'animate-spin' : ''}`}
                />
                {isSimulatingSync ? 'Syncing...' : 'Sync Current Case'}
              </button>
            </div>

            {syncFeedback && (
              <div className="p-2.5 bg-teal-950/40 border border-teal-800/50 rounded text-xs text-teal-300">
                {syncFeedback}
              </div>
            )}
          </div>

          {/* Security & Cryptographic Integrity (FR-11, FR-12) */}
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Lock className="w-4 h-4 text-teal-400" />
              <span>Cryptographic Integrity & Transport Security</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>• Transport: TLS 1.3 with AES-256-GCM authenticated encryption.</div>
              <div>• Role-Based Access Control: Clinician / Orthotist / Auditor token verification.</div>
              <div className="font-mono text-[10px] text-slate-500 break-all">
                • Current Case Digest: {currentCase.integrityHash}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary ml-auto" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
