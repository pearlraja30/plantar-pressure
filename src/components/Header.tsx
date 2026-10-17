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
  Sun,
  Moon,
  MoreVertical,
  X,
  Database,
  Cpu,
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
      {/* Top Header Row (Brand on Left, Mobile Quick Actions on Right) */}
      <div className="header-top-row">
        <div className="header-brand">
          <div className="logo-badge" title="Clinical Footwear & Podiatry Diagnostic Engine">
            <Activity className="w-5 h-5 text-teal-400" />
          </div>
          <div className="brand-text-container">
            <div className="brand-title-row">
              <span className="brand-title">Technomind</span>
              <span className="brand-subtitle">HEALTHCARE</span>
              <span className="badge-tag desktop-only">PPA-SW-TF-001</span>
            </div>
            <h1 className="header-title desktop-only">Plantar Pressure Analysis System</h1>
          </div>
        </div>

        {/* Mobile-Only Top Actions: Theme Toggle + Menu */}
        <div className="mobile-header-quick-actions mobile-only">
          <button
            className="btn-theme-toggle-compact"
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <button
            className={`btn-icon mobile-menu-btn ${isToolsOpen ? 'active' : ''}`}
            onClick={() => setIsToolsOpen((prev) => !prev)}
            title="Clinical Tools & Diagnostic Menus"
          >
            {isToolsOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation Workspaces (Clean 3-Tab Segmented Control) */}
      <nav className="header-nav">
        <button
          className={`nav-btn ${currentTab === 'analysis' ? 'active' : ''}`}
          onClick={() => onTabChange('analysis')}
        >
          <Layers className="nav-btn-icon" />
          <span>Analysis</span>
        </button>
        <button
          className={`nav-btn ${currentTab === 'orthotics' ? 'active' : ''}`}
          onClick={() => onTabChange('orthotics')}
        >
          <Activity className="nav-btn-icon" />
          <span>Orthotics</span>
        </button>
        <button
          className={`nav-btn ${currentTab === 'patients' ? 'active' : ''}`}
          onClick={() => onTabChange('patients')}
        >
          <FileText className="nav-btn-icon" />
          <span>Patients</span>
        </button>
      </nav>

      {/* Action Toolbar */}
      <div className="header-actions">
        {/* Scanner Wizard CTA (Primary Highlight) */}
        <button className="btn-scanner" onClick={onOpenScanner} title="Acquire Harris Mat scan (FR-02)">
          <Scan className="w-4 h-4" />
          <span>Scan Wizard</span>
        </button>

        {/* Generate Report */}
        <button className="btn-secondary" onClick={onOpenReport} title="Generate Clinical 4-Page Report (Appendix A)">
          <FileText className="w-4 h-4" />
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

        {/* Desktop-Only Tools (Audit / Architecture / V&V / Desktop Theme) */}
        <div className="desktop-tools">
          <button className="btn-icon" onClick={onOpenAudit} title="Audit Trail (FR-14)">
            <ShieldCheck className="w-4 h-4 text-slate-300" />
          </button>

          <button
            className="btn-pill-info"
            onClick={onOpenArchitecture}
            title="Cross-Platform Deployment Architecture (Desktop / Web / Mobile)"
          >
            <Laptop className="w-3.5 h-3.5" />
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
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Tools Modal / Drawer Popover */}
      {isToolsOpen && (
        <div className="mobile-menu-backdrop" onClick={() => setIsToolsOpen(false)}>
          <div className="mobile-menu-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span className="mobile-menu-title">Clinical System Tools</span>
              <button
                className="btn-icon mobile-menu-close"
                onClick={() => setIsToolsOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mobile-menu-body">
              <button
                className="mobile-menu-item"
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenCloud();
                }}
              >
                <Database className="w-4 h-4 text-emerald-400" />
                <div className="mobile-menu-item-text">
                  <span className="item-label">Cloud Synchronization</span>
                  <span className="item-desc">
                    {cloudStatus.isOnline ? 'Online (Connected)' : 'Offline (Local storage)'}
                  </span>
                </div>
              </button>

              <button
                className="mobile-menu-item"
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenAudit();
                }}
              >
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <div className="mobile-menu-item-text">
                  <span className="item-label">Regulatory Audit Trail</span>
                  <span className="item-desc">FR-14 FDA/CE compliance log</span>
                </div>
              </button>

              <button
                className="mobile-menu-item"
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenArchitecture();
                }}
              >
                <Laptop className="w-4 h-4 text-cyan-400" />
                <div className="mobile-menu-item-text">
                  <span className="item-label">System Architecture</span>
                  <span className="item-desc">Desktop, Mobile & Web pipeline</span>
                </div>
              </button>

              <button
                className="mobile-menu-item"
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenVerification();
                }}
              >
                <Cpu className="w-4 h-4 text-amber-400" />
                <div className="mobile-menu-item-text">
                  <span className="item-label">V&V Automated Battery</span>
                  <span className="item-desc">Algorithm verification VT-01 to VT-13</span>
                </div>
              </button>
            </div>

            <div className="mobile-menu-footer">
              <span>Technomind Plantar Pressure System • v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.12'}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
