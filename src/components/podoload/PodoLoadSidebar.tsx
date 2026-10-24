import React from 'react';
import {
  UserPlus,
  Camera,
  BarChart2,
  FileText,
  Search,
  FolderArchive,
  Sliders,
  X,
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
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const PodoLoadSidebar: React.FC<PodoLoadSidebarProps> = ({
  currentSection,
  onNavigate,
  onStartNewExam,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const handleItemClick = (section: PodoLoadNavSection) => {
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
              PodoLoad
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
              <Camera className="podoload-nav-item-icon" />
              <span>Capture and process</span>
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

        {/* Section 3: SYSTEM */}
        <div className="podoload-nav-section">
          <div className="podoload-section-label">SYSTEM</div>
          <nav className="podoload-nav-list">
            <button
              type="button"
              className={`podoload-nav-item ${currentSection === 'settings' ? 'active' : ''}`}
              onClick={() => handleItemClick('settings')}
            >
              <Sliders className="podoload-nav-item-icon" />
              <span>Settings</span>
            </button>
          </nav>
        </div>
      </div>

      <div style={{ padding: '0.85rem 1.25rem', color: '#44666d', fontSize: '0.68rem', fontWeight: 600 }}>
        v1.0.29 · TechFile TF-001
      </div>
    </aside>
    </>
  );
};
