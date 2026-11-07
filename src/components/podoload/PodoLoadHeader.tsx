import React, { useState, useRef } from 'react';
import { Cloud, Globe, Menu, Building2, ShieldCheck, UserCheck, LogOut, KeyRound, Lock } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Patient } from '../../types';
import { PodoLoadNavSection } from './PodoLoadSidebar';
import { SystemUserSession, SYSTEM_ACCOUNTS, dbService } from '../../services/dbService';

interface PodoLoadHeaderProps {
  currentSection: PodoLoadNavSection;
  currentStep: 1 | 2 | 3 | 4 | 5;
  onStepChange: (step: 1 | 2 | 3 | 4 | 5) => void;
  selectedPatient?: Patient;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cloudSynced: boolean;
  onOpenCloud: () => void;
  pendingSyncCount?: number;
  isSyncing?: boolean;
  onTriggerSync?: () => void;
  doctorName?: string;
  clinicName?: string;
  currentUser?: SystemUserSession;
  isSessionLocked?: boolean;
  onOpenUserSwitcher?: () => void;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
  onOpenMobileMenu?: () => void;
}

export const PodoLoadHeader: React.FC<PodoLoadHeaderProps> = ({
  currentSection,
  currentStep,
  onStepChange,
  selectedPatient,
  searchQuery,
  onSearchChange,
  cloudSynced,
  onOpenCloud,
  pendingSyncCount = 0,
  isSyncing = false,
  onTriggerSync,
  doctorName = 'Dr. Specialist',
  clinicName = 'Technomind Healthcare Systems',
  currentUser = SYSTEM_ACCOUNTS.admin,
  isSessionLocked = false,
  onOpenUserSwitcher,
  onLogout,
  onOpenAdmin,
  onOpenMobileMenu,
}) => {
  const isMobileDevice =
    Capacitor.isNativePlatform() ||
    (typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
        (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))));

  // Compute breadcrumb title based on current view/step
  const getHeaderTitle = () => {
    if (currentSection === 'patient_search') return 'Patient records · Search directory';
    if (currentSection === 'reports_cloud') return 'Clinical records · Reports and cloud archive';
    if (currentSection === 'database') return 'Database records · Inbuilt database explorer';
    if (currentSection === 'settings') return 'System · Clinical device settings';
    if (currentSection === 'admin') return 'Administration · Hospital profile & report branding';

    switch (currentStep) {
      case 1:
        return 'New exam · Patient registration';
      case 2:
        return isMobileDevice
          ? 'New exam · Capture left and right foot'
          : 'New exam · Scan left and right foot';
      case 3:
        return 'New exam · Process images';
      case 4:
        return 'New exam · Processed results';
      case 5:
        return 'New exam · Report';
      default:
        return 'New exam';
    }
  };

  const isExamFlow = [
    'registration',
    'capture',
    'process',
    'results',
    'report',
  ].includes(currentSection);

  const isStationAdminAllowed = dbService.isStationAdminLoginAllowed();

  // Discreet 5-tap header lock gesture tracking for discrete Master Admin access
  const [headerTapCount, setHeaderTapCount] = useState(0);
  const lastHeaderTapRef = useRef<number>(0);

  const handleHeaderTap = () => {
    const now = Date.now();
    if (now - lastHeaderTapRef.current < 700) {
      const next = headerTapCount + 1;
      if (next >= 5) {
        setHeaderTapCount(0);
        onOpenAdmin?.();
      } else {
        setHeaderTapCount(next);
      }
    } else {
      setHeaderTapCount(1);
    }
    lastHeaderTapRef.current = now;
  };

  return (
    <header className="podoload-top-header">
      {/* Top Row: Title, Search, Status & Profile */}
      <div className="podoload-top-header-row">
        <div className="podoload-header-left">
          {onOpenMobileMenu && (
            <button
              type="button"
              className="podoload-mobile-menu-btn"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 text-[#0e7477]" />
            </button>
          )}
          <div
            className="podoload-header-title-block"
            onClick={handleHeaderTap}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem', userSelect: 'none', minWidth: 0, flexShrink: 1, overflow: 'hidden' }}
            title="Hospital Diagnostic Station (Tap 5x for Master Administrator Portal)"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400 opacity-60 flex-shrink-0" />
            <h2 className="podoload-header-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getHeaderTitle()}</h2>
          </div>
        </div>

        {/* Global Patient / Exam Search */}
        <div className="podoload-global-search">
          <input
            type="text"
            placeholder="Search patients, IDs, reports"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Right Status Group */}
        <div className="podoload-top-right-actions">
          {/* Cloud Synced Pill Badge */}
          <button
            type="button"
            className="podoload-synced-pill"
            onClick={onTriggerSync || onOpenCloud}
            title={
              !cloudSynced
                ? 'Device Offline — All reports stored locally in IndexedDB'
                : pendingSyncCount > 0
                ? `${pendingSyncCount} offline report(s) ready to sync. Click to sync now.`
                : 'Cloud: All reports synchronized'
            }
            style={{
              border: 'none',
              cursor: 'pointer',
              backgroundColor: !cloudSynced ? '#fef3c7' : pendingSyncCount > 0 ? '#eff6ff' : '#ecfdf5',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <Cloud
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                !cloudSynced
                  ? 'text-amber-600'
                  : isSyncing || pendingSyncCount > 0
                  ? 'text-blue-600 animate-pulse'
                  : 'text-emerald-600'
              }`}
            />
            <span
              style={{
                color: !cloudSynced ? '#b45309' : pendingSyncCount > 0 ? '#1d4ed8' : '#047857',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {!cloudSynced
                ? 'Offline'
                : isSyncing
                ? 'Syncing...'
                : pendingSyncCount > 0
                ? `${pendingSyncCount} pending`
                : 'Synced'}
            </span>
          </button>

          {/* Language Selector */}
          <div className="podoload-lang-badge" title="Language: English" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Globe className="w-3 h-3 mr-1 inline opacity-70" />
            <span>EN</span>
          </div>

          {/* Active Hospital Pill */}
          {clinicName && (
            <button
              type="button"
              className="podoload-lang-badge"
              onClick={(!isMobileDevice && isStationAdminAllowed) ? onOpenAdmin : undefined}
              title={(!isMobileDevice && isStationAdminAllowed) ? "Active Hospital Account (Click to open Admin Panel)" : `Facility: ${clinicName}`}
              style={{
                cursor: (!isMobileDevice && isStationAdminAllowed) ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#f0fdf4',
                borderColor: '#bbf7d0',
                color: '#166534',
                fontWeight: 700,
                fontSize: '0.72rem',
                padding: '0.2rem 0.55rem',
                maxWidth: '180px',
                flexShrink: 1,
              }}
            >
              <Building2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clinicName}</span>
            </button>
          )}

          {/* Role & User Login Switcher Badge / Sign In Button */}
          {isSessionLocked ? (
            <button
              type="button"
              onClick={onOpenUserSwitcher}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                fontSize: '0.74rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(13,148,136,0.2)',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
              title="Workstation session signed out. Click to sign in."
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`podoload-role-badge ${currentUser.role === 'superadmin' ? 'role-superadmin' : currentUser.role === 'admin' ? 'role-admin' : 'role-tech'}`}
                onClick={onOpenUserSwitcher}
                title={`Active: ${currentUser.title} (${currentUser.username}). Click to switch role.`}
                style={{
                  maxWidth: '220px',
                  flexShrink: 1,
                  ...(currentUser.role === 'superadmin' ? { backgroundColor: '#f3e8ff', color: '#7e22ce', borderColor: '#d8b4fe' } : {})
                }}
              >
                {currentUser.role === 'superadmin' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👑 Super Admin: {currentUser.name} ▾</span>
                  </>
                ) : currentUser.role === 'admin' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Admin: {currentUser.name} ▾</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Tech: {currentUser.name} ▾</span>
                  </>
                )}
              </button>

              {/* Quick Logout Button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out of station and end current clinical session"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fff5f5',
                    color: '#dc2626',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span>Sign Out</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Second Row: Step Wizard Capsules & Selected Patient Badge */}
      {isExamFlow && (
        <div className="podoload-top-header-row" style={{ marginTop: '0.15rem' }}>
          {/* Stepper Capsules */}
          <nav className="podoload-stepper-row" aria-label="Exam Progress Steps">
            <button
              type="button"
              className={`podoload-step-pill ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
              onClick={() => onStepChange(1)}
            >
              1 Registration
            </button>

            <button
              type="button"
              className={`podoload-step-pill ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
              onClick={() => onStepChange(2)}
            >
              2 Capture
            </button>

            <button
              type="button"
              className={`podoload-step-pill ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}
              onClick={() => onStepChange(3)}
            >
              3 Process
            </button>

            <button
              type="button"
              className={`podoload-step-pill ${currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : ''}`}
              onClick={() => onStepChange(4)}
            >
              4 Results
            </button>

            <button
              type="button"
              className={`podoload-step-pill ${currentStep === 5 ? 'active' : ''}`}
              onClick={() => onStepChange(5)}
            >
              5 Report
            </button>
          </nav>

          {/* Right Selected Patient Badge (Steps 2 - 5) */}
          {selectedPatient && currentStep >= 2 && (
            <div className="podoload-selected-patient-badge">
              {selectedPatient.name} · ID {selectedPatient.mrn || '00000'} · {selectedPatient.dateOfBirth ? `${new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()}y` : '42y'} · {selectedPatient.gender?.toLowerCase() || 'male'}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
