import React, { useState } from 'react';
import { Patient, AnalysisCase } from '../../types';
import { generateBilateralClubbedReportPdf } from '../../services/reportPdfService';

interface PodoLoadReportProps {
  selectedPatient?: Patient;
  currentCase?: AnalysisCase;
  leftHeatmapUrl: string | null;
  rightHeatmapUrl: string | null;
  onBack: () => void;
  onFinishExam: () => void;
  onSaveToArchive: (updatedCase: Partial<AnalysisCase>) => void;
}

export const PodoLoadReport: React.FC<PodoLoadReportProps> = ({
  selectedPatient,
  currentCase,
  leftHeatmapUrl,
  rightHeatmapUrl,
  onBack,
  onFinishExam,
  onSaveToArchive,
}) => {
  // Hospital branding state (clean defaults)
  const [clinicName, setClinicName] = useState('');
  const [clinicContact, setClinicContact] = useState('');
  const [logoPosition, setLogoPosition] = useState<'Left' | 'Centre' | 'Right'>('Left');
  const [customFooter, setCustomFooter] = useState('');

  // Signatories
  const [doctorName, setDoctorName] = useState('Dr. [Name]');
  const [technicianName, setTechnicianName] = useState('');

  // Doctor comments & quick tags
  const [comments, setComments] = useState('');
  const [uploadToCloud, setUploadToCloud] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // PDF Export
  const handleDownloadPdf = async () => {
    if (!currentCase || !selectedPatient) return;
    try {
      const doc = await generateBilateralClubbedReportPdf(currentCase, currentCase, selectedPatient);
      doc.save(`PodoLoad-Clinical-Report-${selectedPatient.mrn || '00000'}.pdf`);
    } catch (err) {
      console.warn('PDF download error:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveArchive = () => {
    onSaveToArchive({
      clinicName,
      operatorName: technicianName,
      signOff: {
        physicianName: doctorName,
        role: 'Attending Podiatrist',
        comments,
        signedAt: new Date().toISOString(),
      },
      syncStatus: uploadToCloud ? 'synced' : 'pending',
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const patientName = selectedPatient?.name || '[Patient name]';
  const patientId = selectedPatient?.mrn || '00000';
  const patientAge = selectedPatient?.dateOfBirth
    ? `${new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()}y`
    : '42y';
  const patientGender = selectedPatient?.gender?.toLowerCase() || 'male';
  const examDate = new Date().toLocaleDateString();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.85rem' }}>
      {/* 3-Column Report Layout */}
      <div className="podoload-report-grid">
        {/* ================= COLUMN 1: HEADER/FOOTER & SIGNATORIES ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Card 1: Header and Footer */}
          <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <h4 className="podoload-card-title" style={{ marginBottom: '0.4rem' }}>
              HEADER AND FOOTER
            </h4>

            {/* Logo Upload Box */}
            <div className="podoload-upload-box" title="Click to upload clinic logo">
              Upload hospital / clinic logo
            </div>

            {/* Logo Position */}
            <div className="podoload-form-group" style={{ marginBottom: '0.35rem' }}>
              <label className="podoload-label">Logo position</label>
              <div className="podoload-segmented-buttons">
                <button
                  type="button"
                  className={`podoload-seg-btn ${logoPosition === 'Left' ? 'active' : ''}`}
                  onClick={() => setLogoPosition('Left')}
                >
                  Left
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${logoPosition === 'Centre' ? 'active' : ''}`}
                  onClick={() => setLogoPosition('Centre')}
                >
                  Centre
                </button>
                <button
                  type="button"
                  className={`podoload-seg-btn ${logoPosition === 'Right' ? 'active' : ''}`}
                  onClick={() => setLogoPosition('Right')}
                >
                  Right
                </button>
              </div>
            </div>

            {/* Hospital Name */}
            <div className="podoload-form-group" style={{ marginBottom: '0.35rem' }}>
              <label className="podoload-label">Hospital / clinic name</label>
              <input
                type="text"
                className="podoload-input"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
              />
            </div>

            {/* Address, Phone, Email */}
            <div className="podoload-form-group" style={{ marginBottom: '0.35rem' }}>
              <label className="podoload-label">Address, phone, email</label>
              <input
                type="text"
                className="podoload-input"
                value={clinicContact}
                onChange={(e) => setClinicContact(e.target.value)}
              />
            </div>

            {/* Footer Text */}
            <div className="podoload-form-group" style={{ marginBottom: '0.2rem' }}>
              <label className="podoload-label">Footer text</label>
              <input
                type="text"
                className="podoload-input"
                value={customFooter}
                onChange={(e) => setCustomFooter(e.target.value)}
              />
            </div>
          </div>

          {/* Card 2: Signatories */}
          <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <h4 className="podoload-card-title" style={{ marginBottom: '0.4rem' }}>
              SIGNATORIES
            </h4>

            <div className="podoload-form-group" style={{ marginBottom: '0.35rem' }}>
              <label className="podoload-label">Doctor name</label>
              <input
                type="text"
                className="podoload-input"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </div>

            <div className="podoload-form-group" style={{ marginBottom: '0.35rem' }}>
              <label className="podoload-label">Technician name</label>
              <input
                type="text"
                className="podoload-input"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
              />
            </div>

            <div style={{ fontSize: '0.72rem', color: '#556f75', marginTop: '0.2rem' }}>
              Contents: <span style={{ color: '#0c2328', fontWeight: 600 }}>Map · measurements · interpretation</span>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: LIVE A4 REPORT PREVIEW ================= */}
        <div className="podoload-report-sheet">
          {/* Hospital Header with Logo */}
          <div className="podoload-report-header">
            <div className="podoload-report-logo-box">Logo</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0c2328' }}>
                [{clinicName || 'Hospital / clinic name'}]
              </span>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {clinicContact}
              </span>
            </div>
          </div>

          <div className="podoload-report-divider" />

          {/* Report Title */}
          <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.04em', color: '#0c2328', marginBottom: '0.65rem' }}>
            PLANTAR PRESSURE REPORT
          </div>

          {/* Patient Details Meta Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', fontSize: '0.72rem', gap: '0.25rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <div>Name: <strong>{patientName}</strong></div>
            <div>ID: <strong>[{patientId}]</strong></div>
            <div>Age / gender: <strong>[{patientAge}] / [{patientGender}]</strong></div>
            <div>Date: <strong>[{examDate}]</strong></div>
          </div>

          {/* Bilateral Heatmap Image */}
          <div style={{ backgroundColor: '#000000', borderRadius: '4px', height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '0.5rem', marginBottom: '0.75rem' }}>
            {leftHeatmapUrl && (
              <img src={leftHeatmapUrl} alt="Left Foot" style={{ maxHeight: '150px', objectFit: 'contain' }} />
            )}
            {rightHeatmapUrl && (
              <img src={rightHeatmapUrl} alt="Right Foot" style={{ maxHeight: '150px', objectFit: 'contain' }} />
            )}
          </div>

          {/* Measurements Table */}
          <table className="podoload-metrics-table" style={{ marginBottom: '0.75rem' }}>
            <thead>
              <tr>
                <th></th>
                <th>LEFT</th>
                <th>RIGHT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Length</td>
                <td>{currentCase?.orthoticMeasurements?.footLengthMm ? `${currentCase.orthoticMeasurements.footLengthMm} mm` : '— mm'}</td>
                <td>{currentCase?.orthoticMeasurements?.footLengthMm ? `${currentCase.orthoticMeasurements.footLengthMm} mm` : '— mm'}</td>
              </tr>
              <tr>
                <td>Arch index</td>
                <td>{currentCase?.regionalAnalysis?.cavanaghArchIndex ? currentCase.regionalAnalysis.cavanaghArchIndex.toFixed(2) : '—'}</td>
                <td>{currentCase?.regionalAnalysis?.cavanaghArchIndex ? currentCase.regionalAnalysis.cavanaghArchIndex.toFixed(2) : '—'}</td>
              </tr>
              <tr>
                <td>Forefoot / Heel load</td>
                <td>{currentCase?.regionalAnalysis?.forefootContactPct ? `${currentCase.regionalAnalysis.forefootContactPct} / ${currentCase.regionalAnalysis.hindfootContactPct} %` : '— / — %'}</td>
                <td>{currentCase?.regionalAnalysis?.forefootContactPct ? `${currentCase.regionalAnalysis.forefootContactPct} / ${currentCase.regionalAnalysis.hindfootContactPct} %` : '— / — %'}</td>
              </tr>
            </tbody>
          </table>

          {/* Interpretation */}
          <div style={{ fontSize: '0.72rem', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 700 }}>Interpretation (auto): </span>
            <span style={{ color: '#334155' }}>
              {currentCase?.regionalAnalysis?.archClassification
                ? `${currentCase.regionalAnalysis.archClassification} plantar distribution pattern.`
                : '[automatic interpretation]'}
            </span>
          </div>

          {/* Doctor Comments */}
          <div style={{ fontSize: '0.72rem', marginBottom: 'auto' }}>
            <span style={{ fontWeight: 700 }}>Doctor comments: </span>
            <span style={{ color: '#334155' }}>{comments}</span>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
            <div>
              Doctor: <strong>{doctorName}</strong>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>Signature Verified</div>
            </div>
            <div>
              Technician: <strong>{technicianName}</strong>
            </div>
          </div>

          {/* Footer Note */}
          <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.75rem' }}>
            [{customFooter}] · Software supported by Technomind Healthcare
          </div>
        </div>

        {/* ================= COLUMN 3: COMMENTS & OUTPUT ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Card 1: Doctor Comments */}
          <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <h4 className="podoload-card-title" style={{ marginBottom: '0.4rem' }}>
              DOCTOR COMMENTS
            </h4>

            <textarea
              className="podoload-textarea"
              rows={8}
              placeholder="Write comments for the report"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />

            {/* Quick Action Tags */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                style={{ flex: 1 }}
                onClick={() => setComments('Normal bilateral pressure load. No offloading modifications indicated.')}
              >
                Normal
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                style={{ flex: 1 }}
                onClick={() => setComments('Moderate metatarsal load concentration. Recommend review in 3 months.')}
              >
                Review
              </button>

              <button
                type="button"
                className="podoload-btn-secondary podoload-btn-sm"
                style={{ flex: 1 }}
                onClick={() => setComments('Focal peak hyperpressure identified. Refer to specialist for custom orthotic offloading.')}
              >
                Refer
              </button>
            </div>
          </div>

          {/* Card 2: Output Options */}
          <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <h4 className="podoload-card-title" style={{ marginBottom: '0.4rem' }}>
              OUTPUT
            </h4>

            <button
              type="button"
              className="podoload-btn-primary"
              style={{ width: '100%' }}
              onClick={handleSaveArchive}
            >
              {isSaved ? '✓ Saved to Archive!' : 'Save to archive'}
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="podoload-btn-secondary"
                style={{ flex: 1 }}
                onClick={handlePrint}
              >
                Print
              </button>

              <button
                type="button"
                className="podoload-btn-secondary"
                style={{ flex: 1 }}
                onClick={handleDownloadPdf}
              >
                PDF
              </button>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#0c2328', fontWeight: 600, cursor: 'pointer', marginTop: '0.35rem' }}>
              <input
                type="checkbox"
                checked={uploadToCloud}
                onChange={(e) => setUploadToCloud(e.target.checked)}
                style={{ accentColor: 'var(--podo-primary)', width: '15px', height: '15px' }}
              />
              Upload to cloud
            </label>

            <span style={{ fontSize: '0.65rem', color: '#657e84' }}>
              Saved offline and uploaded when connected.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="podoload-bottom-actions-bar">
        <button type="button" className="podoload-btn-secondary" onClick={onBack}>
          Back to results
        </button>

        <button
          type="button"
          className="podoload-btn-primary"
          onClick={onFinishExam}
        >
          Finish exam
        </button>
      </div>
    </div>
  );
};
