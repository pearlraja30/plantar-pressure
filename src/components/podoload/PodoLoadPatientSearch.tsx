import React, { useState, useMemo } from 'react';
import { Patient, AnalysisCase } from '../../types';
import { Plus, Filter, Calendar, FileText, Activity } from 'lucide-react';

interface PodoLoadPatientSearchProps {
  patients: Patient[];
  cases: AnalysisCase[];
  selectedPatientId?: string;
  onSelectPatient: (patient: Patient) => void;
  onSelectCase?: (caseId: string, viewStep?: 4 | 5) => void;
  onStartNewExamForPatient: (patient: Patient) => void;
  onDeletePatient?: (id: string) => void;
  onAddNewPatient?: () => void;
}

export const PodoLoadPatientSearch: React.FC<PodoLoadPatientSearchProps> = ({
  patients,
  cases,
  selectedPatientId,
  onSelectPatient,
  onSelectCase,
  onStartNewExamForPatient,
  onAddNewPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'All' | 'Recent' | 'Pending report'>('All');

  // Examination history time filter
  const [examTimeMode, setExamTimeMode] = useState<'all' | 'year' | 'month'>('all');
  const [selectedExamYear, setSelectedExamYear] = useState<string>('');
  const [selectedExamMonth, setSelectedExamMonth] = useState<string>('');

  // Currently selected or first patient
  const activePatient =
    patients.find((p) => p.id === selectedPatientId) || (patients.length > 0 ? patients[0] : null);

  // Form edit states for Patient Details card
  const [editName, setEditName] = useState(activePatient?.name || 'Clinical Patient');
  const [editId, setEditId] = useState(activePatient?.mrn || '00000');
  const [editAge, setEditAge] = useState(
    activePatient?.dateOfBirth
      ? `${new Date().getFullYear() - new Date(activePatient.dateOfBirth).getFullYear()}`
      : '42'
  );
  const [editGender, setEditGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [editMobile, setEditMobile] = useState(activePatient?.phone || '+1 555-019-2834');

  // Sync edit state when active patient changes
  React.useEffect(() => {
    if (activePatient) {
      setEditName(activePatient.name);
      setEditId(activePatient.mrn || '00000');
      if (activePatient.dateOfBirth) {
        setEditAge(`${new Date().getFullYear() - new Date(activePatient.dateOfBirth).getFullYear()}`);
      }
      setEditGender(
        activePatient.gender === 'Female' ? 'Female' : activePatient.gender === 'Other' ? 'Other' : 'Male'
      );
      setEditMobile(activePatient.phone || '+1 555-019-2834');
    }
  }, [activePatient]);

  // Filter patients
  const filteredPatients = patients.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.mrn || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  });

  // Patient exams with date/month/year filtering
  const allPatientExams = useMemo(() => {
    return cases.filter((c) => activePatient && c.patientId === activePatient.id);
  }, [cases, activePatient]);

  const examYears = useMemo(() => {
    const years = new Set<string>();
    allPatientExams.forEach((c) => {
      if (c.createdAt) years.add(new Date(c.createdAt).getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allPatientExams]);

  const examMonths = useMemo(() => {
    const map = new Map<string, string>();
    allPatientExams.forEach((c) => {
      if (c.createdAt) {
        const d = new Date(c.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
        map.set(key, label);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allPatientExams]);

  const patientExams = useMemo(() => {
    return allPatientExams
      .filter((c) => {
        if (!c.createdAt) return true;
        const d = new Date(c.createdAt);
        if (examTimeMode === 'year' && selectedExamYear) {
          if (d.getFullYear().toString() !== selectedExamYear) return false;
        } else if (examTimeMode === 'month' && selectedExamMonth) {
          const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (mKey !== selectedExamMonth) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allPatientExams, examTimeMode, selectedExamYear, selectedExamMonth]);

  // Get initials
  const getInitials = (name: string) => {
    if (!name || name === 'Clinical Patient') return 'PN';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name.substring(0, 2) || 'PN').toUpperCase();
  };

  return (
    <div className="podoload-patient-search-layout">
      {/* ================= LEFT COLUMN: PATIENT SEARCH LIST ================= */}
      <div className="podoload-card podoload-patient-search-sidebar" style={{ padding: '0.85rem' }}>
        <h4 className="podoload-card-title" style={{ margin: 0 }}>
          PATIENT SEARCH
        </h4>

        {/* Search input matching Screenshot 3 */}
        <input
          type="text"
          className="podoload-input"
          placeholder="Name, ID or mobile"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Filter buttons matching Screenshot 3: All | Recent | Pending report */}
        <div className="podoload-segmented-buttons" style={{ width: '100%' }}>
          <button
            type="button"
            className={`podoload-seg-btn ${filterMode === 'All' ? 'active' : ''}`}
            onClick={() => setFilterMode('All')}
          >
            All
          </button>
          <button
            type="button"
            className={`podoload-seg-btn ${filterMode === 'Recent' ? 'active' : ''}`}
            onClick={() => setFilterMode('Recent')}
          >
            Recent
          </button>
          <button
            type="button"
            className={`podoload-seg-btn ${filterMode === 'Pending report' ? 'active' : ''}`}
            onClick={() => setFilterMode('Pending report')}
          >
            Pending report
          </button>
        </div>

        {/* Patient list with circular initials badge matching Screenshot 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, maxHeight: '520px' }}>
          {filteredPatients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#657e84', fontSize: '0.75rem' }}>
              No registered patients found. Click below to add.
            </div>
          ) : (
            filteredPatients.map((pat) => {
              const isSelected = activePatient?.id === pat.id;
              const calcAge = pat.dateOfBirth
                ? `${new Date().getFullYear() - new Date(pat.dateOfBirth).getFullYear()}y`
                : '42y';
              const pGender = pat.gender ? pat.gender.toLowerCase() : 'male';

              return (
                <div
                  key={pat.id}
                  className={`podoload-patient-item-row ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectPatient(pat)}
                >
                  <div className="podoload-patient-avatar-circle">
                    {getInitials(pat.name)}
                  </div>
                  <div className="podoload-patient-item-details">
                    <span className="podoload-patient-item-name">{pat.name || 'Clinical Patient'}</span>
                    <span className="podoload-patient-item-sub">
                      ID {pat.mrn || '00000'} · {calcAge} · {pGender}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Button: + New Patient matching Screenshot 3 */}
        <button
          type="button"
          className="podoload-btn-primary"
          style={{ width: '100%', marginTop: 'auto' }}
          onClick={() => {
            if (onAddNewPatient) onAddNewPatient();
          }}
        >
          <Plus className="w-3.5 h-3.5 mr-1 inline" />
          + New patient
        </button>
      </div>

      {/* ================= RIGHT COLUMN: DETAILS & EXAMINATION HISTORY ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
        {/* Card 1: PATIENT DETAILS matching Screenshot 3 */}
        <div className="podoload-card" style={{ padding: '0.85rem' }}>
          <h4 className="podoload-card-title" style={{ marginBottom: '0.75rem' }}>
            PATIENT DETAILS
          </h4>

          {/* Row 1: Patient Name & Patient ID */}
          <div className="podoload-form-row podoload-row-name-id" style={{ marginBottom: '0.75rem' }}>
            <div className="podoload-form-group">
              <label className="podoload-label">Patient name</label>
              <input
                type="text"
                className="podoload-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="podoload-form-group">
              <label className="podoload-label">Patient ID</label>
              <input
                type="text"
                className="podoload-input"
                value={editId}
                onChange={(e) => setEditId(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Age, Gender Segmented Buttons & Mobile number */}
          <div className="podoload-form-row podoload-row-demographics" style={{ marginBottom: '1rem' }}>
            <div className="podoload-form-group podoload-fg-age">
              <label className="podoload-label">Age</label>
              <input
                type="text"
                className="podoload-input"
                value={editAge}
                onChange={(e) => setEditAge(e.target.value)}
              />
            </div>

            <div className="podoload-form-group podoload-fg-gender">
              <label className="podoload-label">Gender</label>
              <div className="podoload-segmented-buttons">
                <button
                  type="button"
                  className={`podoload-seg-btn ${editGender === 'Male' ? 'active' : ''}`}
                  onClick={() => setEditGender('Male')}
                >
                  Male
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${editGender === 'Female' ? 'active' : ''}`}
                  onClick={() => setEditGender('Female')}
                >
                  Female
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${editGender === 'Other' ? 'active' : ''}`}
                  onClick={() => setEditGender('Other')}
                >
                  Other
                </button>
              </div>
            </div>

            <div className="podoload-form-group podoload-fg-mobile">
              <label className="podoload-label">Mobile number</label>
              <input
                type="text"
                className="podoload-input"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
              />
            </div>
          </div>

          {/* Actions: Save changes & Start new exam */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="podoload-btn-secondary"
              onClick={() => {
                // save local edits
              }}
            >
              Save changes
            </button>

            <button
              type="button"
              className="podoload-btn-primary"
              onClick={() => {
                if (activePatient) {
                  onStartNewExamForPatient(activePatient);
                }
              }}
            >
              Start new exam
            </button>
          </div>
        </div>

        {/* Card 2: EXAMINATION HISTORY matching Screenshot 3 */}
        <div className="podoload-card" style={{ padding: '0.85rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h4 className="podoload-card-title" style={{ margin: 0 }}>
              EXAMINATION HISTORY ({allPatientExams.length})
            </h4>

            {/* Time Filter Tabs: All | By Year | By Month */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div className="podoload-segmented-buttons" style={{ height: '26px' }}>
                <button
                  type="button"
                  className={`podoload-seg-btn ${examTimeMode === 'all' ? 'active' : ''}`}
                  onClick={() => setExamTimeMode('all')}
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}
                >
                  All ({allPatientExams.length})
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${examTimeMode === 'year' ? 'active' : ''}`}
                  onClick={() => {
                    setExamTimeMode('year');
                    if (!selectedExamYear && examYears.length > 0) setSelectedExamYear(examYears[0]);
                  }}
                  disabled={examYears.length === 0}
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}
                >
                  By Year
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${examTimeMode === 'month' ? 'active' : ''}`}
                  onClick={() => {
                    setExamTimeMode('month');
                    if (!selectedExamMonth && examMonths.length > 0) setSelectedExamMonth(examMonths[0][0]);
                  }}
                  disabled={examMonths.length === 0}
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}
                >
                  By Month
                </button>
              </div>

              {/* Year Dropdown */}
              {examTimeMode === 'year' && examYears.length > 0 && (
                <select
                  className="podoload-input podoload-select podoload-select-sm"
                  value={selectedExamYear}
                  onChange={(e) => setSelectedExamYear(e.target.value)}
                  style={{ height: '26px', fontSize: '0.68rem', padding: '0 0.4rem' }}
                >
                  {examYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              )}

              {/* Month Dropdown */}
              {examTimeMode === 'month' && examMonths.length > 0 && (
                <select
                  className="podoload-input podoload-select podoload-select-sm"
                  value={selectedExamMonth}
                  onChange={(e) => setSelectedExamMonth(e.target.value)}
                  style={{ height: '26px', fontSize: '0.68rem', padding: '0 0.4rem' }}
                >
                  {examMonths.map(([mKey, mLabel]) => (
                    <option key={mKey} value={mKey}>
                      {mLabel}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table className="podoload-metrics-table" style={{ width: '100%', fontSize: '0.76rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>DATE</th>
                  <th style={{ textAlign: 'left' }}>FEET</th>
                  <th style={{ textAlign: 'left' }}>FINDINGS</th>
                  <th style={{ textAlign: 'left' }}>REPORT</th>
                  <th style={{ textAlign: 'left' }}>DATABASE</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {patientExams.length > 0 ? (
                  patientExams.map((exam) => (
                    <tr key={exam.id}>
                      <td style={{ color: '#0c2328' }}>
                        {new Date(exam.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td>{exam.footSide || 'Left, Right'}</td>
                      <td>
                        {exam.regionalAnalysis?.archClassification || 'Normal Arch'}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--podo-primary)' }}>
                        {exam.caseNumber || 'RPT-0001'}
                      </td>
                      <td>
                        <span className="podo-badge podo-badge-green">
                          {exam.syncStatus === 'synced' ? 'Synced' : 'Saved in DB'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="podo-link-btn"
                          onClick={() => {
                            if (onSelectCase) {
                              onSelectCase(exam.id, 5);
                            } else if (activePatient) {
                              onStartNewExamForPatient(activePatient);
                            }
                          }}
                          title="Open historical report with complete scans and heatmaps"
                        >
                          View Report
                        </button>
                        <button
                          type="button"
                          className="podo-link-btn"
                          style={{ marginLeft: '0.6rem' }}
                          onClick={() => {
                            if (activePatient) onStartNewExamForPatient(activePatient);
                          }}
                          title="Start new examination for this patient"
                        >
                          Re-scan
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#657e84', fontSize: '0.78rem' }}>
                      {allPatientExams.length === 0
                        ? 'No examination history recorded yet for this patient. Click "Start new exam" above to begin.'
                        : 'No examinations match the selected time filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
