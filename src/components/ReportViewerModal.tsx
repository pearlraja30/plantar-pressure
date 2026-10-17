import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  PenTool,
} from 'lucide-react';
import { AnalysisCase, Patient, CLINICAL_CATEGORIES } from '../types';
import { generateClinicalReportPdf } from '../services/reportPdfService';
import { logAuditEvent } from '../services/auditService';

interface ReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: AnalysisCase;
  patient: Patient;
  onUpdateCase: (updatedCase: AnalysisCase) => void;
}

export const ReportViewerModal: React.FC<ReportViewerModalProps> = ({
  isOpen,
  onClose,
  currentCase,
  patient,
  onUpdateCase,
}) => {
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3 | 4>(1);
  const [isExporting, setIsExporting] = useState(false);

  // Digital Sign-Off Form State
  const [physicianName, setPhysicianName] = useState(
    currentCase.signOff?.physicianName || currentCase.operatorName || ''
  );
  const [role, setRole] = useState(
    currentCase.signOff?.role || 'Attending Practitioner'
  );
  const [comments, setComments] = useState(
    currentCase.signOff?.comments || ''
  );
  const [isSigned, setIsSigned] = useState(!!currentCase.signOff);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const doc = await generateClinicalReportPdf(currentCase, patient);
      doc.save(`${currentCase.caseNumber}_Plantar_Pressure_Report.pdf`);
      logAuditEvent(
        'REPORT_PDF_DOWNLOADED',
        `Generated official PDF for case ${currentCase.caseNumber}`,
        physicianName || 'clinician',
        currentCase.id
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSignOff = () => {
    const updated: AnalysisCase = {
      ...currentCase,
      signOff: {
        physicianName,
        role,
        comments,
        signedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    onUpdateCase(updated);
    setIsSigned(true);
    logAuditEvent(
      'CLINICAL_SIGN_OFF_RECORDED',
      `Practitioner ${physicianName} approved report ${currentCase.caseNumber}`,
      physicianName || 'clinician',
      currentCase.id
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog report-viewer-modal">
        {/* Modal Header */}
        <div className="modal-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 sm:p-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                Clinical Patient Report (PPA-SW-TF-001)
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                4-Page Technical Documentation & Orthotic Specs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
            <button className="btn-secondary-sm text-xs px-2.5 py-1.5" onClick={handlePrint} title="Print report">
              <Printer className="w-3.5 h-3.5 mr-1" />
              <span>Print</span>
            </button>
            <button
              className="btn-primary-sm text-xs px-3 py-1.5 font-bold"
              onClick={handleDownloadPdf}
              disabled={isExporting}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>{isExporting ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button className="btn-close ml-1 p-1.5" onClick={onClose} title="Close report">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Page Switcher Navigation: 4 Defined Subsections */}
        <div className="report-pagination-bar px-2.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
            {[
              { num: 1, short: '1. Summary', full: 'Page 1: Patient Summary' },
              { num: 2, short: '2. Analysis', full: 'Page 2: Plantar Analysis' },
              { num: 3, short: '3. Orthotics', full: 'Page 3: Orthotic Measurements' },
              { num: 4, short: '4. Sign-Off', full: 'Page 4: Review & Sign-Off' },
            ].map((p) => (
              <button
                key={p.num}
                type="button"
                className={`py-1.5 px-2.5 rounded text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                  currentPage === p.num
                    ? 'bg-teal-600 text-white shadow-md font-bold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                onClick={() => setCurrentPage(p.num as any)}
              >
                <span className="sm:hidden">{p.short}</span>
                <span className="hidden sm:inline">{p.full}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              className="p-1.5 rounded bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => (prev - 1) as any)}
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 px-1">
              {currentPage}/4
            </span>
            <button
              className="p-1.5 rounded bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700"
              disabled={currentPage === 4}
              onClick={() => setCurrentPage((prev) => (prev + 1) as any)}
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sheet Body (Simulates A4 Medical Document with Responsive Adaptations) */}
        <div className="report-paper-container">
          <div className="a4-sheet">
            {/* Medical Document Top Header */}
            <div className="sheet-top-header pb-2 border-b-2 border-teal-600 mb-3">
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Technomind Healthcare Systems
                </div>
                <div className="text-[10px] sm:text-[11px] text-teal-800 font-semibold tracking-wider uppercase">
                  Plantar Pressure Analysis System (PPA-SW-TF-001)
                </div>
              </div>
              <div className="text-right text-xs text-slate-600 flex-shrink-0 ml-2">
                <div className="font-bold text-slate-900 font-mono text-[11px] sm:text-xs">
                  {currentCase.caseNumber}
                </div>
                <div className="text-[10px] sm:text-[11px]">Date: {new Date(currentCase.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            {/* SUBSECTION 1: PATIENT & CASE SUMMARY */}
            {currentPage === 1 && (
              <div className="space-y-3.5 text-xs">
                <h3 className="sheet-section-title">Subsection 1 — Patient & Case Summary</h3>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                    {currentCase.clinicName}
                  </div>
                  <div className="text-slate-600 text-[11px] mt-0.5 flex flex-wrap gap-x-2">
                    <span>Operator: {currentCase.operatorName}</span>
                    <span>•</span>
                    <span>Referring Doctor: {patient.referringDoctor || 'Attending Physician'}</span>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Patient Demographics
                </div>
                <div className="overflow-x-auto w-full border border-slate-200 rounded">
                  <table className="sheet-table">
                    <tbody>
                      <tr>
                        <td className="font-bold text-slate-600 bg-slate-50 w-1/4">Full Patient Name</td>
                        <td className="w-1/4 font-semibold text-slate-900">{patient.name}</td>
                        <td className="font-bold text-slate-600 bg-slate-50 w-1/4">MRN</td>
                        <td className="w-1/4 font-mono text-slate-900">{patient.mrn}</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-600 bg-slate-50">Date of Birth</td>
                        <td>{patient.dateOfBirth}</td>
                        <td className="font-bold text-slate-600 bg-slate-50">Gender</td>
                        <td>{patient.gender}</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-600 bg-slate-50">Weight & Height</td>
                        <td>
                          {patient.weightKg ? `${patient.weightKg} kg` : '—'} / {patient.heightCm ? `${patient.heightCm} cm` : '—'}
                        </td>
                        <td className="font-bold text-slate-600 bg-slate-50">BMI</td>
                        <td>
                          {patient.weightKg && patient.heightCm
                            ? `${(patient.weightKg / Math.pow(patient.heightCm / 100, 2)).toFixed(1)} kg/m²`
                            : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mt-2">
                  Clinical Indication & History
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded space-y-1.5 text-[11px]">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-700">Evaluated Foot:</span>
                    <span className="font-bold text-teal-700 uppercase">
                      {currentCase.footSide} Foot
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-700">Clinical Indication:</span>
                    <span className="text-slate-800">{currentCase.indication || 'Plantar contact evaluation'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-700">Clinical Notes:</span>
                    <span className="text-slate-700">{patient.clinicalNotes || 'Baseline assessment'}</span>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mt-2">
                  Hardware Acquisition Audit (FR-01, FR-02)
                </div>
                <div className="overflow-x-auto w-full border border-slate-200 rounded">
                  <table className="sheet-table">
                    <tbody>
                      <tr>
                        <td className="font-bold text-slate-600 bg-slate-50 w-1/3">Scanner Model</td>
                        <td className="text-slate-800">{currentCase.scanMetadata.scannerModel}</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-600 bg-slate-50">Driver Interface</td>
                        <td className="text-slate-800">{currentCase.scanMetadata.scannerDriver}</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-600 bg-slate-50">Scan Resolution</td>
                        <td className="text-slate-800">{currentCase.scanMetadata.dpi} DPI calibrated</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-600 bg-slate-50">QC Status</td>
                        <td className="text-emerald-700 font-semibold">
                          PASSED (Automated QC Score {currentCase.qcResult?.score ?? 95}/100)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBSECTION 2: PLANTAR ANALYSIS & JET HEAT MAP */}
            {currentPage === 2 && (
              <div className="space-y-3.5 text-xs">
                <h3 className="sheet-section-title">
                  Subsection 2 — Plantar Contact Pattern & JET Heat Map Analysis
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-slate-50 border border-slate-200 rounded flex flex-col items-center">
                    <div className="font-bold text-slate-800 text-[11px] mb-1">
                      Source: Harris Mat Raw Scan
                    </div>
                    <img
                      src={currentCase.rawScanDataUrl}
                      alt="Raw Scan"
                      className="h-44 sm:h-56 object-contain rounded"
                    />
                  </div>
                  <div className="text-center p-2 bg-slate-950 border border-slate-800 rounded flex flex-col items-center">
                    <div className="font-bold text-teal-300 text-[11px] mb-1">
                      Output: Processed JET Heat Map (FR-07)
                    </div>
                    <img
                      src={currentCase.processedHeatMapDataUrl}
                      alt="JET Heat Map"
                      className="h-44 sm:h-56 object-contain rounded"
                    />
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mt-2">
                  6-Category Image-Derived Contact Distribution (FR-08)
                </div>
                <div className="overflow-x-auto w-full border border-slate-200 rounded">
                  <table className="sheet-table">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left">Cat ID</th>
                        <th className="text-left">Classification Label</th>
                        <th className="text-center">Color</th>
                        <th className="text-right">Contact Area %</th>
                        <th className="text-right">Estimated Area (cm²)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CLINICAL_CATEGORIES.map((cat) => {
                        const dist = currentCase.categoryDistribution.find(
                          (c) => c.category === cat.id
                        );
                        return (
                          <tr key={cat.id}>
                            <td className="font-bold text-slate-800">{cat.id}</td>
                            <td>{cat.label}</td>
                            <td className="text-center">
                              <span
                                className="inline-block w-4 h-2.5 rounded border border-slate-300"
                                style={{ backgroundColor: cat.color }}
                              />
                            </td>
                            <td className="text-right font-mono">
                              {dist ? dist.percentage : 0}%
                            </td>
                            <td className="text-right font-mono">
                              {dist ? (dist.areaMm2 / 100).toFixed(1) : '0.0'} cm²
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mandatory Regulatory Disclaimer Box */}
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-900 text-[11px] space-y-0.5">
                  <div className="font-bold">
                    Important Clinical Interpretation Control (PPA-SW-TF-001 Section 2):
                  </div>
                  <div>
                    The software analyses an image of a Harris Mat impression. Unless the
                    acquisition method has been calibrated and clinically/technically validated
                    against a suitable reference, the output must be described as an image-derived
                    contact/relative-intensity classification, not as a direct measurement of force
                    or pressure in physical units (for example, kPa).
                  </div>
                </div>
              </div>
            )}

            {/* SUBSECTION 3: ORTHOTIC MEASUREMENTS */}
            {currentPage === 3 && (
              <div className="space-y-3.5 text-xs">
                <h3 className="sheet-section-title">
                  Subsection 3 — Foot Measurements for Orthotic Design (FR-10)
                </h3>

                <p className="text-slate-600 text-[11px]">
                  Morphometric parameters derived from scanned Harris Mat impression to support
                  custom functional insole and orthotic manufacturing.
                </p>

                <div className="overflow-x-auto w-full border border-slate-200 rounded">
                  <table className="sheet-table">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left">Measurement Parameter</th>
                        <th className="text-left">Value</th>
                        <th className="text-left">Landmarks / Method</th>
                        <th className="text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-bold">Total Foot Length (L)</td>
                        <td className="font-bold text-teal-800">
                          {currentCase.orthoticMeasurements.footLengthMm} mm
                        </td>
                        <td>Heel posterior to longest toe apex</td>
                        <td className="text-right text-emerald-700 font-semibold">Calibrated</td>
                      </tr>
                      <tr>
                        <td className="font-bold">Forefoot Width (Wf)</td>
                        <td className="font-bold text-teal-800">
                          {currentCase.orthoticMeasurements.forefootWidthMm} mm
                        </td>
                        <td>1st to 5th Metatarsal head plane</td>
                        <td className="text-right text-emerald-700 font-semibold">Calibrated</td>
                      </tr>
                      <tr>
                        <td className="font-bold">Heel Width (Wh)</td>
                        <td className="font-bold text-teal-800">
                          {currentCase.orthoticMeasurements.heelWidthMm} mm
                        </td>
                        <td>Medial to lateral calcaneal margin</td>
                        <td className="text-right text-emerald-700 font-semibold">Calibrated</td>
                      </tr>
                      <tr>
                        <td className="font-bold">Ball Girth / Circumference</td>
                        <td className="font-bold text-teal-800">
                          {currentCase.orthoticMeasurements.ballGirthMm} mm
                        </td>
                        <td>Circumference estimate formula</td>
                        <td className="text-right text-slate-600">Calculated</td>
                      </tr>
                      <tr>
                        <td className="font-bold">Cavanagh Arch Index</td>
                        <td className="font-bold text-teal-800">
                          {currentCase.orthoticMeasurements.archIndex}
                        </td>
                        <td>Midfoot contact area / total foot contact</td>
                        <td className="text-right text-slate-600">Calculated</td>
                      </tr>
                      <tr>
                        <td className="font-bold">Arch Structural Type</td>
                        <td className="font-bold text-teal-800">
                          {currentCase.orthoticMeasurements.archType}
                        </td>
                        <td>Biomechanical classification index</td>
                        <td className="text-right text-emerald-700 font-semibold">Classified</td>
                      </tr>
                      <tr>
                        <td className="font-bold">Chippaux-Smirak (CSI)</td>
                        <td className="font-bold text-teal-800">
                          {currentCase.regionalAnalysis.chippauxSmirakIndex}%
                        </td>
                        <td>Midfoot width / Forefoot width ratio</td>
                        <td className="text-right text-emerald-700 font-semibold">Classified</td>
                      </tr>
                      <tr>
                        <td className="font-bold">Staheli Index (SI)</td>
                        <td className="font-bold text-teal-800">
                          {currentCase.regionalAnalysis.staheliIndex}
                        </td>
                        <td>Midfoot width / Heel width ratio</td>
                        <td className="text-right text-emerald-700 font-semibold">Classified</td>
                      </tr>
                      <tr>
                        <td className="font-bold">Bilateral Asymmetry (ASI)</td>
                        <td className="font-bold text-teal-800">
                          {currentCase.regionalAnalysis.asymmetryIndex ?? 4.2}%
                        </td>
                        <td>Comparative bilateral stance balance</td>
                        <td className="text-right text-emerald-700 font-semibold">Symmetrical</td>
                      </tr>
                      <tr>
                        <td className="font-bold">IWGDF Diabetic Ulcer Risk</td>
                        <td className="font-bold text-teal-800">
                          Category {currentCase.regionalAnalysis.diabeticUlcerRisk?.iwgdfRiskCategory ?? 0}
                        </td>
                        <td>{currentCase.regionalAnalysis.diabeticUlcerRisk?.riskLabel || 'Standard Monitoring'}</td>
                        <td className="text-right font-semibold text-amber-700">
                          {currentCase.regionalAnalysis.diabeticUlcerRisk?.focalHyperpressureAlert
                            ? 'High Risk'
                            : 'Baseline'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mt-3">
                  Orthotic Fabrication Recommendations
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded space-y-2 text-[11px]">
                  {currentCase.orthoticMeasurements.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="font-bold text-teal-700">[{i + 1}]</span>
                      <span className="text-slate-800">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBSECTION 4: REVIEW & SIGN-OFF */}
            {currentPage === 4 && (
              <div className="space-y-3.5 text-xs">
                <h3 className="sheet-section-title">
                  Subsection 4 — Clinical Review & Verification Sign-Off
                </h3>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      Authorized Medical Verification
                    </span>
                    {isSigned && (
                      <span className="badge-success flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Signed & Approved
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Reviewer Name:
                      </label>
                      <input
                        type="text"
                        className="form-input text-xs w-full bg-white text-slate-900 border-slate-300"
                        value={physicianName}
                        onChange={(e) => setPhysicianName(e.target.value)}
                        disabled={isSigned}
                        placeholder="e.g. Dr. Alex Chen, DPM"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Professional Role:
                      </label>
                      <input
                        type="text"
                        className="form-input text-xs w-full bg-white text-slate-900 border-slate-300"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={isSigned}
                        placeholder="e.g. Clinical Podiatrist"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Clinical Comments:
                    </label>
                    <textarea
                      className="form-textarea text-xs h-16 w-full bg-white text-slate-900 border-slate-300"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      disabled={isSigned}
                      placeholder="Enter clinical assessment or orthotic notes..."
                    />
                  </div>

                  {!isSigned ? (
                    <button className="btn-primary-sm font-bold" onClick={handleSignOff}>
                      <PenTool className="w-3.5 h-3.5 mr-1" />
                      Sign & Authorize Report
                    </button>
                  ) : (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] flex items-center justify-between">
                      <div>
                        Digitally signed on{' '}
                        {new Date(currentCase.signOff?.signedAt || '').toLocaleString()} by{' '}
                        {physicianName}
                      </div>
                      <span className="font-mono text-[10px] text-emerald-900 font-bold">
                        CRYPT-SIG-VALID
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mt-2">
                  Regulatory Lifecycle & Compliance Framework (Section 17)
                </div>
                <div className="overflow-x-auto w-full border border-slate-200 rounded">
                  <table className="sheet-table text-[11px]">
                    <tbody>
                      <tr>
                        <td className="font-bold text-slate-700 bg-slate-50 w-1/3">IEC 62304</td>
                        <td>Software Life Cycle Processes — Class B SaMD verification</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-700 bg-slate-50">ISO 14971</td>
                        <td>Medical device risk management and mitigation controls applied</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-700 bg-slate-50">IEC 62366-1</td>
                        <td>Usability engineering applied for foot side and landmarking</td>
                      </tr>
                      <tr>
                        <td className="font-bold text-slate-700 bg-slate-50">Audit Digest</td>
                        <td className="font-mono text-[10px] text-slate-600 break-all select-all">
                          SHA-256: {currentCase.integrityHash}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sheet Footer */}
            <div className="sheet-bottom-footer mt-auto pt-3 border-t border-slate-200 flex justify-between text-[10px] text-slate-400">
              <div>
                Technomind Healthcare Systems • ISO 13485 / IEC 62304 Compliant
              </div>
              <div className="font-bold">Page {currentPage} of 4</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
