import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Search,
  Download,
  Calendar,
  User,
  Activity,
  FileCheck,
} from 'lucide-react';
import { AuditEvent } from '../types';
import { getAuditEvents } from '../services/auditService';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const events = getAuditEvents();

  if (!isOpen) return null;

  const filtered = events.filter(
    (e) =>
      e.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.caseId && e.caseId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `ppa_audit_trail_${new Date().toISOString()}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog audit-modal">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Immutable Clinical Audit Trail (FR-14)
              </h2>
              <p className="text-xs text-slate-400">
                21 CFR Part 11 & IEC 62304 Compliant Action Log
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-secondary-sm" onClick={handleExportJson}>
              <Download className="w-4 h-4 mr-1" />
              Export Audit JSON
            </button>
            <button className="btn-close" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="modal-body p-6 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit actions, user IDs, or case numbers..."
              className="form-input pl-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="audit-table-wrapper">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-300 font-semibold border-b border-slate-700">
                <tr>
                  <th className="p-3">Timestamp (UTC)</th>
                  <th className="p-3">Action Event</th>
                  <th className="p-3">User Identity</th>
                  <th className="p-3">Details / Context</th>
                  <th className="p-3">Algorithm Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="badge-tag-sm">{ev.action}</span>
                    </td>
                    <td className="p-3 text-slate-300 font-medium">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-teal-400" />
                        <span>{ev.userId}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs">{ev.details}</td>
                    <td className="p-3 font-mono text-[11px] text-teal-400">
                      {ev.algorithmVersion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <span className="text-xs text-slate-400">
            Total Logged Events: {events.length} records • Tamper-resistant storage
          </span>
          <button className="btn-secondary ml-auto" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
