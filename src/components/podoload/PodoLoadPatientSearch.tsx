import React, { useState } from 'react';
import { Patient, AnalysisCase } from '../../types';
import { UserPlus, ArrowRight, Trash2 } from 'lucide-react';

interface PodoLoadPatientSearchProps {
  patients: Patient[];
  cases: AnalysisCase[];
  selectedPatientId?: string;
  onSelectPatient: (patient: Patient) => void;
  onStartNewExamForPatient: (patient: Patient) => void;
  onDeletePatient?: (id: string) => void;
}

export const PodoLoadPatientSearch: React.FC<PodoLoadPatientSearchProps> = ({
  patients,
  cases,
  selectedPatientId,
  onSelectPatient,
  onStartNewExamForPatient,
  onDeletePatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = patients.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.mrn || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
      {/* Top Search & Filter Bar */}
      <div className="podoload-card" style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '380px' }}>
          <input
            type="text"
            className="podoload-input"
            placeholder="Search patient by name, MRN / ID, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ fontSize: '0.75rem', color: '#556f75', fontWeight: 600 }}>
          Total registered patients: <strong style={{ color: '#0c2328' }}>{patients.length}</strong>
        </div>
      </div>

      {/* Patients Table & Directory */}
      <div className="podoload-card" style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 className="podoload-card-title">PATIENT DIRECTORY &amp; CASE RECORDS</h3>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#657e84', fontSize: '0.85rem' }}>
            No patients match your search query. Start a new exam from the sidebar to register.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table className="podoload-metrics-table" style={{ width: '100%', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Patient Name</th>
                  <th style={{ textAlign: 'left' }}>Patient ID</th>
                  <th style={{ textAlign: 'left' }}>Gender / Age</th>
                  <th style={{ textAlign: 'left' }}>Contact</th>
                  <th style={{ textAlign: 'left' }}>Referring Doctor</th>
                  <th>Exams</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pat) => {
                  const patCases = cases.filter((c) => c.patientId === pat.id);
                  const isSelected = pat.id === selectedPatientId;
                  const calcAge = pat.dateOfBirth
                    ? `${new Date().getFullYear() - new Date(pat.dateOfBirth).getFullYear()}y`
                    : '—';

                  return (
                    <tr
                      key={pat.id}
                      style={{
                        backgroundColor: isSelected ? '#f1f8f9' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => onSelectPatient(pat)}
                    >
                      <td style={{ fontWeight: 700, color: '#0c2328' }}>{pat.name}</td>
                      <td>
                        <span className="podo-badge" style={{ backgroundColor: '#e2ecee', color: '#0c2328' }}>
                          {pat.mrn || 'N/A'}
                        </span>
                      </td>
                      <td>{pat.gender} · {calcAge}</td>
                      <td>{pat.phone || '—'}</td>
                      <td>{pat.referringDoctor || '—'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{patCases.length}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="podoload-btn-primary podoload-btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartNewExamForPatient(pat);
                            }}
                          >
                            <ArrowRight className="w-3 h-3 mr-1 inline" />
                            New Exam
                          </button>

                          {onDeletePatient && (
                            <button
                              type="button"
                              className="podoload-btn-secondary podoload-btn-sm"
                              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete record for ${pat.name}?`)) {
                                  onDeletePatient(pat.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
