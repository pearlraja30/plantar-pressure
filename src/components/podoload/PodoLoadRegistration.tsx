import React, { useState } from 'react';
import { Patient } from '../../types';

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
  // Form State initialized with selected patient or blank
  const [name, setName] = useState(selectedPatient?.name || '');
  const [patientId, setPatientId] = useState(selectedPatient?.mrn || '');
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

  // Existing patient search filter
  const [searchQuery, setSearchQuery] = useState('');

  const handleAutoGenerateId = () => {
    const randomId = Math.floor(10000 + Math.random() * 90000);
    setPatientId(`P-${randomId}`);
  };

  const handleSaveAndContinue = () => {
    const finalId = patientId || `P-${Math.floor(10000 + Math.random() * 90000)}`;
    const finalName = name.trim() || 'Patient [Name]';
    const numAge = parseInt(age, 10) || 40;
    const birthYear = new Date().getFullYear() - numAge;

    const patientRecord: Patient = {
      id: selectedPatient?.id || 'pat-' + Math.random().toString(36).substring(2, 9),
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
          <h3 className="podoload-card-title">PATIENT REGISTRATION</h3>

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
              <label className="podoload-label">Patient ID</label>
              <div className="podoload-input-with-action">
                <input
                  type="text"
                  className="podoload-input"
                  placeholder="ID [00000]"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                />
                <button
                  type="button"
                  className="podoload-btn-secondary podoload-btn-sm"
                  onClick={handleAutoGenerateId}
                  title="Generate Auto ID"
                >
                  Auto
                </button>
              </div>
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
                      <span className="podoload-patient-name">[{pat.name}]</span>
                      <span className="podoload-patient-sub">
                        ID [{pat.mrn || '00000'}] · [{calcAge}]
                      </span>
                    </div>
                    <button
                      type="button"
                      className="podoload-btn-secondary podoload-btn-sm"
                      onClick={() => {
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
