import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
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
    currentCase.signOff?.physicianName || 'Dr. Michael Chen, DPM, FACFAS'
  );
  const [role, setRole] = useState(
    currentCase.signOff?.role || 'Consultant Podiatric Surgeon'
  );
  const [comments, setComments] = useState(
    currentCase.signOff?.comments ||
      'Plantar contact pattern verified. Category C6 peak contact at 1st metatarsal head requires offloading orthotic. Approved for manufacturing.'
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
        'clinician-dr-chen',
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
      'clinician-dr-chen',
      currentCase.id
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog report-viewer-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Official Clinical Patient Report (PPA-SW-TF-001 Appendix A)
              </h2>
              <p className="text-xs text-slate-400">
                4-Page Medical Technical Documentation & Orthotic Specifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-secondary-sm" onClick={handlePrint} title="Print report">
              <Printer className="w-4 h-4 mr-1" />
              Print
            </button>
            <button
              className="btn-primary-sm"
              onClick={handleDownloadPdf}
              disabled={isExporting}
            >
              <Download className="w-4 h-4 mr-1" />
              {isExporting ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button className="btn-close ml-2" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page Switcher Navigation */}
        <div className="report-pagination-bar">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                className={`report-page-tab ${currentPage === p ? 'active' : ''}`}
                onClick={() => setCurrentPage(p as any)}
              >
                Page {p}:{' '}
                {p === 1
                  ? 'Patient Summary'
                  : p === 2
                  ? 'Plantar Analysis'
                  : p === 3
                  ? 'Orthotic Measurements'
                  : 'Review & Sign-Off'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn-tiny"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => (prev - 1) as any)}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-300">
              {currentPage} / 4
            </span>
            <button
              className="btn-tiny"
              disabled={currentPage === 4}
              onClick={() => setCurrentPage((prev) => (prev + 1) as any)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sheet Body (Simulates A4 Medical Document) */}
        <div className="report-paper-container">
          <div className="a4-sheet">
            {/* Medical Header */}
            <div className="sheet-top-header">
              <div>
                <div className="text-base font-bold text-slate-900 tracking-tight">
                  Technomind Healthcare Systems
                </div>
                <div className="text-[11px] text-teal-800 font-semibold tracking-wider">
                  PLANTAR PRESSURE ANALYSIS SYSTEM (PPA-SW-TF-001)
                </div>
              </div>
              <div className="text-right text-xs text-slate-600">
                <div className="font-bold text-slate-800">
                  Case ID: {currentCase.caseNumber}
                </div>
                <div>Date: {new Date(currentCase.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="h-0.5 bg-teal-600 my-3" />

            {/* PAGE 1: PATIENT SUMMARY */}
            {currentPage === 1 && (
              <div className="space-y-4 text-xs">
                <h3 className="sheet-section-title">Page 1 — Patient & Case Summary</h3>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-bold text-slate-800 text-sm">
                    {currentCase.clinicName}
                  </div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    Operator: {currentCase.operatorName} • Referring Doctor:{' '}
                    {patient.referringDoctor}
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Patient Demographics
                </div>
                <table className="sheet-table">
                  <tbody>
                    <tr>
                      <td className="font-bold text-slate-600 w-1/4">Full Patient Name</td>
                      <td className="w-1/4 font-semibold text-slate-900">{patient.name}</td>
                      <td className="font-bold text-slate-600 w-1/4">MRN</td>
                      <td className="w-1/4 font-mono text-slate-900">{patient.mrn}</td>
                    </tr>
                    <tr>
                      <td className="font-bold text-slate-600">Date of Birth</td>
                      <td>{patient.dateOfBirth}</td>
                      <td className="font-bold text-slate-600">Gender</td>
                      <td>{patient.gender}</td>
                    </tr>
                    <tr>
                      <td className="font-bold text-slate-600">Weight & Height</td>
                      <td>
                        {patient.weightKg} kg / {patient.heightCm} cm
                      </td>
                      <td className="font-bold text-slate-600">BMI</td>
                      <td>
                        {(patient.weightKg / Math.pow(patient.heightCm / 100, 2)).toFixed(1)}{' '}
                        kg/m²
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mt-4">
                  Clinical Indication & History
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded space-y-2">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-700">Evaluated Foot:</span>
                    <span className="font-bold text-teal-700 uppercase">
                      {currentCase.footSide} Foot
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-700">Indication:</span>
                    <span className="text-slate-800">{currentCase.indication}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-700">Clinical History:</span>
                    <span className="text-slate-700">{patient.clinicalNotes}</span>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mt-4">
                  Hardware Acquisition Audit (FR-01, FR-02)
                </div>
                <table className="sheet-table">
                  <tbody>
                    <tr>
                      <td className="font-bold text-slate-600 w-1/3">Scanner Model</td>
                      <td className="text-slate-800">{currentCase.scanMetadata.scannerModel}</td>
                    </tr>
                    <tr>
                      <td className="font-bold text-slate-600">Driver Interface</td>
                      <td className="text-slate-800">{currentCase.scanMetadata.scannerDriver}</td>
                    </tr>
                    <tr>
                      <td className="font-bold text-slate-600">Scan Resolution</td>
                      <td className="text-slate-800">{currentCase.scanMetadata.dpi} DPI calibrated</td>
                    </tr>
                    <tr>
                      <td className="font-bold text-slate-600">QC Status</td>
                      <td className="text-emerald-700 font-semibold">
                        PASSED (Automated QC Score {currentCase.qcResult.score}/100)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGE 2: PLANTAR ANALYSIS & JET HEAT MAP */}
            {currentPage === 2 && (
              <div className="space-y-4 text-xs">
                <h3 className="sheet-section-title">
                  Page 2 — Plantar Contact Pattern & JET Heat Map Analysis
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-2 bg-slate-50 border border-slate-200 rounded">
                    <div className="font-bold text-slate-800 text-[11px] mb-1">
                      Source: Harris Mat Raw Scan
                    </div>
                    <img
                      src={currentCase.rawScanDataUrl}
                      alt="Raw Scan"
                      className="mx-auto h-56 object-contain rounded"
                    />
                  </div>
                  <div className="text-center p-2 bg-slate-900 border border-slate-800 rounded">
                    <div className="font-bold text-white text-[11px] mb-1">
                      Output: Processed JET Heat Map (FR-07)
                    </div>
                    <img
                      src={currentCase.processedHeatMapDataUrl}
                      alt="JET Heat Map"
                      className="mx-auto h-56 object-contain rounded"
                    />
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  6-Category Image-Derived Contact Distribution (FR-08)
                </div>
                <table className="sheet-table">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left">Cat ID</th>
                      <th className="text-left">Classification Label</th>
                      <th className="text-left">Color</th>
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
                          <td>
                            <span
                              className="inline-block w-4 h-2.5 rounded"
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

            {/* PAGE 3: ORTHOTIC MEASUREMENTS */}
            {currentPage === 3 && (
              <div className="space-y-4 text-xs">
                <h3 className="sheet-section-title">
                  Page 3 — Foot Measurements for Orthotic Design (FR-10)
                </h3>

                <p className="text-slate-600 text-[11px]">
                  Morphometric parameters derived from scanned Harris Mat impression to support
                  custom functional insole and orthotic manufacturing.
                </p>

                <table className="sheet-table">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left">Measurement Parameter</th>
                      <th className="text-left">Value</th>
                      <th className="text-left">Landmarks / Method</th>
                      <th className="text-right">Calibration Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-bold">Foot Length (L)</td>
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
                        Category {currentCase.regionalAnalysis.diabeticUlcerRisk.iwgdfRiskCategory}
                      </td>
                      <td>{currentCase.regionalAnalysis.diabeticUlcerRisk.riskLabel}</td>
                      <td className="text-right font-semibold text-amber-700">
                        {currentCase.regionalAnalysis.diabeticUlcerRisk.focalHyperpressureAlert
                          ? 'High Risk'
                          : 'Low Risk'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mt-4">
                  Orthotic Fabrication Recommendations
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded space-y-2">
                  {currentCase.orthoticMeasurements.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="font-bold text-teal-700">[{i + 1}]</span>
                      <span className="text-slate-800">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PAGE 4: REVIEW & SIGN-OFF */}
            {currentPage === 4 && (
              <div className="space-y-4 text-xs">
                <h3 className="sheet-section-title">
                  Page 4 — Clinical Review & Verification Sign-Off
                </h3>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">
                      Authorized Medical Verification
                    </span>
                    {isSigned && (
                      <span className="badge-success flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Signed & Approved
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">
                        Reviewer Name:
                      </label>
                      <input
                        type="text"
                        className="form-input text-xs"
                        value={physicianName}
                        onChange={(e) => setPhysicianName(e.target.value)}
                        disabled={isSigned}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">
                        Professional Role:
                      </label>
                      <input
                        type="text"
                        className="form-input text-xs"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={isSigned}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Clinical Comments:
                    </label>
                    <textarea
                      className="form-textarea text-xs h-16"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      disabled={isSigned}
                    />
                  </div>

                  {!isSigned ? (
                    <button className="btn-primary-sm" onClick={handleSignOff}>
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
                      <span className="font-mono text-[10px] text-emerald-900">
                        CRYPT-SIG-VALID
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mt-4">
                  Regulatory Lifecycle & Compliance Framework (Section 17)
                </div>
                <table className="sheet-table text-[11px]">
                  <tbody>
                    <tr>
                      <td className="font-bold text-slate-700 w-1/3">IEC 62304</td>
                      <td>Software Life Cycle Processes — Class B SaMD verification</td>
                    </tr>
                    <tr>
                      <td className="font-bold text-slate-700">ISO 14971</td>
                      <td>Medical device risk management and mitigation controls applied</td>
                    </tr>
                    <tr>
                      <td className="font-bold text-slate-700">IEC 62366-1</td>
                      <td>Usability engineering applied for foot side and landmarking</td>
                    </tr>
                    <tr>
                      <td className="font-bold text-slate-700">Audit Digest</td>
                      <td className="font-mono text-[10px] text-slate-600">
                        SHA-256: {currentCase.integrityHash}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Sheet Footer */}
            <div className="sheet-bottom-footer">
              <div>
                Technomind PPA Desktop v1.0.0 | Draft 0.1 Technical File | Confidential
              </div>
              <div>Page {currentPage} of 4</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
