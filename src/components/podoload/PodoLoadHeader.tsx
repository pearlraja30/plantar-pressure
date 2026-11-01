import React from 'react';
import { Cloud, Globe, Menu, Building2, ShieldCheck, UserCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Patient } from '../../types';
import { PodoLoadNavSection } from './PodoLoadSidebar';
import { SystemUserSession, SYSTEM_ACCOUNTS } from '../../services/dbService';

interface PodoLoadHeaderProps {
  currentSection: PodoLoadNavSection;
  currentStep: 1 | 2 | 3 | 4 | 5;
  onStepChange: (step: 1 | 2 | 3 | 4 | 5) => void;
  selectedPatient?: Patient;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cloudSynced: boolean;
  onOpenCloud: () => void;
  doctorName?: string;
  clinicName?: string;
  currentUser?: SystemUserSession;
  onOpenUserSwitcher?: () => void;
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
  doctorName = 'Dr. Specialist',
  clinicName = 'Technomind Healthcare Systems',
  currentUser = SYSTEM_ACCOUNTS.admin,
  onOpenUserSwitcher,
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
          <div className="podoload-header-title-block">
            <h2 className="podoload-header-title">{getHeaderTitle()}</h2>
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
            onClick={onOpenCloud}
            title="Cloud synchronization status"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>{cloudSynced ? 'Cloud: synced' : 'Cloud: queued'}</span>
          </button>

          {/* Language Selector */}
          <div className="podoload-lang-badge" title="Language: English">
            <Globe className="w-3 h-3 mr-1 inline opacity-70" />
            <span>EN</span>
          </div>

          {/* Active Hospital Pill */}
          {clinicName && (
            <button
              type="button"
              className="podoload-lang-badge"
              onClick={onOpenAdmin}
              title="Active Hospital Account (Click to open Admin Panel)"
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#f0fdf4',
                borderColor: '#bbf7d0',
                color: '#166534',
                fontWeight: 700,
                fontSize: '0.72rem',
                padding: '0.2rem 0.55rem',
              }}
            >
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <span>{clinicName}</span>
            </button>
          )}

          {/* Role & User Login Switcher Badge */}
          <button
            type="button"
            className={`podoload-role-badge ${currentUser.role === 'admin' ? 'role-admin' : 'role-tech'}`}
            onClick={onOpenUserSwitcher}
            title={`Active: ${currentUser.title} (${currentUser.username}). Click to switch role.`}
          >
            {currentUser.role === 'admin' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin: {currentUser.name} ▾</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Tech: {currentUser.name} ▾</span>
              </>
            )}
          </button>
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
