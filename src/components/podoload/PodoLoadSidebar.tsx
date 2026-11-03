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
  LogOut,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { SystemUserSession, SYSTEM_ACCOUNTS } from '../../services/dbService';

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
  | 'admin';

interface PodoLoadSidebarProps {
  currentSection: PodoLoadNavSection;
  onNavigate: (section: PodoLoadNavSection) => void;
  onStartNewExam: () => void;
  currentUser?: SystemUserSession;
  isSessionLocked?: boolean;
  onOpenUserSwitcher?: (mode?: 'admin' | 'technician') => void;
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

        {/* Section 1: NEW EXAM */}
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

            {!isMobileDevice && (
              <button
                type="button"
                className={`podoload-nav-item ${currentSection === 'database' ? 'active' : ''}`}
                onClick={() => handleItemClick('database')}
              >
                <Database className="podoload-nav-item-icon" />
                <span>Database records</span>
              </button>
            )}
          </nav>
        </div>

        {/* Section 3: ADMINISTRATION & SYSTEM (Desktop / Web Only) */}
        {!isMobileDevice && (
          <div className="podoload-nav-section">
            <div className="podoload-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>ADMIN & SYSTEM</span>
              {currentUser?.role === 'technician' && (
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Lock className="w-2.5 h-2.5" /> Admin Only
                </span>
              )}
            </div>
            <nav className="podoload-nav-list">
              <button
                type="button"
                className={`podoload-nav-item ${currentSection === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  if (currentUser?.role === 'technician') {
                    if (onOpenUserSwitcher) onOpenUserSwitcher('admin');
                  } else {
                    handleItemClick('admin');
                  }
                }}
                title={currentUser?.role === 'technician' ? 'Requires Hospital Administrator login' : 'Hospital profile & clinic accounts'}
              >
                <Building2 className="podoload-nav-item-icon" />
                <span style={{ flex: 1, textAlign: 'left' }}>Hospital & Admin</span>
                {currentUser?.role === 'technician' && (
                  <Lock className="w-3 h-3 text-amber-400 opacity-80" />
                )}
              </button>

              <button
                type="button"
                className={`podoload-nav-item ${currentSection === 'settings' ? 'active' : ''}`}
                onClick={() => {
                  if (currentUser?.role === 'technician') {
                    if (onOpenUserSwitcher) onOpenUserSwitcher('admin');
                  } else {
                    handleItemClick('settings');
                  }
                }}
                title={currentUser?.role === 'technician' ? 'Requires Hospital Administrator login' : 'Clinical device settings & system maintenance'}
              >
                <Sliders className="podoload-nav-item-icon" />
                <span style={{ flex: 1, textAlign: 'left' }}>Settings</span>
                {currentUser?.role === 'technician' && (
                  <Lock className="w-3 h-3 text-amber-400 opacity-80" />
                )}
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* User Login Profile & Switcher Card */}
      <div
        className="podoload-sidebar-user-card"
        onClick={() => {
          if (onOpenUserSwitcher) onOpenUserSwitcher(currentUser?.role === 'admin' ? 'admin' : 'technician');
          if (onCloseMobile) onCloseMobile();
        }}
        title={isSessionLocked ? 'Click to sign in to station' : 'Click to switch active user account'}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {currentUser?.role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                ) : (
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                )}
                <span className="podoload-sidebar-user-role">
                  {currentUser?.role === 'admin' ? '🛡️ Administrator' : '🔬 Technician'}
                </span>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLogout();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title="Sign out and lock station"
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <LogOut className="w-3 h-3" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
            <div className="podoload-sidebar-user-name" style={{ marginTop: '2px' }}>{currentUser?.name}</div>
            <div className="podoload-sidebar-user-sub">Click to switch login ▾</div>
          </>
        )}
      </div>

      <div style={{ padding: '0.45rem 1.25rem 0.75rem', color: '#44666d', fontSize: '0.68rem', fontWeight: 600 }}>
        v1.0.29 · TechFile TF-001
      </div>
    </aside>
    </>
  );
};
