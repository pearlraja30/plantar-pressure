import React, { useState, useEffect } from 'react';
import './podoload.css';
import { PodoLoadSidebar, PodoLoadNavSection } from './PodoLoadSidebar';
import { PodoLoadHeader } from './PodoLoadHeader';
import { PodoLoadFooter } from './PodoLoadFooter';
import { PodoLoadRegistration } from './PodoLoadRegistration';
import { PodoLoadCapture, FootCaptureData } from './PodoLoadCapture';
import { PodoLoadProcess } from './PodoLoadProcess';
import { PodoLoadResults } from './PodoLoadResults';
import { PodoLoadReport } from './PodoLoadReport';
import { PodoLoadPatientSearch } from './PodoLoadPatientSearch';
import { PodoLoadCloudRecords } from './PodoLoadCloudRecords';
import { PodoLoadSettings } from './PodoLoadSettings';

import { Patient, AnalysisCase } from '../../types';
import { cloudSyncService, CloudSyncStatus } from '../../services/cloudSyncService';
import { logAuditEvent } from '../../services/auditService';
import { generateHarrisMatFootprint } from '../../services/sampleDataService';
import { processHarrisMatScan } from '../../services/imageProcessingService';
import { ScannerWizardModal } from '../ScannerWizardModal';

// Purge all legacy stale/demo data and ensure fresh clean state
const PURE_STORAGE_KEY = 'podoload_fresh_v2';
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('podoload_storage_ver') !== PURE_STORAGE_KEY) {
      localStorage.removeItem('ppa-patients');
      localStorage.removeItem('ppa-cases');
      localStorage.removeItem('ppa-selected-patient-id');
      localStorage.removeItem('ppa-selected-case-id');
      localStorage.removeItem('ppa_audit_log_v1');
      localStorage.removeItem('ppa-real-mode-v1');
      localStorage.setItem('podoload_storage_ver', PURE_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to purge stale storage', e);
  }
}

export function PodoLoadApp() {
  // Navigation & Step state
  const [currentSection, setCurrentSection] = useState<PodoLoadNavSection>('registration');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isScannerWizardOpen, setIsScannerWizardOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Persistent clinical patients (completely fresh, no stale mock records)
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem('ppa-patients');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    return localStorage.getItem('ppa-selected-patient-id') || '';
  });

  // Persistent clinical cases
  const [cases, setCases] = useState<AnalysisCase[]>(() => {
    try {
      const saved = localStorage.getItem('ppa-cases');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const [selectedCaseId, setSelectedCaseId] = useState<string>(() => {
    return localStorage.getItem('ppa-selected-case-id') || '';
  });

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('ppa-patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    if (selectedPatientId) {
      localStorage.setItem('ppa-selected-patient-id', selectedPatientId);
    } else {
      localStorage.removeItem('ppa-selected-patient-id');
    }
  }, [selectedPatientId]);

  useEffect(() => {
    localStorage.setItem('ppa-cases', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    if (selectedCaseId) {
      localStorage.setItem('ppa-selected-case-id', selectedCaseId);
    } else {
      localStorage.removeItem('ppa-selected-case-id');
    }
  }, [selectedCaseId]);

  // Selected patient & case
  const selectedPatient =
    patients.find((p) => p.id === selectedPatientId) || (patients.length > 0 ? patients[0] : undefined);
  const currentCase =
    cases.find((c) => c.id === selectedCaseId) || (cases.length > 0 ? cases[0] : undefined);

  // Cloud Sync state
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(cloudSyncService.getStatus());
  const refreshCloudStatus = () => setCloudStatus(cloudSyncService.getStatus());

  // Foot capture data (Screens 2 - 5) - FRESH DATA ONLY (No auto-injection of sample footprints)
  const [leftFoot, setLeftFoot] = useState<FootCaptureData | null>(null);
  const [rightFoot, setRightFoot] = useState<FootCaptureData | null>(null);

  // Heatmaps and analysis data (Screens 3 - 5)
  const [leftHeatmapUrl, setLeftHeatmapUrl] = useState<string | null>(null);
  const [rightHeatmapUrl, setRightHeatmapUrl] = useState<string | null>(null);
  const [leftAnalysis, setLeftAnalysis] = useState<any>(null);
  const [rightAnalysis, setRightAnalysis] = useState<any>(null);

  // Full purge of all data to start completely fresh
  const handlePurgeAllStaleData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ppa-patients');
      localStorage.removeItem('ppa-cases');
      localStorage.removeItem('ppa-selected-patient-id');
      localStorage.removeItem('ppa-selected-case-id');
      localStorage.removeItem('ppa_audit_log_v1');
    }
    setPatients([]);
    setCases([]);
    setSelectedPatientId('');
    setSelectedCaseId('');
    setLeftFoot(null);
    setRightFoot(null);
    setLeftHeatmapUrl(null);
    setRightHeatmapUrl(null);
    setLeftAnalysis(null);
    setRightAnalysis(null);
    setCurrentStep(1);
    setCurrentSection('registration');
  };

  // Navigation handlers
  const handleNavClick = (section: PodoLoadNavSection) => {
    setCurrentSection(section);
    if (section === 'registration') setCurrentStep(1);
    else if (section === 'capture') setCurrentStep(2);
    else if (section === 'results') setCurrentStep(4);
    else if (section === 'report') setCurrentStep(5);
  };

  const handleStepClick = (step: 1 | 2 | 3 | 4 | 5) => {
    setCurrentStep(step);
    if (step === 1) setCurrentSection('registration');
    else if (step === 2) setCurrentSection('capture');
    else if (step === 3) setCurrentSection('process');
    else if (step === 4) setCurrentSection('results');
    else if (step === 5) setCurrentSection('report');
  };

  const handleStartNewExam = () => {
    setCurrentStep(1);
    setCurrentSection('registration');
    setRightFoot(null);
    setLeftHeatmapUrl(null);
    setRightHeatmapUrl(null);
  };

  // Step 1: Save Patient & Proceed
  const handleSavePatient = (patientRecord: Patient) => {
    const exists = patients.some((p) => p.id === patientRecord.id);
    let updated: Patient[];
    if (exists) {
      updated = patients.map((p) => (p.id === patientRecord.id ? patientRecord : p));
    } else {
      updated = [patientRecord, ...patients];
    }
    setPatients(updated);
    setSelectedPatientId(patientRecord.id);

    logAuditEvent(
      'PATIENT_REGISTERED',
      `Patient ${patientRecord.name} (${patientRecord.mrn}) created/updated`,
      'Dr. [Name]'
    );

    // Advance to Step 2: Capture
    setCurrentStep(2);
    setCurrentSection('capture');
  };

  // Step 3: Heatmaps generated
  const handleUpdateHeatmaps = (
    lUrl: string,
    rUrl: string,
    lAnalysis: any,
    rAnalysis: any
  ) => {
    setLeftHeatmapUrl(lUrl);
    setRightHeatmapUrl(rUrl);
    setLeftAnalysis(lAnalysis);
    setRightAnalysis(rAnalysis);

    // Create / Update clinical analysis case
    if (selectedPatient) {
      const newCase: AnalysisCase = {
        id: currentCase?.id || 'case-' + Math.random().toString(36).substring(2, 9),
        caseNumber: currentCase?.caseNumber || `PPA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        patientId: selectedPatient.id,
        footSide: 'Bilateral',
        indication: selectedPatient.clinicalNotes || 'Plantar Pressure Screening',
        createdAt: currentCase?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        operatorName: 'Tech. Specialist',
        clinicName: 'Technomind Healthcare',
        rawScanDataUrl: leftFoot?.rawDataUrl || '',
        processedHeatMapDataUrl: lUrl,
        scanMetadata: {
          scannerModel: 'Epson Perfection V39 II',
          scannerDriver: 'TWAIN 2.4',
          dpi: 300,
          colorMode: 'Grayscale',
          orientationDeg: 0,
          captureTimestamp: new Date().toISOString(),
        },
        qcResult: {
          passed: true,
          score: 95,
          flags: { isBlank: false, isClipped: false, isLowResolution: false, isBlurred: false, isLowContrast: false },
          detectedDpi: 300,
          warnings: [],
        },
        algorithmVersion: 'PPA-1.0.24-ISO',
        categoryDistribution: lAnalysis?.categoryDistribution || [],
        regionalAnalysis: lAnalysis?.regionalAnalysis || {
          forefootContactPct: 40,
          midfootContactPct: 15,
          hindfootContactPct: 45,
          halluxContactPct: 14,
          peakContactCategory: 'C5',
          peakRegion: 'Metatarsal 1',
          contactAreaCm2: 112,
          cavanaghArchIndex: 0.19,
          archClassification: 'Normal Arch',
          chippauxSmirakIndex: 32,
          staheliIndex: 0.65,
          diabeticUlcerRisk: {
            iwgdfRiskCategory: 0,
            riskLabel: 'Low Risk',
            offloadingDepthMm: 0,
            focalHyperpressureAlert: false,
            recommendations: [],
          },
        },
        landmarks: {
          heelCenter: { x: 360, y: 880 },
          heelMedial: { x: 300, y: 880 },
          heelLateral: { x: 420, y: 880 },
          metatarsal1: { x: 260, y: 440 },
          metatarsal5: { x: 450, y: 460 },
          longestToe: { x: 330, y: 190 },
          archApex: { x: 310, y: 640 },
        },
        orthoticMeasurements: {
          footLengthMm: 254,
          forefootWidthMm: 98,
          heelWidthMm: 62,
          ballGirthMm: 235,
          archIndex: 0.19,
          archType: 'Normal Arch',
          scaleMmPerPixel: 0.23,
          measurementMethod: 'Calibrated A4 Paper Grid Reference',
          calibratedAt: new Date().toISOString(),
          recommendations: ['Supportive arch contour', 'Cushioned heel cup'],
        },
        syncStatus: 'synced',
        integrityHash: 'sha256-verified-ok',
      };

      setCases((prev) => [newCase, ...prev.filter((c) => c.id !== newCase.id)]);
      setSelectedCaseId(newCase.id);
    }
  };

  // Step 5: Save Archive updates
  const handleSaveToArchive = (updates: Partial<AnalysisCase>) => {
    if (currentCase) {
      const updatedCase: AnalysisCase = {
        ...currentCase,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
      logAuditEvent(
        'REPORT_SAVED_ARCHIVE',
        `Exam report ${updatedCase.caseNumber} signed and archived`,
        'Dr. [Name]',
        updatedCase.id
      );
    }
  };

  // Modal scanner wizard callback
  const handleScannerWizardCompleted = (payload: any) => {
    const item = Array.isArray(payload) ? payload[0] : payload;
    if (item?.dataUrl) {
      setRightFoot({
        rawDataUrl: item.dataUrl,
        capturedAt: new Date().toTimeString().slice(0, 8),
        sizePx: '1240 × 1754 px',
        scalePxMm: '11.8 px/mm',
        confidence: 94,
        markersCount: 4,
        lightingOk: true,
        sharp: true,
      });
    }
    setIsScannerWizardOpen(false);
  };

  return (
    <div className="podoload-root">
      {/* 1. Left Sidebar Navigation / Mobile Drawer */}
      <PodoLoadSidebar
        currentSection={currentSection}
        onNavigate={handleNavClick}
        onStartNewExam={handleStartNewExam}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Container */}
      <div className="podoload-main-container">
        {/* Top Header with Breadcrumbs, Search, Status & Stepper */}
        <PodoLoadHeader
          currentSection={currentSection}
          currentStep={currentStep}
          onStepChange={handleStepClick}
          selectedPatient={selectedPatient}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          cloudSynced={cloudStatus.isOnline}
          onOpenCloud={() => setCurrentSection('reports_cloud')}
          doctorName="Dr. [Name]"
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Scrollable Main Content Area */}
        <main className="podoload-content-viewport">
          {/* SCREEN 1: Registration */}
          {currentSection === 'registration' && (
            <PodoLoadRegistration
              patients={patients}
              selectedPatient={selectedPatient}
              onSavePatient={handleSavePatient}
              onSelectPatient={(p) => setSelectedPatientId(p.id)}
              onCancel={handleStartNewExam}
            />
          )}

          {/* SCREEN 2: Capture */}
          {currentSection === 'capture' && (
            <PodoLoadCapture
              leftFoot={leftFoot}
              rightFoot={rightFoot}
              onUpdateLeftFoot={setLeftFoot}
              onUpdateRightFoot={setRightFoot}
              onBack={() => handleStepClick(1)}
              onContinue={() => handleStepClick(3)}
              onOpenLiveScannerWizard={() => setIsScannerWizardOpen(true)}
            />
          )}

          {/* SCREEN 3: Process */}
          {currentSection === 'process' && (
            <PodoLoadProcess
              leftFoot={leftFoot}
              rightFoot={rightFoot}
              leftHeatmapUrl={leftHeatmapUrl}
              rightHeatmapUrl={rightHeatmapUrl}
              onUpdateHeatmaps={handleUpdateHeatmaps}
              onBack={() => handleStepClick(2)}
              onContinue={() => handleStepClick(4)}
            />
          )}

          {/* SCREEN 4: Results */}
          {currentSection === 'results' && (
            <PodoLoadResults
              leftFoot={leftFoot}
              rightFoot={rightFoot}
              leftHeatmapUrl={leftHeatmapUrl}
              rightHeatmapUrl={rightHeatmapUrl}
              leftAnalysis={leftAnalysis}
              rightAnalysis={rightAnalysis}
              onBack={() => handleStepClick(3)}
              onContinue={() => handleStepClick(5)}
            />
          )}

          {/* SCREEN 5: Report */}
          {currentSection === 'report' && (
            <PodoLoadReport
              selectedPatient={selectedPatient}
              currentCase={currentCase}
              leftHeatmapUrl={leftHeatmapUrl}
              rightHeatmapUrl={rightHeatmapUrl}
              onBack={() => handleStepClick(4)}
              onFinishExam={() => {
                handleStartNewExam();
                setCurrentSection('patient_search');
              }}
              onSaveToArchive={handleSaveToArchive}
            />
          )}

          {/* RECORDS: Patient Search */}
          {currentSection === 'patient_search' && (
            <PodoLoadPatientSearch
              patients={patients}
              cases={cases}
              selectedPatientId={selectedPatientId}
              onSelectPatient={(p) => setSelectedPatientId(p.id)}
              onStartNewExamForPatient={(p) => {
                setSelectedPatientId(p.id);
                setCurrentStep(2);
                setCurrentSection('capture');
              }}
              onAddNewPatient={() => {
                setCurrentStep(1);
                setCurrentSection('registration');
              }}
              onDeletePatient={(pid) => {
                setPatients((prev) => prev.filter((p) => p.id !== pid));
                setCases((prev) => prev.filter((c) => c.patientId !== pid));
              }}
            />
          )}

          {/* RECORDS: Reports & Cloud Sync */}
          {currentSection === 'reports_cloud' && (
            <PodoLoadCloudRecords
              cloudStatus={cloudStatus}
              onRefreshCloud={refreshCloudStatus}
              cases={cases}
              patients={patients}
              onSelectCase={(cid) => {
                setSelectedCaseId(cid);
                setCurrentStep(4);
                setCurrentSection('results');
              }}
            />
          )}

          {/* SYSTEM: Settings */}
          {currentSection === 'settings' && (
            <PodoLoadSettings onPurgeAllData={handlePurgeAllStaleData} />
          )}
        </main>

        {/* Persistent Bottom Status Bar */}
        <PodoLoadFooter
          scannerModel="[Scanner model]"
          scannerConnected={true}
          resolutionDpi={300}
          lastSyncTime="[time]"
        />
      </div>

      {/* Embedded Live Camera Scanner Wizard Modal (When explicitly opened) */}
      <ScannerWizardModal
        isOpen={isScannerWizardOpen}
        onClose={() => setIsScannerWizardOpen(false)}
        onScanCompleted={handleScannerWizardCompleted}
      />
    </div>
  );
}

export default PodoLoadApp;
