import React, { useState } from 'react';
import {
  User,
  Plus,
  Calendar,
  Phone,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Trash2,
} from 'lucide-react';
import { Patient, AnalysisCase, FootSide } from '../types';
import { logAuditEvent } from '../services/auditService';

interface PatientCaseViewProps {
  patients: Patient[];
  cases: AnalysisCase[];
  selectedPatientId: string;
  selectedCaseId: string;
  onSelectPatient: (patientId: string) => void;
  onSelectCase: (caseId: string) => void;
  onCreatePatient: (newPatient: Patient) => void;
  onDeletePatient?: (patientId: string) => void;
  onDeleteCase?: (caseId: string) => void;
  onClearAllData?: () => void;
  onNavigateToAnalysis: () => void;
}

export const PatientCaseView: React.FC<PatientCaseViewProps> = ({
  patients,
  cases,
  selectedPatientId,
  selectedCaseId,
  onSelectPatient,
  onSelectCase,
  onCreatePatient,
  onDeletePatient,
  onDeleteCase,
  onClearAllData,
  onNavigateToAnalysis,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'directory' | 'dossier'>('directory');

  // New patient state (clean defaults, no fake sample data)
  const [name, setName] = useState('');
  const [mrn, setMrn] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [phone, setPhone] = useState('');
  const [referringDoctor, setReferringDoctor] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const patientCases = cases.filter((c) => c.patientId === selectedPatient?.id);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPat: Patient = {
      id: 'pat-' + Math.random().toString(36).substring(2, 9),
      mrn: mrn.trim() || `MRN-${Math.floor(10000 + Math.random() * 90000)}`,
      name: name.trim(),
      dateOfBirth: dob || new Date().toISOString().slice(0, 10),
      gender,
      weightKg: Number(weightKg) || 0,
      heightCm: Number(heightCm) || 0,
      phone: phone.trim(),
      referringDoctor: referringDoctor.trim(),
      clinicalNotes: clinicalNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    onCreatePatient(newPat);
    logAuditEvent(
      'PATIENT_RECORD_CREATED',
      `Registered patient ${newPat.name} (${newPat.mrn})`,
      'practitioner'
    );
    // Reset form
    setName('');
    setMrn('');
    setDob('');
    setWeightKg('');
    setHeightCm('');
    setPhone('');
    setReferringDoctor('');
    setClinicalNotes('');
    setIsNewPatientModalOpen(false);
    setMobileTab('dossier');
  };

  return (
    <div className="patient-view-container">
      {/* Sub Header */}
      <div className="workspace-subbar">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-bold text-slate-100">
            Patient & Clinical Case Directory (FR-01)
          </h2>
          <span className="badge-tag">Registry</span>
        </div>

        <div className="flex items-center gap-2">
          {onClearAllData && (patients.length > 0 || cases.length > 0) && (
            <button
              className="btn-secondary-sm text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border-rose-900/50"
              onClick={onClearAllData}
              title="Delete all stored data and reset to fresh clinical state"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Clear All Data</span>
            </button>
          )}
          <button
            className="btn-primary-sm"
            onClick={() => setIsNewPatientModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Patient Record
          </button>
        </div>
      </div>

      {/* Mobile-Only Segmented Navigation Bar */}
      <div className="flex sm:hidden w-full px-3 pt-2">
        <div className="flex w-full bg-slate-900 p-1 rounded-lg border border-slate-800 gap-1">
          <button
            type="button"
            className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'directory'
                ? 'bg-teal-500/25 text-teal-300 border border-teal-500/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setMobileTab('directory')}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patients ({patients.length})</span>
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all truncate ${
              mobileTab === 'dossier'
                ? 'bg-teal-500/25 text-teal-300 border border-teal-500/40 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setMobileTab('dossier')}
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{selectedPatient ? selectedPatient.name : 'Dossier'}</span>
          </button>
        </div>
      </div>

      <div className="patient-grid">
        {/* Left column: Patient directory list (always on desktop, toggled on mobile) */}
        <div className={`patient-list-card ${mobileTab === 'dossier' ? 'hidden sm:flex' : 'flex'}`}>
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient name or MRN..."
                className="form-input pl-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="patient-items-scroll">
            {filteredPatients.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {patients.length === 0
                  ? 'No patient records found. Click "New Patient Record" above to register.'
                  : 'No patients matching your search.'}
              </div>
            ) : (
              filteredPatients.map((p) => (
                <div
                  key={p.id}
                  className={`patient-row-item ${p.id === selectedPatient?.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelectPatient(p.id);
                    setMobileTab('dossier');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100 text-sm truncate mr-2">{p.name}</span>
                    <span className="badge-tag-sm flex-shrink-0">{p.mrn}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>
                      {p.gender} • {p.dateOfBirth}
                    </span>
                    <span>{p.weightKg ? `${p.weightKg} kg` : '—'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Patient dossier & cases (always on desktop, toggled on mobile) */}
        <div className={`patient-detail-card space-y-4 ${mobileTab === 'directory' ? 'hidden sm:block' : 'block'}`}>
          {/* Mobile Back Button */}
          <div className="sm:hidden flex items-center justify-between pb-2 border-b border-slate-800">
            <button
              type="button"
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1.5"
              onClick={() => setMobileTab('directory')}
            >
              <span>← Back to Patients List</span>
            </button>
            <span className="text-[11px] text-slate-400">
              {patientCases.length} scan(s)
            </span>
          </div>

          {!selectedPatient ? (
            <div className="flex flex-col items-center justify-center h-80 p-6 text-center text-slate-400 space-y-3">
              <User className="w-12 h-12 text-slate-600" />
              <div>
                <div className="font-bold text-slate-200">No Patient Record Active</div>
                <div className="text-xs text-slate-500 mt-1">
                  Click below to create your first clinical patient dossier.
                </div>
              </div>
              <button
                className="btn-primary-sm"
                onClick={() => setIsNewPatientModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Register New Patient
              </button>
            </div>
          ) : (
            <>
              {/* Patient Profile Card */}
              <div className="profile-banner">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-100 truncate">
                      {selectedPatient.name}
                    </h3>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-teal-400">{selectedPatient.mrn}</span>
                      <span>•</span>
                      <span>DOB: {selectedPatient.dateOfBirth}</span>
                      <span>•</span>
                      <span>{selectedPatient.gender}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right text-xs">
                      <div className="text-slate-400 text-[11px]">Referring Physician:</div>
                      <div className="font-semibold text-slate-200">
                        {selectedPatient.referringDoctor || 'Not specified'}
                      </div>
                    </div>
                    {onDeletePatient && (
                      <button
                        className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 flex-shrink-0"
                        onClick={() => {
                          if (window.confirm(`Delete patient "${selectedPatient.name}" and all associated scans?`)) {
                            onDeletePatient(selectedPatient.id);
                          }
                        }}
                        title="Delete this patient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Weight:</span>
                    <span className="font-bold text-slate-200 ml-1">
                      {selectedPatient.weightKg ? `${selectedPatient.weightKg} kg` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Height:</span>
                    <span className="font-bold text-slate-200 ml-1">
                      {selectedPatient.heightCm ? `${selectedPatient.heightCm} cm` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">BMI:</span>
                    <span className="font-bold text-slate-200 ml-1">
                      {selectedPatient.weightKg && selectedPatient.heightCm
                        ? (
                            selectedPatient.weightKg /
                            Math.pow(selectedPatient.heightCm / 100, 2)
                          ).toFixed(1)
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-mono text-slate-200 ml-1 truncate">
                      {selectedPatient.phone || '—'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-400 font-semibold">Clinical Indication: </span>
                  <span className="text-slate-300">{selectedPatient.clinicalNotes || 'General plantar contact evaluation'}</span>
                </div>
              </div>

              {/* Associated Plantar Cases */}
              <div className="cases-section">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Plantar Scans & Analyses Associated with Patient
                  </h4>
                  <span className="text-xs text-slate-400">
                    {patientCases.length} Registered Case(s)
                  </span>
                </div>

                <div className="grid gap-3">
                  {patientCases.map((c) => (
                    <div
                      key={c.id}
                      className={`case-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 ${
                        c.id === selectedCaseId ? 'selected' : ''
                      }`}
                      onClick={() => onSelectCase(c.id)}
                    >
                      <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto min-w-0">
                        {(c.processedHeatMapDataUrl || c.rawScanDataUrl) ? (
                          <img
                            src={c.processedHeatMapDataUrl || c.rawScanDataUrl}
                            alt="Thumbnail"
                            className="w-14 h-20 object-contain rounded bg-slate-900 border border-slate-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-20 rounded bg-slate-900 border border-slate-700 flex-shrink-0 flex items-center justify-center text-slate-500 text-[10px]">
                            No Scan
                          </div>
                        )}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-teal-400 truncate">
                              {c.caseNumber}
                            </span>
                            <span className="badge-tag-sm uppercase flex-shrink-0">{c.footSide} Foot</span>
                            <span className="badge-success-sm flex-shrink-0">{c.syncStatus}</span>
                          </div>
                          <div className="text-xs text-slate-300 truncate">{c.indication}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span>{c.scanMetadata.scannerModel}</span>
                            <span>•</span>
                            <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Arch: <strong className="text-slate-200">{c.regionalAnalysis.cavanaghArchIndex}</strong></span>
                            <span>•</span>
                            <span className="badge-tag-sm font-mono text-[10px]">Peak {c.regionalAnalysis.peakContactCategory}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                        <button
                          className="btn-primary-sm flex-1 sm:flex-initial justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c.id);
                            onNavigateToAnalysis();
                          }}
                        >
                          <span>Open Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </button>
                        {onDeleteCase && (
                          <button
                            className="p-2 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete scan record ${c.caseNumber}?`)) {
                                onDeleteCase(c.id);
                              }
                            }}
                            title="Delete this scan record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Patient Registration Modal */}
      {isNewPatientModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog max-w-lg">
            <div className="modal-header">
              <h3 className="font-bold text-slate-100">Register New Patient</h3>
              <button
                className="btn-close"
                onClick={() => setIsNewPatientModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNewPatient} className="modal-body p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jonathan Doe"
                  />
                </div>
                <div>
                  <label className="form-label">MRN (Medical Record No)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={mrn}
                    onChange={(e) => setMrn(e.target.value)}
                    placeholder="MRN-2026-XXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Weight (kg)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Height (cm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Referring Doctor</label>
                <input
                  type="text"
                  className="form-input"
                  value={referringDoctor}
                  onChange={(e) => setReferringDoctor(e.target.value)}
                  placeholder="e.g. Dr. Jane Smith, DPM"
                />
              </div>

              <div>
                <label className="form-label">Clinical Indication & Notes</label>
                <textarea
                  className="form-textarea h-20"
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="e.g. Bilateral plantar pain, diabetic foot ulcer screening, high arch assessment..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsNewPatientModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
