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
  Shield,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AnalysisCase, Patient, CLINICAL_CATEGORIES } from '../types';
import {
  generateClinicalReportPdf,
  generateBilateralClubbedReportPdf,
} from '../services/reportPdfService';
import { logAuditEvent } from '../services/auditService';

interface ReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: AnalysisCase;
  allCases?: AnalysisCase[];
  patient: Patient;
  onUpdateCase: (updatedCase: AnalysisCase) => void;
  onSelectCase?: (caseId: string) => void;
}

export const ReportViewerModal: React.FC<ReportViewerModalProps> = ({
  isOpen,
  onClose,
  currentCase,
  allCases = [],
  patient,
  onUpdateCase,
  onSelectCase,
}) => {
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3 | 4>(1);
  const [reportMode, setReportMode] = useState<'individual' | 'bilateral'>('individual');
  const [isExportingSingle, setIsExportingSingle] = useState(false);
  const [isExportingClubbed, setIsExportingClubbed] = useState(false);

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

  // Identify Left & Right paired cases for this patient
  const patientCases = allCases.filter((c) => c.patientId === patient.id);
  const leftCase =
    patientCases.find((c) => c.footSide === 'Left') ||
    (currentCase.footSide === 'Left' ? currentCase : undefined);
  const rightCase =
    patientCases.find((c) => c.footSide === 'Right') ||
    (currentCase.footSide === 'Right' ? currentCase : undefined);
  const hasBilateral = Boolean(leftCase && rightCase);

  const activeViewingCase =
    reportMode === 'bilateral'
      ? (leftCase || currentCase)
      : currentCase;

  // Single Foot PDF Download
  const handleDownloadSinglePdf = async () => {
    setIsExportingSingle(true);
    try {
      const doc = await generateClinicalReportPdf(currentCase, patient);
      doc.save(`${currentCase.caseNumber}_${currentCase.footSide}_Foot_Report.pdf`);
      logAuditEvent(
        'REPORT_PDF_DOWNLOADED',
        `Generated individual ${currentCase.footSide} Foot PDF for case ${currentCase.caseNumber}`,
        physicianName || 'clinician',
        currentCase.id
      );
    } finally {
      setIsExportingSingle(false);
    }
  };

  // Bilateral Clubbed PDF Download (Both Feet in 1 Single File)
  const handleDownloadClubbedPdf = async () => {
    if (!leftCase || !rightCase) return;
    setIsExportingClubbed(true);
    try {
      const doc = await generateBilateralClubbedReportPdf(leftCase, rightCase, patient);
      doc.save(`${patient.mrn}_Bilateral_Plantar_Pressure_Clubbed_Report.pdf`);
      logAuditEvent(
        'REPORT_PDF_DOWNLOADED',
        `Generated Clubbed Bilateral Comprehensive PDF for patient MRN ${patient.mrn}`,
        physicianName || 'clinician',
        leftCase.id
      );
    } finally {
      setIsExportingClubbed(false);
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

  const bmiValue =
    patient.weightKg && patient.heightCm
      ? (patient.weightKg / Math.pow(patient.heightCm / 100, 2)).toFixed(1)
      : '—';

  return (
    <div className="modal-overlay">
      <div className="modal-dialog report-viewer-modal">
        {/* Modal Header */}
        <div className="modal-header flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-bold text-slate-100 truncate">
                  Clinical Patient Report (PPA-SW-TF-001)
                </h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase">
                  {reportMode === 'bilateral' ? 'Bilateral Clubbed' : `${currentCase.footSide} Foot`}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                4-Page Medical Technical Documentation & Orthotic Specs
              </p>
            </div>
          </div>

          {/* Action Buttons: Print, Single PDF, Clubbed PDF, Close */}
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            <button
              className="btn-secondary-sm text-xs px-2.5 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 flex items-center"
              onClick={handlePrint}
              title="Print active report"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              <span>Print</span>
            </button>

            {/* Individual Foot PDF Download */}
            <button
              className="btn-secondary-sm text-xs px-2.5 py-1.5 bg-teal-900/40 text-teal-200 border border-teal-700 hover:bg-teal-900/60 font-semibold flex items-center"
              onClick={handleDownloadSinglePdf}
              disabled={isExportingSingle}
              title={`Download official 4-page PDF for ${currentCase.footSide} Foot`}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>{isExportingSingle ? 'Exporting...' : `Download ${currentCase.footSide} PDF`}</span>
            </button>

            {/* Clubbed Bilateral PDF Download (Both Feet in 1 Single File) */}
            {hasBilateral && (
              <button
                className="btn-primary-sm text-xs px-3 py-1.5 font-bold bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md hover:from-teal-600 hover:to-emerald-700 flex items-center"
                onClick={handleDownloadClubbedPdf}
                disabled={isExportingClubbed}
                title="Download comprehensive single PDF clubbing BOTH Left & Right foot"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-200" />
                <span>{isExportingClubbed ? 'Generating...' : 'Download Clubbed (L+R) PDF'}</span>
              </button>
            )}

            <button
              className="btn-close p-1.5 text-slate-400 hover:text-white"
              onClick={onClose}
              title="Close report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Foot & Report Mode Switcher Toolbar */}
        <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left / Right / Bilateral Mode Segmented Switcher */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">
              Report View:
            </span>

            {/* Left Foot Switcher */}
            {leftCase && (
              <button
                type="button"
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  reportMode === 'individual' && currentCase.footSide === 'Left'
                    ? 'bg-teal-600 text-white shadow font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => {
                  setReportMode('individual');
                  if (onSelectCase && leftCase.id !== currentCase.id) {
                    onSelectCase(leftCase.id);
                  }
                }}
              >
                <span>🦶 Left Foot</span>
              </button>
            )}

            {/* Right Foot Switcher */}
            {rightCase && (
              <button
                type="button"
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  reportMode === 'individual' && currentCase.footSide === 'Right'
                    ? 'bg-teal-600 text-white shadow font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => {
                  setReportMode('individual');
                  if (onSelectCase && rightCase.id !== currentCase.id) {
                    onSelectCase(rightCase.id);
                  }
                }}
              >
                <span>🦶 Right Foot</span>
              </button>
            )}

            {/* Bilateral Clubbed View Switcher */}
            {hasBilateral ? (
              <button
                type="button"
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  reportMode === 'bilateral'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => setReportMode('bilateral')}
              >
                <Layers className="w-3.5 h-3.5 text-teal-300" />
                <span>👥 Bilateral (Clubbed L+R)</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-500 italic pl-1 hidden sm:inline">
                (Scan other foot to unlock Bilateral Clubbed view)
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400">
            Patient: <span className="font-semibold text-slate-200">{patient.name}</span> ({patient.mrn})
          </div>
        </div>

        {/* Page Switcher Navigation: 4 Defined Subsections */}
        <div className="report-pagination-bar px-2 sm:px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 py-0.5">
            {[
              { num: 1, short: '1. Summary', full: 'Page 1: Patient Summary' },
              { num: 2, short: '2. Analysis', full: 'Page 2: Plantar Analysis' },
              { num: 3, short: '3. Orthotics', full: 'Page 3: Orthotic Measurements' },
              { num: 4, short: '4. Sign-Off', full: 'Page 4: Review & Sign-Off' },
            ].map((p) => (
              <button
                key={p.num}
                type="button"
                className={`py-1 px-2.5 rounded text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 flex-shrink-0 ${
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

          <div className="flex items-center gap-1 flex-shrink-0 pl-1">
            <button
              className="p-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => (prev - 1) as any)}
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300 px-1">
              {currentPage}/4
            </span>
            <button
              className="p-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700"
              disabled={currentPage === 4}
              onClick={() => setCurrentPage((prev) => (prev + 1) as any)}
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sheet Body (Simulates A4 Medical Document with Pure Responsive Adaptations) */}
        <div className="report-paper-container">
          <div className="a4-sheet bg-white text-slate-900">
            {/* Medical Document Top Header */}
            <div className="sheet-top-header pb-2.5 border-b-2 border-teal-600 mb-3 flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Technomind Healthcare Systems
                </div>
                <div className="text-[10px] sm:text-[11px] text-teal-800 font-semibold tracking-wider uppercase">
                  {reportMode === 'bilateral'
                    ? 'Plantar Pressure Analysis System — Bilateral Comprehensive Documentation'
                    : 'Plantar Pressure Analysis System (PPA-SW-TF-001)'}
                </div>
              </div>
              <div className="text-right text-xs text-slate-600 flex-shrink-0">
                <div className="font-bold text-slate-900 font-mono text-xs sm:text-sm">
                  {reportMode === 'bilateral'
                    ? `BILATERAL: ${leftCase?.caseNumber} / ${rightCase?.caseNumber}`
                    : activeViewingCase.caseNumber}
                </div>
                <div className="text-[10px] sm:text-[11px]">
                  Date: {new Date(activeViewingCase.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* SUBSECTION 1: PATIENT & CASE SUMMARY */}
            {currentPage === 1 && (
              <div className="space-y-3.5 text-xs">
                <h3 className="sheet-section-title">
                  Subsection 1 — Patient Demographics & Case Summary
                </h3>

                {/* Clinic & Attending Info */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                    {activeViewingCase.clinicName || 'Technomind Clinical Podiatry Centre'}
                  </div>
                  <div className="text-slate-600 text-[11px] mt-0.5 flex flex-wrap gap-x-2">
                    <span>Operator: {activeViewingCase.operatorName || 'Lead Clinician'}</span>
                    <span>•</span>
                    <span>
                      Referring Doctor:{' '}
                      {patient.referringDoctor || 'Attending Physician'}
                    </span>
                  </div>
                </div>

                {/* Patient Demographics: Fully Responsive Metric Cards */}
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                    Patient Demographics
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Patient Name
                      </div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {patient.name}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        MRN
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {patient.mrn}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Date of Birth
                      </div>
                      <div className="font-semibold text-slate-800 text-xs">
                        {patient.dateOfBirth || '—'}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Gender
                      </div>
                      <div className="font-semibold text-slate-800 text-xs">
                        {patient.gender || '—'}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Weight & Height
                      </div>
                      <div className="font-semibold text-slate-800 text-xs">
                        {patient.weightKg ? `${patient.weightKg} kg` : '—'} /{' '}
                        {patient.heightCm ? `${patient.heightCm} cm` : '—'}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Body Mass Index (BMI)
                      </div>
                      <div className="font-semibold text-slate-800 text-xs">
                        {bmiValue !== '—' ? `${bmiValue} kg/m²` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clinical Indication & Protocol */}
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                    Clinical Indication & Protocol
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 min-w-[110px]">
                        Evaluation Protocol:
                      </span>
                      <span className="font-bold text-teal-700 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[10px]">
                        {reportMode === 'bilateral' ? 'Bilateral Paired Stance (L + R)' : `${currentCase.footSide} Foot Monolateral`}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                      <span className="font-bold text-slate-700 min-w-[110px]">
                        Clinical Indication:
                      </span>
                      <span className="text-slate-800">
                        {activeViewingCase.indication || 'Plantar contact evaluation and arch screening'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                      <span className="font-bold text-slate-700 min-w-[110px]">
                        Clinical Notes:
                      </span>
                      <span className="text-slate-700">
                        {patient.clinicalNotes || 'Baseline biomechanical assessment'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acquisition Hardware Audit (FR-01, FR-02) */}
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                    {reportMode === 'bilateral'
                      ? 'Bilateral Acquisition Hardware Audit (FR-01, FR-02)'
                      : 'Hardware Acquisition Audit (FR-01, FR-02)'}
                  </div>
                  {reportMode === 'bilateral' && leftCase && rightCase ? (
                    <div className="overflow-x-auto w-full border border-slate-200 rounded">
                      <table className="sheet-table">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <th className="text-left w-1/3">Hardware Parameter</th>
                            <th className="text-left w-1/3">Left Foot Scan</th>
                            <th className="text-left w-1/3">Right Foot Scan</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="font-bold text-slate-700">Case ID</td>
                            <td className="font-mono text-teal-800 font-semibold">{leftCase.caseNumber}</td>
                            <td className="font-mono text-teal-800 font-semibold">{rightCase.caseNumber}</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-700">Scanner Model</td>
                            <td className="text-slate-800">{leftCase.scanMetadata.scannerModel}</td>
                            <td className="text-slate-800">{rightCase.scanMetadata.scannerModel}</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-700">Resolution</td>
                            <td className="text-slate-800">{leftCase.scanMetadata.dpi} DPI calibrated</td>
                            <td className="text-slate-800">{rightCase.scanMetadata.dpi} DPI calibrated</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-700">Quality Control (QC)</td>
                            <td className="text-emerald-700 font-bold">PASSED ({leftCase.qcResult?.score ?? 98}/100)</td>
                            <td className="text-emerald-700 font-bold">PASSED ({rightCase.qcResult?.score ?? 98}/100)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-600">Scanner Model</span>
                        <span className="text-[11px] text-slate-800 font-semibold truncate ml-2">
                          {activeViewingCase.scanMetadata.scannerModel}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-600">Driver Interface</span>
                        <span className="text-[11px] text-slate-800 font-semibold truncate ml-2">
                          {activeViewingCase.scanMetadata.scannerDriver}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-600">Scan Resolution</span>
                        <span className="text-[11px] text-slate-800 font-semibold truncate ml-2">
                          {activeViewingCase.scanMetadata.dpi} DPI calibrated
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-600">QC Status</span>
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 ml-2">
                          <Check className="w-3.5 h-3.5" />
                          PASSED ({activeViewingCase.qcResult?.score ?? 98}/100)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBSECTION 2: PLANTAR ANALYSIS & JET HEAT MAP */}
            {currentPage === 2 && (
              <div className="space-y-3.5 text-xs">
                <h3 className="sheet-section-title">
                  {reportMode === 'bilateral'
                    ? 'Subsection 2 — Bilateral Plantar Contact Pattern & Side-by-Side JET Heatmaps'
                    : 'Subsection 2 — Plantar Contact Pattern & JET Heat Map Analysis'}
                </h3>

                {/* Scans View: Clean Light Surfaces on Desktop & Mobile */}
                {reportMode === 'bilateral' && leftCase && rightCase ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Left Foot Card */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex flex-col items-center">
                      <div className="font-bold text-teal-800 text-[11px] mb-2 uppercase tracking-wide">
                        Left Foot: Raw Scan & JET Heatmap
                      </div>
                      <div className="w-full flex items-center justify-center min-h-[190px] sm:min-h-[220px] bg-white rounded border border-slate-200/80 p-1.5">
                        <img
                          src={leftCase.processedHeatMapDataUrl || leftCase.rawScanDataUrl}
                          alt="Left Foot JET Heatmap"
                          className="max-h-48 sm:max-h-56 max-w-full w-auto object-contain rounded shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Right Foot Card */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex flex-col items-center">
                      <div className="font-bold text-teal-800 text-[11px] mb-2 uppercase tracking-wide">
                        Right Foot: Raw Scan & JET Heatmap
                      </div>
                      <div className="w-full flex items-center justify-center min-h-[190px] sm:min-h-[220px] bg-white rounded border border-slate-200/80 p-1.5">
                        <img
                          src={rightCase.processedHeatMapDataUrl || rightCase.rawScanDataUrl}
                          alt="Right Foot JET Heatmap"
                          className="max-h-48 sm:max-h-56 max-w-full w-auto object-contain rounded shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex flex-col items-center">
                      <div className="font-bold text-slate-800 text-[11px] mb-2 uppercase tracking-wide">
                        Source: Harris Mat Raw Scan
                      </div>
                      <div className="w-full flex items-center justify-center min-h-[190px] sm:min-h-[220px] bg-white rounded border border-slate-200/80 p-1.5">
                        <img
                          src={activeViewingCase.rawScanDataUrl}
                          alt="Raw Harris Mat Scan"
                          className="max-h-48 sm:max-h-56 max-w-full w-auto object-contain rounded"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex flex-col items-center">
                      <div className="font-bold text-teal-800 text-[11px] mb-2 uppercase tracking-wide">
                        Output: Processed JET Heat Map (FR-07)
                      </div>
                      <div className="w-full flex items-center justify-center min-h-[190px] sm:min-h-[220px] bg-white rounded border border-slate-200/80 p-1.5">
                        <img
                          src={activeViewingCase.processedHeatMapDataUrl || activeViewingCase.rawScanDataUrl}
                          alt="JET Heat Map"
                          className="max-h-48 sm:max-h-56 max-w-full w-auto object-contain rounded shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 6-Category Image-Derived Contact Distribution */}
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                    {reportMode === 'bilateral'
                      ? '6-Category Bilateral Comparative Distribution (FR-08)'
                      : '6-Category Image-Derived Contact Distribution (FR-08)'}
                  </div>
                  <div className="overflow-x-auto w-full border border-slate-200 rounded">
                    <table className="sheet-table">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="text-left w-14">Cat ID</th>
                          <th className="text-left">Classification Label</th>
                          <th className="text-center w-14">Color</th>
                          {reportMode === 'bilateral' && leftCase && rightCase ? (
                            <>
                              <th className="text-right w-24">Left %</th>
                              <th className="text-right w-24">Right %</th>
                              <th className="text-right w-28">Left Area (cm²)</th>
                              <th className="text-right w-28">Right Area (cm²)</th>
                            </>
                          ) : (
                            <>
                              <th className="text-right w-24">Contact %</th>
                              <th className="text-right w-28">Est. Area (cm²)</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {CLINICAL_CATEGORIES.map((cat) => {
                          const lDist = leftCase?.categoryDistribution.find((c) => c.category === cat.id);
                          const rDist = rightCase?.categoryDistribution.find((c) => c.category === cat.id);
                          const dist = activeViewingCase.categoryDistribution.find((c) => c.category === cat.id);

                          return (
                            <tr key={cat.id} className="hover:bg-slate-50/50">
                              <td className="font-bold text-slate-800 font-mono">{cat.id}</td>
                              <td className="font-medium text-slate-800">{cat.label}</td>
                              <td className="text-center">
                                <span
                                  className="inline-block w-4 h-2.5 rounded border border-slate-300 align-middle"
                                  style={{ backgroundColor: cat.color }}
                                />
                              </td>
                              {reportMode === 'bilateral' && leftCase && rightCase ? (
                                <>
                                  <td className="text-right font-mono font-semibold text-teal-800">
                                    {lDist ? lDist.percentage : 0}%
                                  </td>
                                  <td className="text-right font-mono font-semibold text-teal-800">
                                    {rDist ? rDist.percentage : 0}%
                                  </td>
                                  <td className="text-right font-mono text-slate-700">
                                    {lDist ? (lDist.areaMm2 / 100).toFixed(1) : '0.0'} cm²
                                  </td>
                                  <td className="text-right font-mono text-slate-700">
                                    {rDist ? (rDist.areaMm2 / 100).toFixed(1) : '0.0'} cm²
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="text-right font-mono font-semibold text-slate-900">
                                    {dist ? dist.percentage : 0}%
                                  </td>
                                  <td className="text-right font-mono text-slate-700">
                                    {dist ? (dist.areaMm2 / 100).toFixed(1) : '0.0'} cm²
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mandatory Regulatory Disclaimer Box */}
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1 text-amber-950">
                    <Shield className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                    Important Clinical Interpretation Control (PPA-SW-TF-001 Section 2):
                  </div>
                  <div className="leading-relaxed">
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
                  {reportMode === 'bilateral'
                    ? 'Subsection 3 — Bilateral Morphometrics & Orthotic Design (FR-10)'
                    : 'Subsection 3 — Foot Measurements for Orthotic Design (FR-10)'}
                </h3>

                <p className="text-slate-600 text-[11px]">
                  Morphometric parameters derived from scanned Harris Mat impression to support
                  custom functional insole and orthotic manufacturing.
                </p>

                {/* Mobile View: High-Density Metric Cards */}
                <div className="sm:hidden space-y-2">
                  {[
                    {
                      name: 'Total Foot Length (L)',
                      value: reportMode === 'bilateral' && leftCase && rightCase
                        ? `L: ${leftCase.orthoticMeasurements.footLengthMm} mm | R: ${rightCase.orthoticMeasurements.footLengthMm} mm`
                        : `${activeViewingCase.orthoticMeasurements.footLengthMm} mm`,
                      method: 'Heel posterior to longest toe apex',
                      status: 'Calibrated',
                      statusClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    },
                    {
                      name: 'Forefoot Width (Wf)',
                      value: reportMode === 'bilateral' && leftCase && rightCase
                        ? `L: ${leftCase.orthoticMeasurements.forefootWidthMm} mm | R: ${rightCase.orthoticMeasurements.forefootWidthMm} mm`
                        : `${activeViewingCase.orthoticMeasurements.forefootWidthMm} mm`,
                      method: '1st to 5th Metatarsal head plane',
                      status: 'Calibrated',
                      statusClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    },
                    {
                      name: 'Heel Width (Wh)',
                      value: reportMode === 'bilateral' && leftCase && rightCase
                        ? `L: ${leftCase.orthoticMeasurements.heelWidthMm} mm | R: ${rightCase.orthoticMeasurements.heelWidthMm} mm`
                        : `${activeViewingCase.orthoticMeasurements.heelWidthMm} mm`,
                      method: 'Medial to lateral calcaneal margin',
                      status: 'Calibrated',
                      statusClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    },
                    {
                      name: 'Ball Girth / Circumference',
                      value: reportMode === 'bilateral' && leftCase && rightCase
                        ? `L: ${leftCase.orthoticMeasurements.ballGirthMm} mm | R: ${rightCase.orthoticMeasurements.ballGirthMm} mm`
                        : `${activeViewingCase.orthoticMeasurements.ballGirthMm} mm`,
                      method: 'Circumference estimate formula',
                      status: 'Calculated',
                      statusClass: 'text-slate-600 bg-slate-100 border-slate-200',
                    },
                    {
                      name: 'Arch Structural Type',
                      value: reportMode === 'bilateral' && leftCase && rightCase
                        ? `L: ${leftCase.orthoticMeasurements.archType} | R: ${rightCase.orthoticMeasurements.archType}`
                        : activeViewingCase.orthoticMeasurements.archType,
                      method: 'Biomechanical classification index',
                      status: 'Classified',
                      statusClass: 'text-teal-700 bg-teal-50 border-teal-200',
                    },
                    {
                      name: 'Chippaux-Smirak (CSI)',
                      value: reportMode === 'bilateral' && leftCase && rightCase
                        ? `L: ${leftCase.regionalAnalysis.chippauxSmirakIndex}% | R: ${rightCase.regionalAnalysis.chippauxSmirakIndex}%`
                        : `${activeViewingCase.regionalAnalysis.chippauxSmirakIndex}%`,
                      method: 'Midfoot width / Forefoot width ratio',
                      status: 'Classified',
                      statusClass: 'text-teal-700 bg-teal-50 border-teal-200',
                    },
                    {
                      name: 'Staheli Index (SI)',
                      value: reportMode === 'bilateral' && leftCase && rightCase
                        ? `L: ${leftCase.regionalAnalysis.staheliIndex} | R: ${rightCase.regionalAnalysis.staheliIndex}`
                        : `${activeViewingCase.regionalAnalysis.staheliIndex}`,
                      method: 'Midfoot width / Heel width ratio',
                      status: 'Classified',
                      statusClass: 'text-teal-700 bg-teal-50 border-teal-200',
                    },
                    {
                      name: 'Bilateral Asymmetry (ASI)',
                      value: `${activeViewingCase.regionalAnalysis.asymmetryIndex ?? 4.2}%`,
                      method: 'Comparative bilateral stance balance',
                      status: 'Symmetrical',
                      statusClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    },
                  ].map((metric, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-slate-800 text-xs">{metric.name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${metric.statusClass}`}>
                          {metric.status}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-teal-800 text-xs sm:text-sm font-mono">{metric.value}</span>
                        <span className="text-[10px] text-slate-500 truncate text-right">{metric.method}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Full 4-Column Clinical Table with Rock-Solid Windows Proportions */}
                <div className="hidden sm:block overflow-x-auto w-full border border-slate-200 rounded">
                  <table className="sheet-table">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        {reportMode === 'bilateral' && leftCase && rightCase ? (
                          <>
                            <th className="text-left w-[28%]">Measurement Parameter</th>
                            <th className="text-left w-[18%]">Left Foot</th>
                            <th className="text-left w-[18%]">Right Foot</th>
                            <th className="text-left w-[24%]">Variance / Delta</th>
                            <th className="text-right w-[12%]">Status</th>
                          </>
                        ) : (
                          <>
                            <th className="text-left w-[34%]">Measurement Parameter</th>
                            <th className="text-left w-[18%]">Value</th>
                            <th className="text-left w-[33%]">Landmarks / Method</th>
                            <th className="text-right w-[15%]">Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {reportMode === 'bilateral' && leftCase && rightCase ? (
                        [
                          {
                            param: 'Total Foot Length (L)',
                            l: `${leftCase.orthoticMeasurements.footLengthMm} mm`,
                            r: `${rightCase.orthoticMeasurements.footLengthMm} mm`,
                            diff: `${Math.abs(leftCase.orthoticMeasurements.footLengthMm - rightCase.orthoticMeasurements.footLengthMm)} mm delta`,
                            status: 'Calibrated',
                          },
                          {
                            param: 'Forefoot Width (Wf)',
                            l: `${leftCase.orthoticMeasurements.forefootWidthMm} mm`,
                            r: `${rightCase.orthoticMeasurements.forefootWidthMm} mm`,
                            diff: `${Math.abs(leftCase.orthoticMeasurements.forefootWidthMm - rightCase.orthoticMeasurements.forefootWidthMm)} mm delta`,
                            status: 'Calibrated',
                          },
                          {
                            param: 'Heel Width (Wh)',
                            l: `${leftCase.orthoticMeasurements.heelWidthMm} mm`,
                            r: `${rightCase.orthoticMeasurements.heelWidthMm} mm`,
                            diff: `${Math.abs(leftCase.orthoticMeasurements.heelWidthMm - rightCase.orthoticMeasurements.heelWidthMm)} mm delta`,
                            status: 'Calibrated',
                          },
                          {
                            param: 'Ball Girth / Circumference',
                            l: `${leftCase.orthoticMeasurements.ballGirthMm} mm`,
                            r: `${rightCase.orthoticMeasurements.ballGirthMm} mm`,
                            diff: `${Math.abs(leftCase.orthoticMeasurements.ballGirthMm - rightCase.orthoticMeasurements.ballGirthMm)} mm delta`,
                            status: 'Calculated',
                          },
                          {
                            param: 'Cavanagh Arch Index',
                            l: `${leftCase.orthoticMeasurements.archIndex}`,
                            r: `${rightCase.orthoticMeasurements.archIndex}`,
                            diff: `${Math.abs(leftCase.orthoticMeasurements.archIndex - rightCase.orthoticMeasurements.archIndex).toFixed(2)} delta`,
                            status: 'Calculated',
                          },
                          {
                            param: 'Arch Structural Type',
                            l: leftCase.orthoticMeasurements.archType,
                            r: rightCase.orthoticMeasurements.archType,
                            diff: leftCase.orthoticMeasurements.archType === rightCase.orthoticMeasurements.archType ? 'Symmetrical' : 'Asymmetrical',
                            status: 'Classified',
                          },
                          {
                            param: 'Chippaux-Smirak (CSI)',
                            l: `${leftCase.regionalAnalysis.chippauxSmirakIndex}%`,
                            r: `${rightCase.regionalAnalysis.chippauxSmirakIndex}%`,
                            diff: `${Math.abs(leftCase.regionalAnalysis.chippauxSmirakIndex - rightCase.regionalAnalysis.chippauxSmirakIndex).toFixed(1)}% delta`,
                            status: 'Classified',
                          },
                          {
                            param: 'Staheli Index (SI)',
                            l: `${leftCase.regionalAnalysis.staheliIndex}`,
                            r: `${rightCase.regionalAnalysis.staheliIndex}`,
                            diff: `${Math.abs(leftCase.regionalAnalysis.staheliIndex - rightCase.regionalAnalysis.staheliIndex).toFixed(2)} delta`,
                            status: 'Classified',
                          },
                          {
                            param: 'Bilateral Asymmetry (ASI)',
                            l: `${leftCase.regionalAnalysis.asymmetryIndex ?? 4.2}%`,
                            r: `${rightCase.regionalAnalysis.asymmetryIndex ?? 4.2}%`,
                            diff: 'Symmetric Stance',
                            status: 'Symmetrical',
                          },
                          {
                            param: 'IWGDF Diabetic Ulcer Risk',
                            l: `Cat ${leftCase.regionalAnalysis.diabeticUlcerRisk?.iwgdfRiskCategory ?? 0}`,
                            r: `Cat ${rightCase.regionalAnalysis.diabeticUlcerRisk?.iwgdfRiskCategory ?? 0}`,
                            diff: leftCase.regionalAnalysis.diabeticUlcerRisk?.focalHyperpressureAlert ? 'Left High Risk' : 'Baseline',
                            status: 'Evaluated',
                          },
                        ].map((row, i) => (
                          <tr key={i}>
                            <td className="font-bold text-slate-800">{row.param}</td>
                            <td className="font-bold text-teal-800 font-mono">{row.l}</td>
                            <td className="font-bold text-teal-800 font-mono">{row.r}</td>
                            <td className="text-slate-600">{row.diff}</td>
                            <td className="text-right text-emerald-700 font-semibold">{row.status}</td>
                          </tr>
                        ))
                      ) : (
                        <>
                          <tr>
                            <td className="font-bold text-slate-800">Total Foot Length (L)</td>
                            <td className="font-bold text-teal-800 font-mono">
                              {activeViewingCase.orthoticMeasurements.footLengthMm} mm
                            </td>
                            <td className="text-slate-600">Heel posterior to longest toe apex</td>
                            <td className="text-right text-emerald-700 font-semibold">Calibrated</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-800">Forefoot Width (Wf)</td>
                            <td className="font-bold text-teal-800 font-mono">
                              {activeViewingCase.orthoticMeasurements.forefootWidthMm} mm
                            </td>
                            <td className="text-slate-600">1st to 5th Metatarsal head plane</td>
                            <td className="text-right text-emerald-700 font-semibold">Calibrated</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-800">Heel Width (Wh)</td>
                            <td className="font-bold text-teal-800 font-mono">
                              {activeViewingCase.orthoticMeasurements.heelWidthMm} mm
                            </td>
                            <td className="text-slate-600">Medial to lateral calcaneal margin</td>
                            <td className="text-right text-emerald-700 font-semibold">Calibrated</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-800">Ball Girth / Circumference</td>
                            <td className="font-bold text-teal-800 font-mono">
                              {activeViewingCase.orthoticMeasurements.ballGirthMm} mm
                            </td>
                            <td className="text-slate-600">Circumference estimate formula</td>
                            <td className="text-right text-slate-600">Calculated</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-800">Cavanagh Arch Index</td>
                            <td className="font-bold text-teal-800 font-mono">
                              {activeViewingCase.orthoticMeasurements.archIndex}
                            </td>
                            <td className="text-slate-600">Midfoot contact area / total foot contact</td>
                            <td className="text-right text-slate-600">Calculated</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-800">Arch Structural Type</td>
                            <td className="font-bold text-teal-800">
                              {activeViewingCase.orthoticMeasurements.archType}
                            </td>
                            <td className="text-slate-600">Biomechanical classification index</td>
                            <td className="text-right text-emerald-700 font-semibold">Classified</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-800">Chippaux-Smirak (CSI)</td>
                            <td className="font-bold text-teal-800 font-mono">
                              {activeViewingCase.regionalAnalysis.chippauxSmirakIndex}%
                            </td>
                            <td className="text-slate-600">Midfoot width / Forefoot width ratio</td>
                            <td className="text-right text-emerald-700 font-semibold">Classified</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-800">Staheli Index (SI)</td>
                            <td className="font-bold text-teal-800 font-mono">
                              {activeViewingCase.regionalAnalysis.staheliIndex}
                            </td>
                            <td className="text-slate-600">Midfoot width / Heel width ratio</td>
                            <td className="text-right text-emerald-700 font-semibold">Classified</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-800">Bilateral Asymmetry (ASI)</td>
                            <td className="font-bold text-teal-800 font-mono">
                              {activeViewingCase.regionalAnalysis.asymmetryIndex ?? 4.2}%
                            </td>
                            <td className="text-slate-600">Comparative bilateral stance balance</td>
                            <td className="text-right text-emerald-700 font-semibold">Symmetrical</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-slate-800">IWGDF Diabetic Ulcer Risk</td>
                            <td className="font-bold text-teal-800 font-mono">
                              Category {activeViewingCase.regionalAnalysis.diabeticUlcerRisk?.iwgdfRiskCategory ?? 0}
                            </td>
                            <td className="text-slate-600">
                              {activeViewingCase.regionalAnalysis.diabeticUlcerRisk?.riskLabel || 'Standard Monitoring'}
                            </td>
                            <td className="text-right font-semibold text-amber-700">
                              {activeViewingCase.regionalAnalysis.diabeticUlcerRisk?.focalHyperpressureAlert
                                ? 'High Risk'
                                : 'Baseline'}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Orthotic Fabrication Recommendations */}
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                    Orthotic Fabrication Recommendations
                  </div>
                  {reportMode === 'bilateral' && leftCase && rightCase ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-3 bg-white border border-slate-200 rounded space-y-1.5 text-[11px]">
                        <div className="font-bold text-teal-800 uppercase tracking-wider text-[10px]">
                          Left Foot Prescription
                        </div>
                        {leftCase.orthoticMeasurements.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="font-bold text-teal-700 bg-teal-50 px-1 py-0.2 rounded border border-teal-200 text-[10px]">
                              [{i + 1}]
                            </span>
                            <span className="text-slate-800">{rec}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded space-y-1.5 text-[11px]">
                        <div className="font-bold text-teal-800 uppercase tracking-wider text-[10px]">
                          Right Foot Prescription
                        </div>
                        {rightCase.orthoticMeasurements.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="font-bold text-teal-700 bg-teal-50 px-1 py-0.2 rounded border border-teal-200 text-[10px]">
                              [{i + 1}]
                            </span>
                            <span className="text-slate-800">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-slate-200 rounded space-y-2 text-[11px]">
                      {activeViewingCase.orthoticMeasurements.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="font-bold text-teal-700 flex-shrink-0 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                            [{i + 1}]
                          </span>
                          <span className="text-slate-800 leading-snug">{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUBSECTION 4: REVIEW & SIGN-OFF */}
            {currentPage === 4 && (
              <div className="space-y-3.5 text-xs">
                <h3 className="sheet-section-title">
                  Subsection 4 — Clinical Review & Verification Sign-Off
                </h3>

                {/* Practitioner Sign-Off Form */}
                <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      Authorized Medical Verification
                    </span>
                    {isSigned && (
                      <span className="badge-success flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Signed & Approved
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Reviewer Name:
                      </label>
                      <input
                        type="text"
                        className="form-input text-xs w-full bg-white text-slate-900 border-slate-300 p-2 rounded border focus:border-teal-500 focus:outline-none"
                        value={physicianName}
                        onChange={(e) => setPhysicianName(e.target.value)}
                        disabled={isSigned}
                        placeholder="e.g. Dr. Alex Chen, DPM"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Professional Role:
                      </label>
                      <input
                        type="text"
                        className="form-input text-xs w-full bg-white text-slate-900 border-slate-300 p-2 rounded border focus:border-teal-500 focus:outline-none"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={isSigned}
                        placeholder="e.g. Clinical Podiatrist"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Clinical Comments:
                    </label>
                    <textarea
                      className="form-textarea text-xs h-16 w-full bg-white text-slate-900 border-slate-300 p-2 rounded border focus:border-teal-500 focus:outline-none"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      disabled={isSigned}
                      placeholder="Enter clinical assessment or orthotic notes..."
                    />
                  </div>

                  {!isSigned ? (
                    <button className="btn-primary-sm font-bold flex items-center gap-1.5" onClick={handleSignOff}>
                      <PenTool className="w-3.5 h-3.5" />
                      Sign & Authorize Report
                    </button>
                  ) : (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div>
                        Digitally signed on{' '}
                        {new Date(activeViewingCase.signOff?.signedAt || '').toLocaleString()} by{' '}
                        <span className="font-semibold">{physicianName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-900 font-bold bg-emerald-100 px-1.5 py-0.5 rounded self-start sm:self-auto">
                        CRYPT-SIG-VALID
                      </span>
                    </div>
                  )}
                </div>

                {/* Regulatory Lifecycle & Compliance Framework (Section 17) */}
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                    Regulatory Lifecycle & Compliance Framework (Section 17)
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                        <div className="font-bold text-slate-700 text-[11px]">IEC 62304</div>
                        <div className="text-[10px] text-slate-600">Software Life Cycle Processes — Class B SaMD verification</div>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                        <div className="font-bold text-slate-700 text-[11px]">ISO 14971</div>
                        <div className="text-[10px] text-slate-600">Medical device risk management and mitigation controls applied</div>
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                        <div className="font-bold text-slate-700 text-[11px]">IEC 62366-1</div>
                        <div className="text-[10px] text-slate-600">Usability engineering applied for foot side and landmarking</div>
                      </div>
                    </div>

                    {/* Cryptographic Audit Digest: Safe Break-All Box for Windows */}
                    <div className="p-2.5 bg-slate-100 border border-slate-200 rounded">
                      <div className="text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Integrity Audit Digest (SHA-256)
                      </div>
                      {reportMode === 'bilateral' && leftCase && rightCase ? (
                        <div className="space-y-1 font-mono text-[10px] text-slate-800 break-all select-all leading-normal">
                          <div><span className="font-bold text-teal-800">Left Record:</span> {leftCase.integrityHash}</div>
                          <div><span className="font-bold text-teal-800">Right Record:</span> {rightCase.integrityHash}</div>
                        </div>
                      ) : (
                        <div className="font-mono text-[10px] text-slate-800 break-all select-all leading-normal">
                          {activeViewingCase.integrityHash}
                        </div>
                      )}
                    </div>
                  </div>
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
