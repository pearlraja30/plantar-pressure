import React from 'react';
import {
  UserPlus,
  Camera,
  Scan,
  BarChart2,
  FileText,
  Search,
  FolderArchive,
  Sliders,
  Building2,
  X,
  Lock,
  ShieldCheck,
  UserCheck,
  Database,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { SystemUserSession, SYSTEM_ACCOUNTS, APP_CURRENT_VERSION } from '../../services/dbService';

export type PodoLoadNavSection =
  | 'registration'
  | 'capture'
  | 'process'
  | 'results'
  | 'report'
  | 'patient_search'
  | 'reports_cloud'
  | 'database'
  | 'settings'
  | 'admin'
  | 'superadmin';

interface PodoLoadSidebarProps {
  currentSection: PodoLoadNavSection;
  onNavigate: (section: PodoLoadNavSection) => void;
  onStartNewExam: () => void;
  currentUser?: SystemUserSession;
  isSessionLocked?: boolean;
  onOpenUserSwitcher?: (mode?: 'superadmin' | 'admin' | 'technician') => void;
  onLogout?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const PodoLoadSidebar: React.FC<PodoLoadSidebarProps> = ({
  currentSection,
  onNavigate,
  onStartNewExam,
  currentUser = SYSTEM_ACCOUNTS.admin,
  isSessionLocked = false,
  onOpenUserSwitcher,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const isMobileDevice =
    Capacitor.isNativePlatform() ||
    (typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
        (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))));

  const handleItemClick = (section: PodoLoadNavSection) => {
    if (isSessionLocked) {
      if (onOpenUserSwitcher) onOpenUserSwitcher(section === 'admin' ? 'admin' : 'technician');
      return;
    }

    // Role-based examination guard: Only Clinical Technicians conduct patient examinations & scanning
    if (
      currentUser?.role !== 'technician' &&
      (section === 'registration' || section === 'capture' || section === 'process' || section === 'results')
    ) {
      const confirmSwitch = confirm(
        `Clinical scanning and examination workflows are strictly restricted to Clinical Technicians.\n\nYou are currently logged in as ${currentUser?.name} (${currentUser?.role === 'superadmin' ? 'Super Administrator' : 'Hospital Administrator'}).\n\nWould you like to switch to a Clinical Technician login?`
      );
      if (confirmSwitch && onOpenUserSwitcher) {
        onOpenUserSwitcher('technician');
      }
      return;
    }

    onNavigate(section);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="podoload-drawer-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`podoload-sidebar ${isOpenMobile ? 'mobile-open' : ''}`}
        aria-label="Main Navigation Sidebar"
      >
        <div className="podoload-sidebar-top">
          {/* Brand Title Area with Mobile Close Button */}
          <div className="podoload-brand-area">
            <h1
              className="podoload-brand-title"
              onClick={() => {
                onStartNewExam();
                if (onCloseMobile) onCloseMobile();
              }}
              style={{ cursor: 'pointer' }}
            >
              PodoPress
            </h1>
            {onCloseMobile && (
              <button
                type="button"
                className="podoload-drawer-close-btn"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5 text-gray-300 hover:text-white" />
              </button>
            )}
          </div>

        {/* Navigation Section according to Role Hierarchy */}
        {currentUser?.role === 'admin' ? (
          <>
            {/* Dedicated Management Sections for Hospital Admin */}
            <div className="podoload-nav-section">
              <div className="podoload-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>HOSPITAL MANAGEMENT</span>
                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.58rem', padding: '1px 5px' }}>
                  Admin
                </span>
              </div>
              <nav className="podoload-nav-list">
                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'admin' ? 'active' : ''}`}
                  onClick={() => handleItemClick('admin')}
                  title="Hospital profile, technicians, and vouchers"
                >
                  <Building2 className="podoload-nav-item-icon" />
                  <span>Hospital & Profile</span>
                </button>

                {!isMobileDevice && (
                  <button
                    type="button"
                    className={`podoload-nav-item ${currentSection === 'database' ? 'active' : ''}`}
                    onClick={() => handleItemClick('database')}
                    title="Station database records and audit traces"
                  >
                    <Database className="podoload-nav-item-icon" />
                    <span>Database records</span>
                  </button>
                )}

                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'settings' ? 'active' : ''}`}
                  onClick={() => handleItemClick('settings')}
                  title="Clinical and workstation hardware settings"
                >
                  <Sliders className="podoload-nav-item-icon" />
                  <span>Settings & Hardware</span>
                </button>
              </nav>
            </div>

            <div className="podoload-nav-section">
              <div className="podoload-section-label">RECORDS</div>
              <nav className="podoload-nav-list">
                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'reports_cloud' ? 'active' : ''}`}
                  onClick={() => handleItemClick('reports_cloud')}
                  title="Clinical reports archive and cloud sync"
                >
                  <FolderArchive className="podoload-nav-item-icon" />
                  <span>Reports and cloud</span>
                </button>

                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'patient_search' ? 'active' : ''}`}
                  onClick={() => handleItemClick('patient_search')}
                  title="Search patients and records"
                >
                  <Search className="podoload-nav-item-icon" />
                  <span>Patient search</span>
                </button>
              </nav>
            </div>
          </>
        ) : currentUser?.role === 'superadmin' ? (
          <>
            {/* Dedicated Governance Sections for Super Admin */}
            <div className="podoload-nav-section">
              <div className="podoload-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>SUPER ADMIN</span>
                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.58rem', padding: '1px 5px', backgroundColor: '#7e22ce' }}>
                  SuperAdmin
                </span>
              </div>
              <nav className="podoload-nav-list">
                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'superadmin' ? 'active' : ''}`}
                  onClick={() => handleItemClick('superadmin')}
                  title="Super Administrator Governance: Clinics, Station Telemetry, Reports, Master Audit"
                  style={{ color: currentSection === 'superadmin' ? '#ffffff' : '#c084fc' }}
                >
                  <ShieldCheck className="podoload-nav-item-icon text-purple-400" />
                  <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>Super Admin Console</span>
                </button>

                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'reports_cloud' ? 'active' : ''}`}
                  onClick={() => handleItemClick('reports_cloud')}
                  title="Master cross-hospital report archive"
                >
                  <FolderArchive className="podoload-nav-item-icon" />
                  <span>Global Reports Audit</span>
                </button>

                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'settings' ? 'active' : ''}`}
                  onClick={() => handleItemClick('settings')}
                  title="Platform configuration and telemetry"
                >
                  <Sliders className="podoload-nav-item-icon" />
                  <span>Platform Settings</span>
                </button>
              </nav>
            </div>
          </>
        ) : (
          <>
            {/* Dedicated Clinical Examination Sections for Technician (Clean, Zero Lock Icons) */}
            <div className="podoload-nav-section">
              <div className="podoload-section-label">NEW EXAM</div>
              <nav className="podoload-nav-list">
                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'registration' ? 'active' : ''}`}
                  onClick={() => handleItemClick('registration')}
                >
                  <UserPlus className="podoload-nav-item-icon" />
                  <span>Registration</span>
                </button>

                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'capture' || currentSection === 'process' ? 'active' : ''}`}
                  onClick={() => handleItemClick('capture')}
                >
                  {isMobileDevice ? (
                    <Camera className="podoload-nav-item-icon" />
                  ) : (
                    <Scan className="podoload-nav-item-icon" />
                  )}
                  <span>{isMobileDevice ? 'Capture and process' : 'Scan and process'}</span>
                </button>

                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'results' ? 'active' : ''}`}
                  onClick={() => handleItemClick('results')}
                >
                  <BarChart2 className="podoload-nav-item-icon" />
                  <span>Results</span>
                </button>

                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'report' ? 'active' : ''}`}
                  onClick={() => handleItemClick('report')}
                >
                  <FileText className="podoload-nav-item-icon" />
                  <span>Report</span>
                </button>
              </nav>
            </div>

            {/* Section 2: RECORDS */}
            <div className="podoload-nav-section">
              <div className="podoload-section-label">RECORDS</div>
              <nav className="podoload-nav-list">
                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'patient_search' ? 'active' : ''}`}
                  onClick={() => handleItemClick('patient_search')}
                >
                  <Search className="podoload-nav-item-icon" />
                  <span>Patient search</span>
                </button>

                <button
                  type="button"
                  className={`podoload-nav-item ${currentSection === 'reports_cloud' ? 'active' : ''}`}
                  onClick={() => handleItemClick('reports_cloud')}
                >
                  <FolderArchive className="podoload-nav-item-icon" />
                  <span>Reports and cloud</span>
                </button>
              </nav>
            </div>
          </>
        )}
      </div>

      {/* User Login Profile Card (Static Read-Only Display - Zero Confusing Link) */}
      <div
        className={`podoload-sidebar-user-card ${isSessionLocked ? 'clickable' : 'static'}`}
        onClick={isSessionLocked ? () => {
          if (onOpenUserSwitcher) onOpenUserSwitcher('technician');
          if (onCloseMobile) onCloseMobile();
        } : undefined}
        style={{ cursor: isSessionLocked ? 'pointer' : 'default' }}
        title={isSessionLocked ? 'Click to sign in to station' : `Active Station Operator: ${currentUser?.name}`}
      >
        {isSessionLocked ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="podoload-sidebar-user-role" style={{ color: '#fcd34d' }}>
                🔒 Signed Out
              </span>
            </div>
            <div className="podoload-sidebar-user-name" style={{ marginTop: '2px', color: '#94a3b8' }}>
              Station Standby
            </div>
            <div className="podoload-sidebar-user-sub" style={{ color: '#2dd4bf', fontWeight: 700 }}>
              Click to Sign In ▾
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.45rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                {currentUser?.role === 'superadmin' ? (
                  <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
                ) : currentUser?.role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
                ) : (
                  <UserCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                )}
                <span className="podoload-sidebar-user-role" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser?.role === 'superadmin' ? '👑 Super Admin' : currentUser?.role === 'admin' ? '🛡️ Administrator' : '🔬 Technician'}
                </span>
              </div>
            </div>
            <div className="podoload-sidebar-user-name" style={{ marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser?.name}
            </div>
            <div className="podoload-sidebar-user-sub" style={{ color: '#64748b' }}>
              {currentUser?.role === 'superadmin' ? 'Platform Authority' : currentUser?.role === 'admin' ? 'Hospital Authority' : 'Clinical Operator'}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '0.45rem 1.25rem 0.75rem', color: '#44666d', fontSize: '0.68rem', fontWeight: 600 }}>
        v{APP_CURRENT_VERSION} · TechFile TF-001
      </div>
    </aside>
    </>
  );
};
