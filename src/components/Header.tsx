import React from 'react';
import {
  Activity,
  Scan,
  Cloud,
  CloudOff,
  ShieldCheck,
  FileText,
  Layers,
  HelpCircle,
  Laptop,
  Smartphone,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import { CloudSyncStatus } from '../services/cloudSyncService';

interface HeaderProps {
  currentTab: 'analysis' | 'orthotics' | 'patients';
  onTabChange: (tab: 'analysis' | 'orthotics' | 'patients') => void;
  onOpenScanner: () => void;
  onOpenReport: () => void;
  onOpenCloud: () => void;
  onOpenAudit: () => void;
  onOpenArchitecture: () => void;
  onOpenVerification: () => void;
  cloudStatus: CloudSyncStatus;
  selectedCaseNumber: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenScanner,
  onOpenReport,
  onOpenCloud,
  onOpenAudit,
  onOpenArchitecture,
  onOpenVerification,
  cloudStatus,
  selectedCaseNumber,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="header-container">
      {/* Brand & Technical Title */}
      <div className="header-brand">
        <div className="logo-badge">
          <Activity className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="brand-title">Technomind</span>
            <span className="brand-subtitle">HEALTHCARE</span>
            <span className="badge-tag">PPA-SW-TF-001</span>
          </div>
          <h1 className="header-title">Plantar Pressure Analysis System</h1>
        </div>
      </div>

      {/* Navigation Workspaces */}
      <nav className="header-nav">
        <button
          className={`nav-btn ${currentTab === 'analysis' ? 'active' : ''}`}
          onClick={() => onTabChange('analysis')}
        >
          <Layers className="w-4 h-4 mr-1.5 inline" />
          Plantar Analysis & Heat Map
        </button>
        <button
          className={`nav-btn ${currentTab === 'orthotics' ? 'active' : ''}`}
          onClick={() => onTabChange('orthotics')}
        >
          <Activity className="w-4 h-4 mr-1.5 inline" />
          Orthotic Measurements
        </button>
        <button
          className={`nav-btn ${currentTab === 'patients' ? 'active' : ''}`}
          onClick={() => onTabChange('patients')}
        >
          <FileText className="w-4 h-4 mr-1.5 inline" />
          Patient Cases
        </button>
      </nav>

      {/* Action Toolbar */}
      <div className="header-actions">
        {/* Scanner Wizard CTA */}
        <button className="btn-scanner" onClick={onOpenScanner} title="Acquire Harris Mat scan (FR-02)">
          <Scan className="w-4 h-4 mr-1.5" />
          <span>Scanner Wizard</span>
        </button>

        {/* Generate Report */}
        <button className="btn-secondary" onClick={onOpenReport} title="Generate Clinical 4-Page Report (Appendix A)">
          <FileText className="w-4 h-4 mr-1" />
          <span>Report</span>
        </button>

        {/* Cloud Sync Status Badge */}
        <button
          className={`btn-icon-status ${cloudStatus.isOnline ? 'online' : 'offline'}`}
          onClick={onOpenCloud}
          title={cloudStatus.isOnline ? 'Cloud Sync Online (FR-12)' : 'Cloud Offline (Queued)'}
        >
          {cloudStatus.isOnline ? (
            <Cloud className="w-4 h-4 text-emerald-400" />
          ) : (
            <CloudOff className="w-4 h-4 text-amber-400" />
          )}
          {cloudStatus.pendingQueueCount > 0 && (
            <span className="queue-pill">{cloudStatus.pendingQueueCount}</span>
          )}
        </button>

        {/* Audit Log */}
        <button className="btn-icon" onClick={onOpenAudit} title="Audit Trail (FR-14)">
          <ShieldCheck className="w-4 h-4 text-slate-300" />
        </button>

        {/* Cross-Platform Architecture Guide */}
        <button
          className="btn-pill-info"
          onClick={onOpenArchitecture}
          title="Cross-Platform Deployment Architecture (Desktop / Web / Mobile)"
        >
          <div className="flex items-center gap-1">
            <Laptop className="w-3.5 h-3.5" />
            <Globe className="w-3.5 h-3.5" />
            <Smartphone className="w-3.5 h-3.5" />
          </div>
          <span>Architecture</span>
        </button>

        {/* Regulatory V&V Battery (VT-01 to VT-13) */}
        <button
          className="btn-pill-info"
          onClick={onOpenVerification}
          title="Automated Regulatory Verification Battery (VT-01 to VT-13)"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>V&V Battery</span>
        </button>

        {/* Theme Toggle (Clinical Light / Diagnostic Dark) */}
        <button
          className="btn-theme-toggle"
          onClick={onToggleTheme}
          title={
            theme === 'light'
              ? 'Switch to Diagnostic Dark (Radiology / Low-Glare Mode)'
              : 'Switch to Clinical Light (Hospital Consultation Studio)'
          }
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-700" />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light Mode</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
