import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Check } from 'lucide-react';
import { Patient, PatientIdConfig, PatientIdMode } from '../../types';
import { dbService } from '../../services/dbService';

interface PodoLoadRegistrationProps {
  patients: Patient[];
  selectedPatient?: Patient;
  onSavePatient: (patient: Patient) => void;
  onSelectPatient: (patient: Patient) => void;
  onCancel: () => void;
}

export const PodoLoadRegistration: React.FC<PodoLoadRegistrationProps> = ({
  patients,
  selectedPatient,
  onSavePatient,
  onSelectPatient,
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

  // Existing patient search filter
  const [searchQuery, setSearchQuery] = useState('');

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
  };

  const handleSaveIdConfig = async (newCfg: Partial<PatientIdConfig>) => {
    const updated = await dbService.savePatientIdConfig(newCfg);
    setIdConfig(updated);
    setIdSavedMessage(true);
    setTimeout(() => setIdSavedMessage(false), 2000);
    // If current patient ID is empty or starts with old prefix, regenerate with new format
    handleAutoGenerateId(updated);
  };

  const handleSaveAndContinue = () => {
    const finalId = patientId.trim() || dbService.generatePatientId(idConfig);
    const finalName = name.trim() || 'Clinical Patient';
    const numAge = parseInt(age, 10) || 40;
    const birthYear = new Date().getFullYear() - numAge;

    const patientRecord: Patient = {
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
      createdAt: selectedPatient?.createdAt || new Date().toISOString(),
    };

    onSavePatient(patientRecord);
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

        {/* Right Panel: Existing Patient Selector */}
        <div className="podoload-card podoload-existing-patient-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="podoload-card-title">EXISTING PATIENT?</h3>

          <div className="podoload-form-group" style={{ marginBottom: '0.5rem' }}>
            <input
              type="text"
              className="podoload-input"
              placeholder="Search by name, ID or mobile"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="podoload-patient-list">
            {filteredPatients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#657e84', fontSize: '0.78rem' }}>
                No existing patients found. Fill the form on the left to register.
              </div>
            ) : (
              filteredPatients.map((pat) => {
                const initials = (pat.name || 'PN')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                const calcAge = pat.dateOfBirth
                  ? `${new Date().getFullYear() - new Date(pat.dateOfBirth).getFullYear()}y`
                  : '40y';

                return (
                  <div key={pat.id} className="podoload-patient-row">
                    <div className="podoload-patient-avatar">{initials}</div>
                    <div className="podoload-patient-info">
                      <span className="podoload-patient-name">{pat.name}</span>
                      <span className="podoload-patient-sub">
                        ID: {pat.mrn || '00000'} · {calcAge}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="podoload-btn-secondary podoload-btn-sm"
                      onClick={() => {
                        setActiveRecordId(pat.id);
                        onSelectPatient(pat);
                        setName(pat.name);
                        setPatientId(pat.mrn);
                        setMobile(pat.phone || '');
                        setHeightCm(pat.heightCm ? String(pat.heightCm) : '');
                        setWeightKg(pat.weightKg ? String(pat.weightKg) : '');
                        setReferringDoctor(pat.referringDoctor || '');
                        setClinicalHistory(pat.clinicalNotes || '');
                      }}
                    >
                      Select
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
          Save and continue to capture
        </button>
      </div>
    </div>
  );
};
