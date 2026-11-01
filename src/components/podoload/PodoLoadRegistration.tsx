import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Sparkles,
  Check,
  Database,
  FileText,
  Activity,
  Plus,
  Calendar,
  Filter,
  Search,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Patient, AnalysisCase, PatientIdConfig, PatientIdMode } from '../../types';
import { dbService } from '../../services/dbService';

interface PodoLoadRegistrationProps {
  patients: Patient[];
  cases?: AnalysisCase[];
  selectedPatient?: Patient;
  onSavePatient: (patient: Patient) => void;
  onSelectPatient: (patient: Patient | undefined) => void;
  onSelectReport?: (caseId: string, viewStep?: 4 | 5) => void;
  onStartNewReportForPatient?: (patient: Patient) => void;
  onCancel: () => void;
}

/**
 * Formats ISO timestamps into human-readable clinical dates
 */
function formatExamDate(dateStr?: string): string {
  if (!dateStr) return 'Recent';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function parseCaseDate(createdAt?: string): Date | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  return isNaN(d.getTime()) ? null : d;
}

export const PodoLoadRegistration: React.FC<PodoLoadRegistrationProps> = ({
  patients,
  cases = [],
  selectedPatient,
  onSavePatient,
  onSelectPatient,
  onSelectReport,
  onStartNewReportForPatient,
  onCancel,
}) => {
  // Explicitly track the active record ID (to distinguish new vs editing existing)
  const [activeRecordId, setActiveRecordId] = useState<string | null>(selectedPatient?.id || null);

  // Patient ID Configuration State (Loaded from Inbuilt Database)
  const [idConfig, setIdConfig] = useState<PatientIdConfig>(() => dbService.getPatientIdConfigSync());
  const [showIdConfig, setShowIdConfig] = useState<boolean>(false);
  const [idSavedMessage, setIdSavedMessage] = useState<boolean>(false);

  // Form State initialized with selected patient or auto-generated alphanumeric ID
  const [name, setName] = useState(selectedPatient?.name || '');
  const [patientId, setPatientId] = useState(
    selectedPatient?.mrn || dbService.generatePatientId(idConfig)
  );
  const [age, setAge] = useState(
    selectedPatient?.dateOfBirth
      ? String(new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear())
      : ''
  );
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(selectedPatient?.gender || 'Male');
  const [mobile, setMobile] = useState(selectedPatient?.phone || '');
  const [heightCm, setHeightCm] = useState(selectedPatient?.heightCm ? String(selectedPatient.heightCm) : '');
  const [weightKg, setWeightKg] = useState(selectedPatient?.weightKg ? String(selectedPatient.weightKg) : '');
  const [referringDoctor, setReferringDoctor] = useState(selectedPatient?.referringDoctor || '');
  const [clinicalHistory, setClinicalHistory] = useState(selectedPatient?.clinicalNotes || '');

  // Time filter states for historical reports
  const [timeFilterMode, setTimeFilterMode] = useState<'all' | 'year' | 'month' | 'date'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');

  // Search filter for existing patients list
  const [searchQuery, setSearchQuery] = useState('');

  // Active patient object: either from activeRecordId or selectedPatient prop
  const activePatient = activeRecordId
    ? patients.find((p) => p.id === activeRecordId) || selectedPatient
    : selectedPatient || null;

  // Filter cases strictly associated with the active patient from Inbuilt Database
  const patientCases = useMemo(() => {
    if (!activePatient || !cases) return [];
    return cases.filter((c) => c.patientId === activePatient.id);
  }, [activePatient, cases]);

  // Derived available years for filtering
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    patientCases.forEach((c) => {
      const d = parseCaseDate(c.createdAt);
      if (d) years.add(d.getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [patientCases]);

  // Derived available months for filtering
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    patientCases.forEach((c) => {
      const d = parseCaseDate(c.createdAt);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
        map.set(key, label);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [patientCases]);

  // Derived available dates for filtering
  const availableDates = useMemo(() => {
    const map = new Map<string, string>();
    patientCases.forEach((c) => {
      const d = parseCaseDate(c.createdAt);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        map.set(key, label);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [patientCases]);

  // Filtered and sorted patient reports
  const filteredPatientReports = useMemo(() => {
    return patientCases
      .filter((c) => {
        const d = parseCaseDate(c.createdAt);
        if (!d) return true;

        if (timeFilterMode === 'year' && selectedYear) {
          if (d.getFullYear().toString() !== selectedYear) return false;
        } else if (timeFilterMode === 'month' && selectedMonth) {
          const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (mKey !== selectedMonth) return false;
        } else if (timeFilterMode === 'date' && selectedDate) {
          const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (dKey !== selectedDate) return false;
        }

        if (reportSearchQuery.trim()) {
          const q = reportSearchQuery.toLowerCase();
          const matchNum = (c.caseNumber || '').toLowerCase().includes(q);
          const matchFoot = (c.footSide || '').toLowerCase().includes(q);
          const matchInd = (c.indication || '').toLowerCase().includes(q);
          const matchArch = (c.regionalAnalysis?.archClassification || '').toLowerCase().includes(q);
          if (!matchNum && !matchFoot && !matchInd && !matchArch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const tA = parseCaseDate(a.createdAt)?.getTime() || 0;
        const tB = parseCaseDate(b.createdAt)?.getTime() || 0;
        return tB - tA;
      });
  }, [patientCases, timeFilterMode, selectedYear, selectedMonth, selectedDate, reportSearchQuery]);

  // Load latest ID configuration from Database on mount
  useEffect(() => {
    dbService.getPatientIdConfig().then((loadedConfig) => {
      setIdConfig(loadedConfig);
      if (!selectedPatient && !patientId) {
        setPatientId(dbService.generatePatientId(loadedConfig));
      }
    });
  }, [selectedPatient, patientId]);

  // Sync if selectedPatient prop updates
  useEffect(() => {
    if (selectedPatient) {
      setActiveRecordId(selectedPatient.id);
      setName(selectedPatient.name);
      setPatientId(selectedPatient.mrn);
      setAge(
        selectedPatient.dateOfBirth
          ? String(new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear())
          : ''
      );
      setGender(selectedPatient.gender || 'Male');
      setMobile(selectedPatient.phone || '');
      setHeightCm(selectedPatient.heightCm ? String(selectedPatient.heightCm) : '');
      setWeightKg(selectedPatient.weightKg ? String(selectedPatient.weightKg) : '');
      setReferringDoctor(selectedPatient.referringDoctor || '');
      setClinicalHistory(selectedPatient.clinicalNotes || '');
    }
  }, [selectedPatient]);

  const handleAutoGenerateId = (customCfg?: Partial<PatientIdConfig>) => {
    const activeCfg = { ...idConfig, ...customCfg };
    const generated = dbService.generatePatientId(activeCfg);
    setPatientId(generated);
  };

  const handleStartNewPatient = () => {
    setActiveRecordId(null);
    setName('');
    const newId = dbService.generatePatientId(idConfig);
    setPatientId(newId);
    setAge('');
    setGender('Male');
    setMobile('');
    setHeightCm('');
    setWeightKg('');
    setReferringDoctor('');
    setClinicalHistory('');
    setTimeFilterMode('all');
    setReportSearchQuery('');
    onSelectPatient(undefined);
  };

  const handleSwitchPatient = () => {
    setActiveRecordId(null);
    onSelectPatient(undefined);
  };

  const handleSelectExistingPatient = (pat: Patient) => {
    setActiveRecordId(pat.id);
    setName(pat.name);
    setPatientId(pat.mrn);
    setAge(
      pat.dateOfBirth
        ? String(new Date().getFullYear() - new Date(pat.dateOfBirth).getFullYear())
        : ''
    );
    setGender(pat.gender || 'Male');
    setMobile(pat.phone || '');
    setHeightCm(pat.heightCm ? String(pat.heightCm) : '');
    setWeightKg(pat.weightKg ? String(pat.weightKg) : '');
    setReferringDoctor(pat.referringDoctor || '');
    setClinicalHistory(pat.clinicalNotes || '');
    setTimeFilterMode('all');
    setReportSearchQuery('');
    onSelectPatient(pat);
  };

  const handleSaveIdConfig = async (newCfg: Partial<PatientIdConfig>) => {
    const updated = await dbService.savePatientIdConfig(newCfg);
    setIdConfig(updated);
    setIdSavedMessage(true);
    setTimeout(() => setIdSavedMessage(false), 2000);
    handleAutoGenerateId(updated);
  };

  const buildCurrentPatientRecord = (): Patient => {
    const finalId = patientId.trim() || dbService.generatePatientId(idConfig);
    const finalName = name.trim() || 'Clinical Patient';
    const numAge = parseInt(age, 10) || 40;
    const birthYear = new Date().getFullYear() - numAge;

    return {
      id: activeRecordId || selectedPatient?.id || 'pat-' + Math.random().toString(36).substring(2, 9),
      mrn: finalId,
      name: finalName,
      dateOfBirth: `${birthYear}-01-01`,
      gender,
      phone: mobile,
      heightCm: parseFloat(heightCm) || 172,
      weightKg: parseFloat(weightKg) || 74,
      referringDoctor: referringDoctor,
      clinicalNotes: clinicalHistory,
      createdAt: activePatient?.createdAt || selectedPatient?.createdAt || new Date().toISOString(),
    };
  };

  const handleSaveAndContinue = () => {
    const patientRecord = buildCurrentPatientRecord();
    onSavePatient(patientRecord);
  };

  const handleStartNewReportAction = () => {
    const patientRecord = buildCurrentPatientRecord();
    onSavePatient(patientRecord);
    if (onStartNewReportForPatient) {
      onStartNewReportForPatient(patientRecord);
    } else {
      handleSaveAndContinue();
    }
  };

  // Helper for initials
  const getInitials = (patientName?: string) => {
    if (!patientName) return 'PN';
    const parts = patientName.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (patientName.substring(0, 2) || 'PN').toUpperCase();
  };

  // Filter existing patients
  const filteredPatients = patients.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.mrn || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="podoload-registration-wrapper">
      {/* Responsive Registration Grid */}
      <div className="podoload-registration-grid">
        {/* Left Panel: Patient Registration Form */}
        <div className="podoload-card podoload-registration-form-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 className="podoload-card-title" style={{ margin: 0 }}>PATIENT REGISTRATION</h3>
            <button
              type="button"
              className="podoload-btn-secondary podoload-btn-sm"
              onClick={handleStartNewPatient}
              title="Clear form and register a new patient"
            >
              + New Patient
            </button>
          </div>

          {/* Row 1: Patient Name & Patient ID */}
          <div className="podoload-form-row podoload-row-name-id">
            <div className="podoload-form-group">
              <label className="podoload-label">Patient name</label>
              <input
                type="text"
                className="podoload-input"
                placeholder="Enter patient full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="podoload-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="podoload-label" style={{ margin: 0 }}>
                  Patient ID <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>(Alphanumeric)</span>
                </label>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: showIdConfig ? 'var(--podo-primary)' : '#556f75',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontWeight: 600,
                  }}
                  onClick={() => setShowIdConfig(!showIdConfig)}
                  title="Configure Alphanumeric Patient ID Format in Database"
                >
                  <Settings style={{ width: '12px', height: '12px' }} />
                  <span>Format ({idConfig.prefix}*)</span>
                </button>
              </div>

              <div className="podoload-input-with-action" style={{ marginTop: '0.35rem' }}>
                <input
                  type="text"
                  className="podoload-input"
                  placeholder={`e.g. ${dbService.generatePatientId(idConfig)}`}
                  value={patientId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPatientId(idConfig.autoUppercase ? val.toUpperCase() : val);
                  }}
                />
                <button
                  type="button"
                  className="podoload-btn-secondary podoload-btn-sm"
                  onClick={() => handleAutoGenerateId()}
                  title="Generate Auto Alphanumeric ID"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Sparkles style={{ width: '12px', height: '12px' }} />
                  <span>Auto</span>
                </button>
              </div>

              {/* Inline Alphanumeric ID Configuration Drawer */}
              {showIdConfig && (
                <div
                  style={{
                    marginTop: '0.65rem',
                    padding: '0.75rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8' }}>
                      ⚙️ Patient ID Generator Config (Inbuilt DB)
                    </span>
                    {idSavedMessage && (
                      <span style={{ fontSize: '0.7rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Check style={{ width: '12px', height: '12px' }} /> Saved to DB!
                      </span>
                    )}
                  </div>

                  {/* Prefix & Length */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                        Prefix (e.g. PP-, PAT-)
                      </label>
                      <input
                        type="text"
                        className="podoload-input"
                        style={{ height: '30px', fontSize: '0.75rem' }}
                        value={idConfig.prefix}
                        onChange={(e) =>
                          setIdConfig((prev) => ({
                            ...prev,
                            prefix: e.target.value.toUpperCase(),
                          }))
                        }
                      />
                    </div>

                    <div style={{ width: '90px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                        Random Length
                      </label>
                      <select
                        className="podoload-input"
                        style={{ height: '30px', fontSize: '0.75rem', padding: '0 0.35rem' }}
                        value={idConfig.randomLength}
                        onChange={(e) =>
                          setIdConfig((prev) => ({
                            ...prev,
                            randomLength: parseInt(e.target.value, 10),
                          }))
                        }
                      >
                        <option value={4}>4 chars</option>
                        <option value={5}>5 chars</option>
                        <option value={6}>6 chars</option>
                        <option value={8}>8 chars</option>
                      </select>
                    </div>
                  </div>

                  {/* Scheme selector */}
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                      Format Scheme
                    </label>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {(
                        [
                          { id: 'alphanumeric', label: 'Alphanumeric (A-Z, 0-9)' },
                          { id: 'numeric', label: 'Numeric (0-9)' },
                          { id: 'date_alphanumeric', label: 'Date Code (YYMM-XXX)' },
                        ] as const
                      ).map((scheme) => (
                        <button
                          key={scheme.id}
                          type="button"
                          className={`podoload-seg-btn ${idConfig.mode === scheme.id ? 'active' : ''}`}
                          style={{ fontSize: '0.68rem', padding: '0.25rem 0.45rem', flex: 1, minHeight: '28px' }}
                          onClick={() =>
                            setIdConfig((prev) => ({
                              ...prev,
                              mode: scheme.id as PatientIdMode,
                            }))
                          }
                        >
                          {scheme.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-uppercase and live preview */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
                    <label style={{ fontSize: '0.7rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={idConfig.autoUppercase}
                        onChange={(e) =>
                          setIdConfig((prev) => ({
                            ...prev,
                            autoUppercase: e.target.checked,
                          }))
                        }
                        style={{ accentColor: 'var(--podo-primary)' }}
                      />
                      Force uppercase input
                    </label>

                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Preview: <strong style={{ color: '#38bdf8' }}>{dbService.generatePatientId(idConfig)}</strong>
                    </div>
                  </div>

                  {/* Save button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <button
                      type="button"
                      className="podoload-btn-secondary podoload-btn-sm"
                      onClick={() => setShowIdConfig(false)}
                      style={{ height: '28px', fontSize: '0.7rem' }}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="podoload-btn-primary podoload-btn-sm"
                      onClick={() => handleSaveIdConfig(idConfig)}
                      style={{ height: '28px', fontSize: '0.7rem' }}
                    >
                      Save to Database & Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Age, Gender & Mobile Number */}
          <div className="podoload-form-row podoload-row-demographics">
            <div className="podoload-form-group podoload-fg-age">
              <label className="podoload-label">Age</label>
              <input
                type="number"
                className="podoload-input"
                placeholder="Age in years"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="podoload-form-group podoload-fg-gender">
              <label className="podoload-label">Gender</label>
              <div className="podoload-segmented-buttons">
                <button
                  type="button"
                  className={`podoload-seg-btn ${gender === 'Male' ? 'active' : ''}`}
                  onClick={() => setGender('Male')}
                >
                  Male
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${gender === 'Female' ? 'active' : ''}`}
                  onClick={() => setGender('Female')}
                >
                  Female
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${gender === 'Other' ? 'active' : ''}`}
                  onClick={() => setGender('Other')}
                >
                  Other
                </button>
              </div>
            </div>

            <div className="podoload-form-group podoload-fg-mobile">
              <label className="podoload-label">Mobile number</label>
              <input
                type="tel"
                className="podoload-input"
                placeholder="e.g. +1 555-0199"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Height, Weight & Referring Doctor */}
          <div className="podoload-form-row podoload-row-vitals">
            <div className="podoload-form-group podoload-fg-height">
              <label className="podoload-label">Height (cm)</label>
              <input
                type="number"
                className="podoload-input"
                placeholder="175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>

            <div className="podoload-form-group podoload-fg-weight">
              <label className="podoload-label">Weight (kg)</label>
              <input
                type="number"
                className="podoload-input"
                placeholder="70"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>

            <div className="podoload-form-group podoload-fg-doctor">
              <label className="podoload-label">Referring doctor</label>
              <input
                type="text"
                className="podoload-input"
                placeholder="Dr. Specialist / Clinic"
                value={referringDoctor}
                onChange={(e) => setReferringDoctor(e.target.value)}
              />
            </div>
          </div>

          {/* Row 4: Reason for Exam and Clinical History */}
          <div className="podoload-form-group">
            <label className="podoload-label">Reason for exam and clinical history</label>
            <textarea
              className="podoload-textarea"
              rows={4}
              placeholder="e.g. Plantar fasciitis symptoms, diabetic foot ulcer screening, bilateral arch pain evaluation..."
              value={clinicalHistory}
              onChange={(e) => setClinicalHistory(e.target.value)}
            />
          </div>
        </div>

        {/* Right Panel: Dual-Mode Reports Hub or Existing Patient Search */}
        {activePatient ? (
          <div className="podoload-card podoload-patient-hub-card">
            {/* Hub Header */}
            <div className="podoload-patient-hub-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 className="podoload-card-title" style={{ margin: 0 }}>PATIENT REPORTS HUB</h3>
                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                    {patientCases.length} {patientCases.length === 1 ? 'Report' : 'Reports'}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: '#657e84' }}>
                  Historical exams and reports saved in database for this patient
                </p>
              </div>
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                onClick={handleSwitchPatient}
                title="Switch to another patient or search patient list"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <ArrowLeft style={{ width: '13px', height: '13px' }} />
                <span>Switch Patient</span>
              </button>
            </div>

            {/* Selected Patient Identity Summary */}
            <div className="podoload-patient-hub-summary">
              <div className="podoload-patient-avatar">
                {getInitials(activePatient.name)}
              </div>
              <div className="podoload-patient-hub-details">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="podoload-patient-name" style={{ fontSize: '0.86rem' }}>
                    {activePatient.name}
                  </span>
                  <span className="podo-badge podo-badge-primary" style={{ fontSize: '0.68rem' }}>
                    ID: {activePatient.mrn || '00000'}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#657e84', marginTop: '0.15rem' }}>
                  {activePatient.gender || 'Male'}
                  {activePatient.dateOfBirth
                    ? ` · ${new Date().getFullYear() - new Date(activePatient.dateOfBirth).getFullYear()}y`
                    : age
                    ? ` · ${age}y`
                    : ''}
                  {activePatient.phone ? ` · ${activePatient.phone}` : ''}
                </div>
              </div>
            </div>

            {/* Primary Action Button: Scan / Upload New Report for this Patient */}
            <div style={{ margin: '0.65rem 0 0.85rem' }}>
              <button
                type="button"
                className="podoload-btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  boxShadow: '0 2px 6px rgba(12, 107, 100, 0.25)',
                }}
                onClick={handleStartNewReportAction}
                title="Start a fresh plantar pressure exam for this patient"
              >
                <Plus style={{ width: '16px', height: '16px' }} />
                <span>Scan / Upload New Report for this Patient</span>
              </button>
            </div>

            {/* Time Filter Controls: Datewise, Year, Month */}
            <div className="podoload-patient-hub-filters">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334e55', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Filter style={{ width: '12px', height: '12px' }} />
                  FILTER REPORTS:
                </span>
                <span style={{ fontSize: '0.7rem', color: '#657e84' }}>
                  Showing {filteredPatientReports.length} of {patientCases.length}
                </span>
              </div>

              {/* Segmented Time Filter Bar: All | By Year | By Month | By Date */}
              <div className="podoload-segmented-buttons" style={{ width: '100%', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  className={`podoload-seg-btn ${timeFilterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setTimeFilterMode('all')}
                >
                  All ({patientCases.length})
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${timeFilterMode === 'year' ? 'active' : ''}`}
                  onClick={() => {
                    setTimeFilterMode('year');
                    if (!selectedYear && availableYears.length > 0) setSelectedYear(availableYears[0]);
                  }}
                  disabled={availableYears.length === 0}
                  title={availableYears.length === 0 ? 'No yearly records available' : 'Filter by examination year'}
                >
                  By Year
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${timeFilterMode === 'month' ? 'active' : ''}`}
                  onClick={() => {
                    setTimeFilterMode('month');
                    if (!selectedMonth && availableMonths.length > 0) setSelectedMonth(availableMonths[0][0]);
                  }}
                  disabled={availableMonths.length === 0}
                  title={availableMonths.length === 0 ? 'No monthly records available' : 'Filter by examination month'}
                >
                  By Month
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${timeFilterMode === 'date' ? 'active' : ''}`}
                  onClick={() => {
                    setTimeFilterMode('date');
                    if (!selectedDate && availableDates.length > 0) setSelectedDate(availableDates[0][0]);
                  }}
                  disabled={availableDates.length === 0}
                  title={availableDates.length === 0 ? 'No date records available' : 'Filter by specific date'}
                >
                  By Date
                </button>
              </div>

              {/* Sub-selector for Year */}
              {timeFilterMode === 'year' && availableYears.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#556f75', fontWeight: 600 }}>Select Year:</span>
                  {availableYears.map((yr) => {
                    const yrCount = patientCases.filter((c) => {
                      const d = parseCaseDate(c.createdAt);
                      return d && d.getFullYear().toString() === yr;
                    }).length;
                    return (
                      <button
                        key={yr}
                        type="button"
                        className={`podoload-btn-chip ${selectedYear === yr ? 'active' : ''}`}
                        onClick={() => setSelectedYear(yr)}
                      >
                        {yr} <span style={{ opacity: 0.8, fontSize: '0.66rem' }}>({yrCount})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sub-selector for Month */}
              {timeFilterMode === 'month' && availableMonths.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#556f75', fontWeight: 600 }}>Select Month:</span>
                  <select
                    className="podoload-input podoload-select podoload-select-sm"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ flex: 1, minWidth: '160px' }}
                  >
                    {availableMonths.map(([mKey, mLabel]) => {
                      const mCount = patientCases.filter((c) => {
                        const d = parseCaseDate(c.createdAt);
                        return d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mKey;
                      }).length;
                      return (
                        <option key={mKey} value={mKey}>
                          {mLabel} ({mCount} {mCount === 1 ? 'report' : 'reports'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Sub-selector for Date */}
              {timeFilterMode === 'date' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#556f75', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar style={{ width: '12px', height: '12px' }} /> Date:
                  </span>
                  {availableDates.length > 0 ? (
                    <select
                      className="podoload-input podoload-select podoload-select-sm"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{ flex: 1, minWidth: '160px' }}
                    >
                      {availableDates.map(([dKey, dLabel]) => {
                        const dCount = patientCases.filter((c) => {
                          const d = parseCaseDate(c.createdAt);
                          return d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === dKey;
                        }).length;
                        return (
                          <option key={dKey} value={dKey}>
                            {dLabel} ({dCount} {dCount === 1 ? 'report' : 'reports'})
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="date"
                      className="podoload-input podoload-select-sm"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      style={{ flex: 1 }}
                    />
                  )}
                </div>
              )}

              {/* Search query input inside patient reports */}
              {patientCases.length > 2 && (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="podoload-input podoload-select-sm"
                    placeholder="Search by report # or findings..."
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    style={{ paddingLeft: '1.75rem' }}
                  />
                  <Search style={{ width: '12px', height: '12px', color: '#94a3b8', position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              )}
            </div>

            {/* Historical Reports List */}
            <div className="podoload-patient-reports-list">
              {filteredPatientReports.length === 0 ? (
                <div className="podoload-empty-reports-box">
                  <FileText style={{ width: '28px', height: '28px', color: '#94a3b8', margin: '0 auto 0.5rem', display: 'block' }} />
                  {patientCases.length === 0 ? (
                    <>
                      <p style={{ margin: '0 0 0.35rem', fontWeight: 600, color: '#334e55', fontSize: '0.8rem' }}>
                        No previous reports recorded
                      </p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#657e84' }}>
                        Click "Scan / Upload New Report for this Patient" above to capture their first plantar pressure exam.
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: '0 0 0.35rem', fontWeight: 600, color: '#334e55', fontSize: '0.8rem' }}>
                        No reports match the selected time filter
                      </p>
                      <button
                        type="button"
                        className="podo-link-btn"
                        onClick={() => {
                          setTimeFilterMode('all');
                          setReportSearchQuery('');
                        }}
                        style={{ fontSize: '0.74rem' }}
                      >
                        Reset filters to view all {patientCases.length} reports
                      </button>
                    </>
                  )}
                </div>
              ) : (
                filteredPatientReports.map((report) => {
                  const arch =
                    report.regionalAnalysis?.archClassification ||
                    report.orthoticMeasurements?.archType ||
                    'Normal Arch';
                  const archIndex =
                    report.orthoticMeasurements?.archIndex !== undefined
                      ? report.orthoticMeasurements.archIndex.toFixed(2)
                      : report.regionalAnalysis?.cavanaghArchIndex !== undefined
                      ? report.regionalAnalysis.cavanaghArchIndex.toFixed(2)
                      : null;
                  const peak =
                    report.regionalAnalysis?.peakRegion ||
                    report.regionalAnalysis?.peakContactCategory;

                  return (
                    <div key={report.id} className="podoload-report-card">
                      <div className="podoload-report-card-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span className="podoload-report-num">{report.caseNumber || 'PPA-REPORT'}</span>
                          <span className="podo-badge podo-badge-neutral" style={{ fontSize: '0.64rem' }}>
                            {report.footSide || 'Bilateral'}
                          </span>
                        </div>
                        <span className="podoload-report-date">
                          {formatExamDate(report.createdAt)}
                        </span>
                      </div>

                      <div className="podoload-report-card-middle">
                        <div className="podoload-report-findings">
                          Arch: {arch}
                          {archIndex ? ` (AI: ${archIndex})` : ''}
                          {peak ? ` · ${peak}` : ''}
                        </div>
                        <div className="podoload-report-meta">
                          <span className="podoload-db-indicator">
                            <Database style={{ width: '11px', height: '11px' }} /> Inbuilt Database
                          </span>
                          {report.signOff?.physicianName && (
                            <span>· {report.signOff.physicianName}</span>
                          )}
                        </div>
                      </div>

                      <div className="podoload-report-card-actions">
                        <button
                          type="button"
                          className="podoload-btn-primary podoload-btn-sm"
                          onClick={() => onSelectReport?.(report.id, 5)}
                          title="Open full report with scanned footprints, heatmaps, and doctor comments"
                        >
                          <FileText style={{ width: '12px', height: '12px' }} />
                          <span>Open Report</span>
                        </button>

                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          onClick={() => onSelectReport?.(report.id, 4)}
                          title="View morphological measurements, contact areas, and pressure zones"
                        >
                          <Activity style={{ width: '12px', height: '12px' }} />
                          <span>View Results</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="podoload-card podoload-existing-patient-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 className="podoload-card-title">EXISTING PATIENT?</h3>

            <div className="podoload-form-group" style={{ marginBottom: '0.5rem', position: 'relative' }}>
              <input
                type="text"
                className="podoload-input"
                placeholder="Search by name, ID or mobile"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2rem' }}
              />
              <Search style={{ width: '13px', height: '13px', color: '#94a3b8', position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <div className="podoload-patient-list">
              {filteredPatients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#657e84', fontSize: '0.78rem' }}>
                  No existing patients found. Fill the form on the left to register a new patient.
                </div>
              ) : (
                filteredPatients.map((pat) => {
                  const initials = getInitials(pat.name);
                  const calcAge = pat.dateOfBirth
                    ? `${new Date().getFullYear() - new Date(pat.dateOfBirth).getFullYear()}y`
                    : '40y';
                  const patReportCount = (cases || []).filter((c) => c.patientId === pat.id).length;

                  return (
                    <div key={pat.id} className="podoload-patient-row">
                      <div className="podoload-patient-avatar">{initials}</div>
                      <div className="podoload-patient-info">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                          <span className="podoload-patient-name">{pat.name}</span>
                          <span className="podo-badge podo-badge-neutral" style={{ fontSize: '0.64rem', padding: '0.1rem 0.4rem' }}>
                            {patReportCount} {patReportCount === 1 ? 'report' : 'reports'}
                          </span>
                        </div>
                        <span className="podoload-patient-sub">
                          ID: {pat.mrn || '00000'} · {calcAge} · {pat.gender || 'Male'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="podoload-btn-secondary podoload-btn-sm"
                        onClick={() => handleSelectExistingPatient(pat)}
                        title="Load patient details and historical reports hub"
                      >
                        Select
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="podoload-bottom-actions-bar">
        <button type="button" className="podoload-btn-secondary" onClick={onCancel}>
          Cancel
        </button>

        <button
          type="button"
          className="podoload-btn-primary"
          onClick={handleSaveAndContinue}
        >
          {Capacitor.isNativePlatform() ? 'Save and continue to capture' : 'Save and continue to scan'}
        </button>
      </div>
    </div>
  );
};
