import React from 'react';
import {
  UserPlus,
  Camera,
  BarChart2,
  FileText,
  Search,
  FolderArchive,
  Sliders,
} from 'lucide-react';

export type PodoLoadNavSection =
  | 'registration'
  | 'capture'
  | 'process'
  | 'results'
  | 'report'
  | 'patient_search'
  | 'reports_cloud'
  | 'settings';

interface PodoLoadSidebarProps {
  currentSection: PodoLoadNavSection;
  onNavigate: (section: PodoLoadNavSection) => void;
  onStartNewExam: () => void;
}

export const PodoLoadSidebar: React.FC<PodoLoadSidebarProps> = ({
  currentSection,
  onNavigate,
  onStartNewExam,
}) => {
  return (
    <aside className="podoload-sidebar" aria-label="Main Navigation Sidebar">
      <div className="podoload-sidebar-top">
        {/* Brand Title Area */}
        <div className="podoload-brand-area">
          <h1 className="podoload-brand-title" onClick={onStartNewExam} style={{ cursor: 'pointer' }}>
            PodoLoad
          </h1>
        </div>

        {/* Section 1: NEW EXAM */}
        <div className="podoload-nav-section">
          <div className="podoload-section-label">NEW EXAM</div>
          <nav className="podoload-nav-list">
            <button
              type="button"
              className={`podoload-nav-item ${currentSection === 'registration' ? 'active' : ''}`}
              onClick={() => onNavigate('registration')}
            >
              <UserPlus className="podoload-nav-item-icon" />
              <span>Registration</span>
            </button>

            <button
              type="button"
              className={`podoload-nav-item ${currentSection === 'capture' || currentSection === 'process' ? 'active' : ''}`}
              onClick={() => onNavigate('capture')}
            >
              <Camera className="podoload-nav-item-icon" />
              <span>Capture and process</span>
            </button>

            <button
              type="button"
              className={`podoload-nav-item ${currentSection === 'results' ? 'active' : ''}`}
              onClick={() => onNavigate('results')}
            >
              <BarChart2 className="podoload-nav-item-icon" />
              <span>Results</span>
            </button>

            <button
              type="button"
              className={`podoload-nav-item ${currentSection === 'report' ? 'active' : ''}`}
              onClick={() => onNavigate('report')}
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
              onClick={() => onNavigate('patient_search')}
            >
              <Search className="podoload-nav-item-icon" />
              <span>Patient search</span>
            </button>

            <button
              type="button"
              className={`podoload-nav-item ${currentSection === 'reports_cloud' ? 'active' : ''}`}
              onClick={() => onNavigate('reports_cloud')}
            >
              <FolderArchive className="podoload-nav-item-icon" />
              <span>Reports and cloud</span>
            </button>
          </nav>
        </div>

        {/* Section 3: SYSTEM */}
        <div className="podoload-nav-section">
          <div className="podoload-section-label">SYSTEM</div>
          <nav className="podoload-nav-list">
            <button
              type="button"
              className={`podoload-nav-item ${currentSection === 'settings' ? 'active' : ''}`}
              onClick={() => onNavigate('settings')}
            >
              <Sliders className="podoload-nav-item-icon" />
              <span>Settings</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Subtle version footnote at the bottom of sidebar */}
      <div style={{ padding: '0.85rem 1.25rem', color: '#44666d', fontSize: '0.68rem', fontWeight: 600 }}>
        v1.0.24 · TechFile TF-001
      </div>
    </aside>
  );
};
