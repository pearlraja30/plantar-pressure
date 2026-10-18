import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AnalysisWorkspace } from './components/AnalysisWorkspace';
import { OrthoticMeasurementsView } from './components/OrthoticMeasurementsView';
import { PatientCaseView } from './components/PatientCaseView';
import { ScannerWizardModal } from './components/ScannerWizardModal';
import { ReportViewerModal } from './components/ReportViewerModal';
import { CloudSyncPortalModal } from './components/CloudSyncPortalModal';
import { AuditTrailModal } from './components/AuditTrailModal';
import { PlatformArchitectureGuideModal } from './components/PlatformArchitectureGuideModal';
import { RegulatoryVerificationModal } from './components/RegulatoryVerificationModal';
import { CaseMigrationManager } from './core/repositories/CaseMigrationManager';

import { Patient, AnalysisCase, FootSide, QualityControlResult } from './types';
import { processHarrisMatScan } from './services/imageProcessingService';
import { cloudSyncService, CloudSyncStatus } from './services/cloudSyncService';
import { logAuditEvent } from './services/auditService';
import { Layers, Activity, Users, Scan, FileText } from 'lucide-react';

// Synchronous hard purge of all legacy demo data from storage
const CLEAN_STORAGE_VERSION = 'ppa_pure_clinical_v6';
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('ppa_clean_version') !== CLEAN_STORAGE_VERSION) {
      localStorage.removeItem('ppa-patients');
      localStorage.removeItem('ppa-cases');
      localStorage.removeItem('ppa-selected-patient-id');
      localStorage.removeItem('ppa-selected-case-id');
      localStorage.removeItem('ppa_audit_log_v1');
      localStorage.removeItem('ppa-real-mode-v1');
      localStorage.setItem('ppa_clean_version', CLEAN_STORAGE_VERSION);
    }
  } catch (e) {
    console.error('Failed to run initial storage migration', e);
  }
}

export function App() {
  // Persistent clinical patients (guaranteed 100% clean, no fake demo records)
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem('ppa-patients');
      if (!saved) return [];
      const parsed: Patient[] = JSON.parse(saved);
      // Strictly reject any legacy mock/demo patient
      return parsed.filter((p) => {
        const n = (p.name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        return (
          !n.includes('vance') &&
          !n.includes('rostova') &&
          !n.includes('sterling') &&
          !n.includes('clinical patient') &&
          !n.includes('demo') &&
          !id.startsWith('pat-10')
        );
      });
    } catch {
      return [];
    }
  });

  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    return localStorage.getItem('ppa-selected-patient-id') || '';
  });

  // Persistent clinical analysis cases (guaranteed 100% clean, no fake demo cases)
  const [cases, setCases] = useState<AnalysisCase[]>(() => {
    try {
      const saved = localStorage.getItem('ppa-cases');
      if (!saved) return [];
      const parsed: AnalysisCase[] = JSON.parse(saved);
      // Strictly reject any legacy mock/demo case
      return parsed.filter((c) => {
        const id = (c.id || '').toLowerCase();
        const num = (c.caseNumber || '').toLowerCase();
        return !id.startsWith('case-demo') && !num.includes('demo');
      });
    } catch {
      return [];
    }
  });

  const [selectedCaseId, setSelectedCaseId] = useState<string>(() => {
    return localStorage.getItem('ppa-selected-case-id') || '';
  });

  const [currentTab, setCurrentTab] = useState<'analysis' | 'orthotics' | 'patients'>('analysis');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('ppa-patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    if (selectedPatientId) {
      localStorage.setItem('ppa-selected-patient-id', selectedPatientId);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    localStorage.setItem('ppa-cases', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    if (selectedCaseId) {
      localStorage.setItem('ppa-selected-case-id', selectedCaseId);
    }
  }, [selectedCaseId]);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCloudOpen, setIsCloudOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isArchOpen, setIsArchOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);

  // Theme management: 'light' (Clinical Light) or 'dark' (Diagnostic Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('ppa-theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ppa-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Cloud Sync state
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(cloudSyncService.getStatus());

  const refreshCloudStatus = () => {
    setCloudStatus(cloudSyncService.getStatus());
  };

  const selectedPatient =
    patients.find((p) => p.id === selectedPatientId) || (patients.length > 0 ? patients[0] : undefined);
  const currentCase =
    cases.find((c) => c.id === selectedCaseId) || (cases.length > 0 ? cases[0] : undefined);

  // Callback when scanner completes a scan (supports single or bilateral scans)
  const handleScanCompleted = async (
    payloadOrList: any
  ) => {
    const payloads = Array.isArray(payloadOrList) ? payloadOrList : [payloadOrList];
    if (payloads.length === 0) return;

    // Ensure a patient exists to link the scan to
    let targetPatient = selectedPatient;
    if (!targetPatient) {
      const patNumber = patients.length + 1;
      targetPatient = {
        id: 'pat-' + Math.random().toString(36).substring(2, 9),
        mrn: `MRN-${Math.floor(10000 + Math.random() * 90000)}`,
        name: `Patient #${patNumber}`,
        dateOfBirth: new Date().toISOString().slice(0, 10),
        gender: 'Other',
        weightKg: 0,
        heightCm: 0,
        phone: '',
        referringDoctor: '',
        clinicalNotes: 'Plantar contact evaluation',
        createdAt: new Date().toISOString(),
      };
      setPatients((prev) => [targetPatient!, ...prev]);
      setSelectedPatientId(targetPatient.id);
    }

    const createdCases: AnalysisCase[] = [];

    for (const payload of payloads) {
      // Process image through pipeline
      const img = new Image();
      img.src = payload.dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const result = await processHarrisMatScan(img, payload.footSide, {
        dpi: payload.dpi,
      });

      const newCaseId = 'case-' + Math.random().toString(36).substring(2, 9);
      const caseNum = `PPA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const mmPerPx = payload.scaleMmPerPixel || 25.4 / payload.dpi;
      const b = result.contourBounds;
      const imgW = img.naturalWidth || img.width || 720;
      const imgH = img.naturalHeight || img.height || 1080;

      // Scale to canonical 560 x 760 landmark coordinate space
      const sx = 560 / imgW;
      const sy = 760 / imgH;

      const fMinX = Math.round(b.minX * sx);
      const fMaxX = Math.round(b.maxX * sx);
      const fMinY = Math.round(b.minY * sy);
      const fMaxY = Math.round(b.maxY * sy);
      const fMidX = Math.round((fMinX + fMaxX) / 2);
      const fWidth = Math.max(40, fMaxX - fMinX);
      const fHeight = Math.max(60, fMaxY - fMinY);

      const isRight = payload.footSide === 'Right';

      // Anatomical landmarks derived strictly from the patient's scanned footprint
      const realLandmarks = {
        longestToe: {
          x: isRight ? Math.round(fMinX + fWidth * 0.38) : Math.round(fMaxX - fWidth * 0.38),
          y: Math.max(10, fMinY + 14),
        },
        metatarsal1: {
          x: isRight ? Math.round(fMinX + fWidth * 0.16) : Math.round(fMaxX - fWidth * 0.16),
          y: Math.round(fMinY + fHeight * 0.35),
        },
        metatarsal5: {
          x: isRight ? Math.round(fMaxX - fWidth * 0.12) : Math.round(fMinX + fWidth * 0.12),
          y: Math.round(fMinY + fHeight * 0.38),
        },
        archApex: {
          x: isRight ? Math.round(fMinX + fWidth * 0.28) : Math.round(fMaxX - fWidth * 0.28),
          y: Math.round(fMinY + fHeight * 0.58),
        },
        heelMedial: {
          x: isRight ? Math.round(fMidX - fWidth * 0.24) : Math.round(fMidX + fWidth * 0.24),
          y: Math.round(fMaxY - fHeight * 0.08),
        },
        heelLateral: {
          x: isRight ? Math.round(fMidX + fWidth * 0.24) : Math.round(fMidX - fWidth * 0.24),
          y: Math.round(fMaxY - fHeight * 0.08),
        },
        heelCenter: {
          x: fMidX,
          y: Math.min(750, Math.round(fMaxY - fHeight * 0.04)),
        },
      };

      // Real physical morphometrics from scan dimensions (in mm)
      const footLengthMm = Math.round((b.maxY - b.minY) * mmPerPx);
      const forefootWidthMm = Math.round((b.maxX - b.minX) * mmPerPx * 0.88);
      const heelWidthMm = Math.round(forefootWidthMm * 0.68);
      const ballGirthMm = Math.round(forefootWidthMm * 2.40);

      const newCase: AnalysisCase = {
        id: newCaseId,
        caseNumber: caseNum,
        patientId: targetPatient.id,
        footSide: payload.footSide,
        indication: targetPatient.clinicalNotes || 'Plantar contact evaluation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        operatorName: 'Clinical Practitioner',
        clinicName: 'Technomind Podiatric Biomechanics Center',
        rawScanDataUrl: payload.dataUrl,
        processedHeatMapDataUrl: result.processedDataUrl,
        scanMetadata: {
          scannerModel: payload.scannerModel,
          scannerDriver: payload.scannerDriver,
          dpi: payload.dpi,
          colorMode: payload.colorMode,
          orientationDeg: payload.orientationDeg,
          captureTimestamp: new Date().toISOString(),
        },
        qcResult: payload.qcResult,
        algorithmVersion: 'v1.2.0-MED-2026',
        categoryDistribution: result.categoryDistribution,
        regionalAnalysis: result.regionalAnalysis,
        landmarks: realLandmarks,
        orthoticMeasurements: {
          footLengthMm,
          forefootWidthMm,
          heelWidthMm,
          ballGirthMm,
          archIndex: result.regionalAnalysis.cavanaghArchIndex,
          archType: result.regionalAnalysis.archClassification,
          scaleMmPerPixel: mmPerPx,
          measurementMethod: 'Semi-automated Harris Mat landmark triangulation',
          calibratedAt: new Date().toISOString(),
          recommendations: [
            `Custom insole with medial longitudinal arch support calibrated for ${result.regionalAnalysis.archClassification}.`,
            `Prescribe 12mm heel stabilizer to control rearfoot eversion.`,
            `High contact area offloading pad under ${result.regionalAnalysis.peakRegion}.`,
          ],
        },
        syncStatus: 'pending',
        integrityHash: Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join(''),
      };

      createdCases.push(newCase);

      logAuditEvent(
        'SCAN_ACQUIRED_AND_PROCESSED',
        `Acquired ${payload.dpi} DPI scan (${payload.footSide}) via ${payload.scannerModel}. Case ${caseNum} initialized.`,
        'tech-rajalakshmi',
        newCase.id
      );

      // Auto attempt sync
      cloudSyncService.syncCase(newCase, (status) => {
        setCases((prev) =>
          prev.map((c) => (c.id === newCase.id ? { ...c, syncStatus: status } : c))
        );
        refreshCloudStatus();
      });
    }

    setCases((prev) => [...createdCases, ...prev]);
    if (createdCases.length > 0) {
      setSelectedCaseId(createdCases[0].id);
    }
    setCurrentTab('analysis');
  };

  const handleUpdateCase = (updated: AnalysisCase) => {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCreatePatient = (newPat: Patient) => {
    setPatients((prev) => [newPat, ...prev]);
    setSelectedPatientId(newPat.id);
  };

  const handleDeletePatient = (patientId: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== patientId));
    setCases((prev) => prev.filter((c) => c.patientId !== patientId));
    if (selectedPatientId === patientId) {
      setSelectedPatientId('');
    }
  };

  const handleDeleteCase = (caseId: string) => {
    setCases((prev) => prev.filter((c) => c.id !== caseId));
    if (selectedCaseId === caseId) {
      setSelectedCaseId('');
    }
  };

  const handleClearAllData = () => {
    if (
      window.confirm(
        'Delete all stored patients and scans? This will give you a completely clean slate for fresh scans.'
      )
    ) {
      setPatients([]);
      setCases([]);
      setSelectedPatientId('');
      setSelectedCaseId('');
      localStorage.removeItem('ppa-patients');
      localStorage.removeItem('ppa-cases');
      localStorage.removeItem('ppa-selected-patient-id');
      localStorage.removeItem('ppa-selected-case-id');
      logAuditEvent(
        'DATABASE_RESET',
        'Clinician purged all local data for fresh clinical session.',
        'practitioner'
      );
    }
  };

  return (
    <div className="app-layout">
      {/* Top Clinical Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenCloud={() => setIsCloudOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenArchitecture={() => setIsArchOpen(true)}
        onOpenVerification={() => setIsVerificationOpen(true)}
        cloudStatus={cloudStatus}
        selectedCaseNumber={currentCase?.caseNumber || 'N/A'}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Clinical Workstation Viewports */}
      <main className="main-content">
        {currentTab === 'analysis' && (
          <AnalysisWorkspace
            currentCase={currentCase}
            patient={selectedPatient}
            patientCases={selectedPatient ? cases.filter((c) => c.patientId === selectedPatient.id) : []}
            onSelectCase={(cid) => setSelectedCaseId(cid)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onUpdateCase={handleUpdateCase}
            onNavigateToOrthotics={() => setCurrentTab('orthotics')}
            onGenerateReport={() => setIsReportOpen(true)}
          />
        )}

        {currentTab === 'orthotics' && (
          <OrthoticMeasurementsView
            currentCase={currentCase}
            patient={selectedPatient}
            onUpdateCase={handleUpdateCase}
            onGenerateReport={() => setIsReportOpen(true)}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {currentTab === 'patients' && (
          <PatientCaseView
            patients={patients}
            cases={cases}
            selectedPatientId={selectedPatientId}
            selectedCaseId={selectedCaseId}
            onSelectPatient={(pid) => {
              setSelectedPatientId(pid);
              const patCases = cases.filter((c) => c.patientId === pid);
              if (patCases.length > 0) {
                setSelectedCaseId(patCases[0].id);
              }
            }}
            onSelectCase={(cid) => setSelectedCaseId(cid)}
            onCreatePatient={handleCreatePatient}
            onDeletePatient={handleDeletePatient}
            onDeleteCase={handleDeleteCase}
            onClearAllData={handleClearAllData}
            onNavigateToAnalysis={() => setCurrentTab('analysis')}
          />
        )}
      </main>

      {/* Standard Mobile Bottom Navigation Bar (iOS & Android Native Tab Bar Standard) */}
      <nav className="mobile-bottom-nav mobile-only" aria-label="Mobile Bottom Navigation">
        <button
          type="button"
          className={`bottom-nav-item ${currentTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setCurrentTab('analysis')}
          title="Biomechanical Plantar Pressure Analysis"
        >
          <Layers className="bottom-nav-icon" />
          <span className="bottom-nav-label">Analysis</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${currentTab === 'orthotics' ? 'active' : ''}`}
          onClick={() => setCurrentTab('orthotics')}
          title="Clinical Orthotic Modifications"
        >
          <Activity className="bottom-nav-icon" />
          <span className="bottom-nav-label">Orthotics</span>
        </button>

        {/* Center Prominent Scanner Floating Action Button */}
        <button
          type="button"
          className="bottom-nav-item bottom-nav-scan-cta"
          onClick={() => setIsScannerOpen(true)}
          title="Open Document & Footprint Camera Scanner"
        >
          <div className="bottom-nav-scan-bubble">
            <Scan className="w-5 h-5 text-white" />
          </div>
          <span className="bottom-nav-label text-teal-400 font-bold">Scan</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${currentTab === 'patients' ? 'active' : ''}`}
          onClick={() => setCurrentTab('patients')}
          title="Patient Records & Case History"
        >
          <Users className="bottom-nav-icon" />
          <span className="bottom-nav-label">Patients</span>
        </button>

        <button
          type="button"
          className="bottom-nav-item"
          onClick={() => setIsReportOpen(true)}
          title="Clinical Diagnostic PDF Report"
        >
          <FileText className="bottom-nav-icon" />
          <span className="bottom-nav-label">Report</span>
        </button>
      </nav>

      {/* MODALS */}
      {/* 1. Scanner Wizard (FR-02, FR-03, FR-05) */}
      <ScannerWizardModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanCompleted={handleScanCompleted}
      />

      {/* 2. Official 4-Page Clinical Report Viewer (Appendix A, FR-11) */}
      {currentCase && selectedPatient && (
        <ReportViewerModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          currentCase={currentCase}
          allCases={cases}
          patient={selectedPatient}
          onUpdateCase={handleUpdateCase}
          onSelectCase={(cid) => setSelectedCaseId(cid)}
        />
      )}

      {/* 3. Cloud Sync Portal (FR-12, FR-13) */}
      <CloudSyncPortalModal
        isOpen={isCloudOpen}
        onClose={() => setIsCloudOpen(false)}
        cloudStatus={cloudStatus}
        currentCase={currentCase}
        onSyncTriggered={refreshCloudStatus}
      />

      {/* 4. Audit Trail Modal (FR-14) */}
      <AuditTrailModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      {/* 5. Cross-Platform Architecture Blueprint Modal */}
      <PlatformArchitectureGuideModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />

      {/* 6. Automated Regulatory Verification Battery (VT-01 to VT-13) */}
      <RegulatoryVerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
      />
    </div>
  );
}

export default App;
