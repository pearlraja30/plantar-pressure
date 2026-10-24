import React from 'react';
import { Cloud, Globe, Menu } from 'lucide-react';
import { Patient } from '../../types';
import { PodoLoadNavSection } from './PodoLoadSidebar';

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
  doctorName = 'Dr. [Name]',
  onOpenMobileMenu,
}) => {
  // Compute breadcrumb title based on current view/step
  const getHeaderTitle = () => {
    if (currentSection === 'patient_search') return 'Patient records · Search directory';
    if (currentSection === 'reports_cloud') return 'Clinical records · Reports and cloud archive';
    if (currentSection === 'settings') return 'System · Clinical device settings';

    switch (currentStep) {
      case 1:
        return 'New exam · Patient registration';
      case 2:
        return 'New exam · Capture left and right foot';
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

          {/* Doctor Profile Name */}
          <div className="podoload-doctor-tag">{doctorName}</div>
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
              [{selectedPatient.name}] · ID [{selectedPatient.mrn || '00000'}] · [
              {selectedPatient.dateOfBirth ? `${new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()}y` : '42y'}
              ] · [{selectedPatient.gender?.toLowerCase() || 'male'}]
            </div>
          )}
        </div>
      )}
    </header>
  );
};
