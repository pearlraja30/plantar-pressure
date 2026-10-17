import React, { useState } from 'react';
import {
  Activity,
  Scan,
  Cloud,
  CloudOff,
  ShieldCheck,
  FileText,
  Layers,
  Laptop,
  Smartphone,
  Globe,
  Sun,
  Moon,
  MoreVertical,
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
  selectedCaseNumber: _selectedCaseNumber,
  theme,
  onToggleTheme,
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);

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
            <span className="badge-tag hidden sm:inline">PPA-SW-TF-001</span>
          </div>
          <h1 className="header-title hidden md:block">Plantar Pressure Analysis System</h1>
        </div>
      </div>

      {/* Navigation Workspaces (Clean 3-Tab Responsive Grid on Mobile) */}
      <nav className="header-nav">
        <button
          className={`nav-btn ${currentTab === 'analysis' ? 'active' : ''}`}
          onClick={() => onTabChange('analysis')}
        >
          <Layers className="w-4 h-4 mr-1.5 inline flex-shrink-0" />
          <span className="hidden sm:inline">Plantar </span>
          <span>Analysis</span>
        </button>
        <button
          className={`nav-btn ${currentTab === 'orthotics' ? 'active' : ''}`}
          onClick={() => onTabChange('orthotics')}
        >
          <Activity className="w-4 h-4 mr-1.5 inline flex-shrink-0" />
          <span>Orthotics</span>
        </button>
        <button
          className={`nav-btn ${currentTab === 'patients' ? 'active' : ''}`}
          onClick={() => onTabChange('patients')}
        >
          <FileText className="w-4 h-4 mr-1.5 inline flex-shrink-0" />
          <span>Patients</span>
        </button>
      </nav>

      {/* Action Toolbar */}
      <div className="header-actions">
        {/* Scanner Wizard CTA (Primary Highlight) */}
        <button className="btn-scanner" onClick={onOpenScanner} title="Acquire Harris Mat scan (FR-02)">
          <Scan className="w-4 h-4 mr-1.5 flex-shrink-0" />
          <span>Scan</span>
        </button>

        {/* Generate Report */}
        <button className="btn-secondary" onClick={onOpenReport} title="Generate Clinical 4-Page Report (Appendix A)">
          <FileText className="w-4 h-4 mr-1 flex-shrink-0" />
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

        {/* Desktop-Only Tools (Audit / Architecture / V&V) */}
        <div className="hidden lg:flex items-center gap-1.5">
          <button className="btn-icon" onClick={onOpenAudit} title="Audit Trail (FR-14)">
            <ShieldCheck className="w-4 h-4 text-slate-300" />
          </button>

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

          <button
            className="btn-pill-info"
            onClick={onOpenVerification}
            title="Automated Regulatory Verification Battery (VT-01 to VT-13)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>V&V Battery</span>
          </button>
        </div>

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
              <span className="hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          )}
        </button>

        {/* Mobile Tools Dropdown Menu */}
        <div className="relative lg:hidden">
          <button
            className="btn-icon text-slate-300 hover:text-white"
            onClick={() => setIsToolsOpen((prev) => !prev)}
            title="More System & Verification Tools"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isToolsOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-1.5 z-50 text-xs flex flex-col gap-1 animate-fade-in">
              <button
                className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded text-slate-200 flex items-center gap-2"
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenAudit();
                }}
              >
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Audit Trail (FR-14)</span>
              </button>
              <button
                className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded text-slate-200 flex items-center gap-2"
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenArchitecture();
                }}
              >
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>System Architecture</span>
              </button>
              <button
                className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded text-slate-200 flex items-center gap-2"
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenVerification();
                }}
              >
                <Activity className="w-4 h-4 text-amber-400" />
                <span>V&V Test Battery</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
