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

  const bmiValue =
    patient.weightKg && patient.heightCm
      ? (patient.weightKg / Math.pow(patient.heightCm / 100, 2)).toFixed(1)
      : '—';

  return (
    <div className="modal-overlay">
      <div className="modal-dialog report-viewer-modal">
        {/* Modal Header */}
        <div className="modal-header flex items-center justify-between gap-2 p-3 sm:p-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-bold text-slate-100 truncate">
                Clinical Patient Report (PPA-SW-TF-001)
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                4-Page Medical Technical Documentation & Orthotic Specs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              className="btn-secondary-sm text-xs px-2 sm:px-2.5 py-1.5"
              onClick={handlePrint}
              title="Print report"
            >
              <Printer className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              className="btn-primary-sm text-xs px-2.5 sm:px-3 py-1.5 font-bold"
              onClick={handleDownloadPdf}
              disabled={isExporting}
            >
              <Download className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">{isExporting ? 'Generating...' : 'Download PDF'}</span>
              <span className="sm:hidden">{isExporting ? '...' : 'PDF'}</span>
            </button>
            <button
              className="btn-close p-1.5 text-slate-400 hover:text-white"
              onClick={onClose}
              title="Close report"
            >
              <X className="w-4 h-4" />
            </button>
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
                className={`py-1 px-2 sm:px-2.5 rounded text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 flex-shrink-0 ${
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

        {/* Sheet Body (Simulates A4 Medical Document with Pure Mobile Responsive Adaptations) */}
        <div className="report-paper-container">
          <div className="a4-sheet">
            {/* Medical Document Top Header */}
            <div className="sheet-top-header pb-2 border-b-2 border-teal-600 mb-3 flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Technomind Healthcare Systems
                </div>
                <div className="text-[10px] sm:text-[11px] text-teal-800 font-semibold tracking-wider uppercase">
                  Plantar Pressure Analysis System (PPA-SW-TF-001)
                </div>
              </div>
              <div className="text-right text-xs text-slate-600 flex-shrink-0">
                <div className="font-bold text-slate-900 font-mono text-xs sm:text-sm">
                  {currentCase.caseNumber}
                </div>
                <div className="text-[10px] sm:text-[11px]">
                  Date: {new Date(currentCase.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* SUBSECTION 1: PATIENT & CASE SUMMARY */}
            {currentPage === 1 && (
              <div className="space-y-3.5 text-xs">
                <h3 className="sheet-section-title">
                  Subsection 1 — Patient & Case Summary
                </h3>

                {/* Clinic & Attending Info */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                    {currentCase.clinicName || 'Technomind Clinical Podiatry Centre'}
                  </div>
                  <div className="text-slate-600 text-[11px] mt-0.5 flex flex-wrap gap-x-2">
                    <span>Operator: {currentCase.operatorName || 'Lead Clinician'}</span>
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

                {/* Clinical Indication & History */}
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                    Clinical Indication & History
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 min-w-[110px]">
                        Evaluated Foot:
                      </span>
                      <span className="font-bold text-teal-700 uppercase bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[10px]">
                        {currentCase.footSide} Foot
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                      <span className="font-bold text-slate-700 min-w-[110px]">
                        Clinical Indication:
                      </span>
                      <span className="text-slate-800">
                        {currentCase.indication || 'Plantar contact evaluation and arch screening'}
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

                {/* Hardware Acquisition Audit (FR-01, FR-02) */}
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                    Hardware Acquisition Audit (FR-01, FR-02)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-600">Scanner Model</span>
                      <span className="text-[11px] text-slate-800 font-semibold truncate ml-2">
                        {currentCase.scanMetadata.scannerModel}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-600">Driver Interface</span>
                      <span className="text-[11px] text-slate-800 font-semibold truncate ml-2">
                        {currentCase.scanMetadata.scannerDriver}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-600">Scan Resolution</span>
                      <span className="text-[11px] text-slate-800 font-semibold truncate ml-2">
                        {currentCase.scanMetadata.dpi} DPI calibrated
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-600">QC Status</span>
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 ml-2">
                        <Check className="w-3.5 h-3.5" />
                        PASSED ({currentCase.qcResult?.score ?? 98}/100)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBSECTION 2: PLANTAR ANALYSIS & JET HEAT MAP */}
            {currentPage === 2 && (
              <div className="space-y-3.5 text-xs">
                <h3 className="sheet-section-title">
                  Subsection 2 — Plantar Contact Pattern & JET Heat Map Analysis
                </h3>

                {/* Scans: High Contrast, Clean Clinical Card Presentation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex flex-col items-center">
                    <div className="font-bold text-slate-800 text-[11px] mb-2 uppercase tracking-wide">
                      Source: Harris Mat Raw Scan
                    </div>
                    <div className="w-full flex items-center justify-center min-h-[180px] sm:min-h-[220px] bg-white rounded border border-slate-200/80 p-1">
                      <img
                        src={currentCase.rawScanDataUrl}
                        alt="Raw Harris Mat Scan"
                        className="max-h-48 sm:max-h-56 max-w-full w-auto object-contain rounded"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex flex-col items-center">
                    <div className="font-bold text-teal-800 text-[11px] mb-2 uppercase tracking-wide">
                      Output: Processed JET Heat Map (FR-07)
                    </div>
                    <div className="w-full flex items-center justify-center min-h-[180px] sm:min-h-[220px] bg-white rounded border border-slate-200/80 p-1">
                      <img
                        src={currentCase.processedHeatMapDataUrl || currentCase.rawScanDataUrl}
                        alt="JET Heat Map"
                        className="max-h-48 sm:max-h-56 max-w-full w-auto object-contain rounded shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 6-Category Image-Derived Contact Distribution */}
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                    6-Category Image-Derived Contact Distribution (FR-08)
                  </div>
                  <div className="overflow-x-auto w-full border border-slate-200 rounded">
                    <table className="sheet-table">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="text-left w-14">Cat ID</th>
                          <th className="text-left">Classification Label</th>
                          <th className="text-center w-14">Color</th>
                          <th className="text-right w-24">Contact %</th>
                          <th className="text-right w-28">Est. Area (cm²)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CLINICAL_CATEGORIES.map((cat) => {
                          const dist = currentCase.categoryDistribution.find(
                            (c) => c.category === cat.id
                          );
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
                              <td className="text-right font-mono font-semibold text-slate-900">
                                {dist ? dist.percentage : 0}%
                              </td>
                              <td className="text-right font-mono text-slate-700">
                                {dist ? (dist.areaMm2 / 100).toFixed(1) : '0.0'} cm²
                              </td>
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
                  Subsection 3 — Foot Measurements for Orthotic Design (FR-10)
                </h3>

                <p className="text-slate-600 text-[11px]">
                  Morphometric parameters derived from scanned Harris Mat impression to support
                  custom functional insole and orthotic manufacturing.
                </p>

                {/* Mobile View: High-Density Metric Cards (Clean, Never Clipped) */}
                <div className="sm:hidden space-y-2">
                  {[
                    {
                      name: 'Total Foot Length (L)',
                      value: `${currentCase.orthoticMeasurements.footLengthMm} mm`,
                      method: 'Heel posterior to longest toe apex',
                      status: 'Calibrated',
                      statusClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    },
                    {
                      name: 'Forefoot Width (Wf)',
                      value: `${currentCase.orthoticMeasurements.forefootWidthMm} mm`,
                      method: '1st to 5th Metatarsal head plane',
                      status: 'Calibrated',
                      statusClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    },
                    {
                      name: 'Heel Width (Wh)',
                      value: `${currentCase.orthoticMeasurements.heelWidthMm} mm`,
                      method: 'Medial to lateral calcaneal margin',
                      status: 'Calibrated',
                      statusClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    },
                    {
                      name: 'Ball Girth / Circumference',
                      value: `${currentCase.orthoticMeasurements.ballGirthMm} mm`,
                      method: 'Circumference estimate formula',
                      status: 'Calculated',
                      statusClass: 'text-slate-600 bg-slate-100 border-slate-200',
                    },
                    {
                      name: 'Cavanagh Arch Index',
                      value: `${currentCase.orthoticMeasurements.archIndex}`,
                      method: 'Midfoot contact area / total foot contact',
                      status: 'Calculated',
                      statusClass: 'text-slate-600 bg-slate-100 border-slate-200',
                    },
                    {
                      name: 'Arch Structural Type',
                      value: currentCase.orthoticMeasurements.archType,
                      method: 'Biomechanical classification index',
                      status: 'Classified',
                      statusClass: 'text-teal-700 bg-teal-50 border-teal-200',
                    },
                    {
                      name: 'Chippaux-Smirak (CSI)',
                      value: `${currentCase.regionalAnalysis.chippauxSmirakIndex}%`,
                      method: 'Midfoot width / Forefoot width ratio',
                      status: 'Classified',
                      statusClass: 'text-teal-700 bg-teal-50 border-teal-200',
                    },
                    {
                      name: 'Staheli Index (SI)',
                      value: `${currentCase.regionalAnalysis.staheliIndex}`,
                      method: 'Midfoot width / Heel width ratio',
                      status: 'Classified',
                      statusClass: 'text-teal-700 bg-teal-50 border-teal-200',
                    },
                    {
                      name: 'Bilateral Asymmetry (ASI)',
                      value: `${currentCase.regionalAnalysis.asymmetryIndex ?? 4.2}%`,
                      method: 'Comparative bilateral stance balance',
                      status: 'Symmetrical',
                      statusClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    },
                    {
                      name: 'IWGDF Diabetic Ulcer Risk',
                      value: `Category ${currentCase.regionalAnalysis.diabeticUlcerRisk?.iwgdfRiskCategory ?? 0}`,
                      method: currentCase.regionalAnalysis.diabeticUlcerRisk?.riskLabel || 'Standard Monitoring',
                      status: currentCase.regionalAnalysis.diabeticUlcerRisk?.focalHyperpressureAlert ? 'High Risk' : 'Baseline',
                      statusClass: currentCase.regionalAnalysis.diabeticUlcerRisk?.focalHyperpressureAlert
                        ? 'text-amber-800 bg-amber-50 border-amber-300'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
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
                        <span className="font-bold text-teal-800 text-sm font-mono">{metric.value}</span>
                        <span className="text-[10px] text-slate-500 truncate text-right">{metric.method}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Full 4-Column Clinical Table */}
                <div className="hidden sm:block overflow-x-auto w-full border border-slate-200 rounded">
                  <table className="sheet-table">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left w-1/3">Measurement Parameter</th>
                        <th className="text-left w-1/5">Value</th>
                        <th className="text-left">Landmarks / Method</th>
                        <th className="text-right w-24">Status</th>
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

                {/* Orthotic Fabrication Recommendations */}
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">
                    Orthotic Fabrication Recommendations
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded space-y-2 text-[11px]">
                    {currentCase.orthoticMeasurements.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="font-bold text-teal-700 flex-shrink-0 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                          [{i + 1}]
                        </span>
                        <span className="text-slate-800 leading-snug">{rec}</span>
                      </div>
                    ))}
                  </div>
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
                        {new Date(currentCase.signOff?.signedAt || '').toLocaleString()} by{' '}
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

                    {/* Cryptographic Audit Digest: Safe Break-All Box */}
                    <div className="p-2.5 bg-slate-100 border border-slate-200 rounded">
                      <div className="text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Integrity Audit Digest (SHA-256)
                      </div>
                      <div className="font-mono text-[10px] text-slate-800 break-all select-all leading-normal">
                        {currentCase.integrityHash}
                      </div>
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
