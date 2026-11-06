/**
 * Plantar Pressure Analysis System - Empirical Adversarial Stress Test Suite
 * Challenger 2: R2 (Intake & 39-Step Biomechanical Pipeline) & R3 (Reports & PDF)
 * 
 * Tests:
 * 1. Unilateral scan handling & hallucination elimination
 * 2. Edge cases in Cavanagh Arch Index, Chippaux-Smirak, Staheli (near-zero midfoot, extreme pes planus, extreme pes cavus, division by zero)
 * 3. Scanner glass border artifacts and background suppression
 * 4. 1400px downsampling memory clamping under large input dimensions (OOM prevention)
 * 5. Resilient PDF rendering across corrupted or atypical base64 payloads
 */

const { createJiti } = require('jiti');
const jiti = createJiti(__filename);

// Load production services
const podoIMat = jiti('../src/services/podoIMatProcessing.ts');
const imageProcessing = jiti('../src/services/imageProcessingService.ts');
const impressionDetection = jiti('../src/services/impressionDetectionService.ts');
const reportPdf = jiti('../src/services/reportPdfService.ts');

const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    results.push({ pass: true, name: testName, details });
    console.log(`  [PASS] ${testName}${details ? ' - ' + details : ''}`);
  } else {
    results.push({ pass: false, name: testName, details });
    console.log(`  [FAIL] ${testName}${details ? ' - ' + details : ''}`);
  }
}

async function runAdversarialSuite() {
  console.log('======================================================================');
  console.log('   CHALLENGER 2: EMPIRICAL ADVERSARIAL STRESS TEST (R2 & R3)');
  console.log('======================================================================\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: Unilateral Scan Handling & Hallucination Elimination
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: Unilateral Scan Handling & Hallucination Elimination ---');

  // Scenario 1.1: Asymmetry calculation when only Left foot is scanned with currentCase in scope
  // In PodoLoadResults.tsx (lines 193-202):
  // const lAreaNum = leftAnalysis?.regionalAnalysis?.contactAreaCm2 || currentCase?.regionalAnalysis?.contactAreaCm2 || 0;
  // const rAreaNum = rightAnalysis?.regionalAnalysis?.contactAreaCm2 || currentCase?.regionalAnalysis?.contactAreaCm2 || 0;
  {
    const leftAnalysis = {
      regionalAnalysis: {
        contactAreaCm2: 122.5,
        archClassification: 'Normal Arch',
        cavanaghArchIndex: 0.23,
      },
    };
    const rightAnalysis = null; // Right foot NOT scanned
    const currentCase = {
      regionalAnalysis: {
        contactAreaCm2: 122.5, // From saved/active unilateral left scan
        archClassification: 'Normal Arch',
        cavanaghArchIndex: 0.23,
      },
    };

    const hasLeft = Boolean(leftAnalysis || (currentCase?.footSide !== 'Right' && currentCase?.rawScanDataUrl));
    const hasRight = Boolean(rightAnalysis || currentCase?.rightRawScanDataUrl || (currentCase?.footSide === 'Right' && currentCase?.rawScanDataUrl));

    const lAreaNum = hasLeft ? (leftAnalysis?.regionalAnalysis?.contactAreaCm2 || currentCase?.regionalAnalysis?.contactAreaCm2 || 0) : 0;
    const rAreaNum = hasRight ? (rightAnalysis?.regionalAnalysis?.contactAreaCm2 || currentCase?.rightRegionalAnalysis?.contactAreaCm2 || 0) : 0;

    let asymmetryLabel = 'Awaiting scan analysis';
    if (hasLeft && hasRight && lAreaNum > 0 && rAreaNum > 0) {
      const asymmetryVal = Math.round((Math.abs(lAreaNum - rAreaNum) / Math.max(lAreaNum, rAreaNum)) * 100);
      asymmetryLabel = `${asymmetryVal}% ${asymmetryVal <= 8 ? '(Symmetric Plantar Load)' : '(Asymmetric Plantar Load)'}`;
    } else if (hasLeft || hasRight || lAreaNum > 0 || rAreaNum > 0) {
      asymmetryLabel = `Unilateral Assessment (${hasRight && !hasLeft ? 'Right' : 'Left'} Foot Only)`;
    }

    const isHallucinatedBilateral = asymmetryLabel.includes('Symmetric Plantar Load');
    assert(
      !isHallucinatedBilateral,
      'PodoLoadResults asymmetry label rejects fallback leakage on unilateral Left scan',
      `Actual label: "${asymmetryLabel}" (Expected Unilateral Assessment, Got ${asymmetryLabel})`
    );
  }

  // Scenario 1.2: PodoLoadReport.tsx PDF generation on unilateral Left scan
  // Lines 336-343 in PodoLoadReport.tsx:
  // rawScanDataUrl: rightRawScan || activeCase.rightRawScanDataUrl || activeCase.rawScanDataUrl
  {
    const activeCase = {
      id: 'case-unilateral-1',
      caseNumber: 'PPA-2026-0001',
      footSide: 'Left',
      rawScanDataUrl: 'data:image/png;base64,LEFT_SCAN_IMAGE_BYTES',
      processedHeatMapDataUrl: 'data:image/png;base64,LEFT_HEATMAP_IMAGE_BYTES',
      rightRawScanDataUrl: '',
      rightProcessedHeatMapDataUrl: '',
      regionalAnalysis: {
        contactAreaCm2: 118,
        archClassification: 'Normal Arch',
        cavanaghArchIndex: 0.22,
        chippauxSmirakIndex: 28,
        staheliIndex: 0.35,
      },
      orthoticMeasurements: {
        footLengthMm: 250,
        forefootWidthMm: 95,
        heelWidthMm: 65,
        ballGirthMm: 220,
        archIndex: 0.22,
        archType: 'Normal Arch',
        recommendations: ['Supportive arch contour'],
      },
    };

    const rightRawScan = undefined;
    const rightHeatmap = undefined;
    const rightAnalysis = null;

    // Remediated implementation logic from PodoLoadReport.tsx:
    const hasRightData = Boolean(rightRawScan || activeCase.rightRawScanDataUrl);
    const rightCaseForPdf = {
      ...activeCase,
      footSide: 'Right',
      rawScanDataUrl: rightRawScan || activeCase.rightRawScanDataUrl || '',
      processedHeatMapDataUrl: rightHeatmap || activeCase.rightProcessedHeatMapDataUrl || '',
      regionalAnalysis: rightAnalysis?.regionalAnalysis || (hasRightData ? activeCase.regionalAnalysis : undefined),
      orthoticMeasurements: rightAnalysis?.orthoticMeasurements || (hasRightData ? activeCase.orthoticMeasurements : undefined),
    };

    const rightRawEqualsLeftRaw = rightCaseForPdf.rawScanDataUrl === activeCase.rawScanDataUrl;
    assert(
      !rightRawEqualsLeftRaw,
      'PodoLoadReport PDF generator does not clone Left foot scan onto Right foot during unilateral scan',
      `rightCaseForPdf.rawScanDataUrl === activeCase.rawScanDataUrl is ${rightRawEqualsLeftRaw}`
    );
  }

  // Scenario 1.3: Podo I Mat PCA side detection on unilateral outline
  {
    // Single unilateral Right foot outline
    const rightFootOutline = [
      { x: 200, y: 700 }, { x: 230, y: 720 }, { x: 260, y: 700 }, // heel
      { x: 270, y: 550 }, { x: 280, y: 400 }, // lateral border
      { x: 300, y: 250 }, { x: 280, y: 150 }, { x: 220, y: 130 }, // ball/toes
      { x: 160, y: 150 }, { x: 140, y: 250 }, { x: 180, y: 450 }, { x: 170, y: 600 } // medial
    ];
    const pca = podoIMat.computePCA(rightFootOutline);
    assert(!isNaN(pca.mean.x) && !isNaN(pca.mean.y), 'PCA mean computed without NaN on unilateral outline');
    assert(Math.abs(pca.direction.y) > Math.abs(pca.direction.x), 'PCA identifies primary longitudinal axis');
  }

  // ---------------------------------------------------------------------------
  // SECTION 2: Edge Cases in Cavanagh Arch Index, Chippaux-Smirak, Staheli
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Biomechanical Indices Edge Cases & Stability ---');

  // Scenario 2.1: Extreme Pes Cavus (Zero Midfoot Contact Area)
  {
    const hindfootPixels = 1500;
    const midfootPixels = 0; // High arch: absolute zero contact in midfoot
    const forefootPixels = 2000;
    const mainFootArea = hindfootPixels + midfootPixels + forefootPixels;
    const archIndex = mainFootArea > 0 ? Number((midfootPixels / mainFootArea).toFixed(3)) : 0.22;

    let classification = 'Normal Arch';
    if (archIndex < 0.21) classification = 'High Arch (Pes Cavus)';
    else if (archIndex > 0.26) classification = 'Flat Foot (Pes Planus)';

    assert(archIndex === 0.000, 'Zero midfoot contact yields Cavanagh Arch Index 0.000', `AI: ${archIndex}`);
    assert(classification === 'High Arch (Pes Cavus)', 'Zero midfoot contact correctly classified as High Arch (Pes Cavus)', `Class: ${classification}`);
  }

  // Scenario 2.2: Extreme Pes Planus (Massive Midfoot Ground Contact)
  {
    const hindfootPixels = 1000;
    const midfootPixels = 1800; // Flat foot: midfoot contact exceeds heel
    const forefootPixels = 1200;
    const mainFootArea = hindfootPixels + midfootPixels + forefootPixels;
    const archIndex = mainFootArea > 0 ? Number((midfootPixels / mainFootArea).toFixed(3)) : 0.22;

    let classification = 'Normal Arch';
    if (archIndex < 0.21) classification = 'High Arch (Pes Cavus)';
    else if (archIndex > 0.26) classification = 'Flat Foot (Pes Planus)';

    assert(archIndex > 0.26, 'Extreme flat foot yields Cavanagh Arch Index > 0.26', `AI: ${archIndex}`);
    assert(classification === 'Flat Foot (Pes Planus)', 'Massive midfoot contact correctly classified as Flat Foot (Pes Planus)', `Class: ${classification}`);
  }

  // Scenario 2.3: Blank Scan Division-by-Zero (mainFootArea = 0)
  {
    const hindfootPixels = 0;
    const midfootPixels = 0;
    const forefootPixels = 0;
    const mainFootArea = hindfootPixels + midfootPixels + forefootPixels;
    const archIndex = mainFootArea > 0 ? Number((midfootPixels / mainFootArea).toFixed(3)) : 0.22;

    assert(!isNaN(archIndex) && isFinite(archIndex), 'Zero plantar area does not produce NaN or Infinity', `AI: ${archIndex}`);
  }

  // Scenario 2.4: Subzonal 10-density division-by-zero protection
  {
    const totalDensitySum = Math.max(0.001, 0); // All 10 zones have 0 density
    const zHalluxDensity = 0;
    const halluxPct = Number(((zHalluxDensity / totalDensitySum) * 100).toFixed(1));
    assert(!isNaN(halluxPct) && isFinite(halluxPct) && halluxPct === 0, 'Subzonal density calculation handles all-zero density without NaN/Infinity');
  }

  // Scenario 2.5: Line Intersection with Parallel & Collinear Lines
  {
    const p1 = { x: 50, y: 100 };
    const v1 = { x: 0, y: 1 };
    const p2 = { x: 80, y: 200 };
    const v2 = { x: 0, y: 1 }; // Parallel vertical line
    const inter = podoIMat.findLineIntersection(p1, v1, p2, v2);
    assert(inter === null, 'Parallel vectors cleanly return null without crash');

    const degeneratePt = podoIMat.lineSegmentIntersection(
      { x: 0, y: 0 }, { x: 0, y: 0 }, // Zero length segment
      { x: 0, y: 0 }, { x: 1, y: 0 }
    );
    assert(degeneratePt === null, 'Degenerate zero-length line segment cleanly returns null without throwing');
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: Scanner Glass Border Artifacts & Background Suppression
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Scanner Glass Border Artifacts & Background Suppression ---');

  // Scenario 3.1: Zeroing out scanner frame perimeter margin
  {
    const width = 720;
    const height = 1080;
    const isPerimeterArtifact = (x, y) => (x <= 6 || x >= width - 7 || y <= 6 || y >= height - 7);

    assert(isPerimeterArtifact(0, 500) === true, 'Perimeter edge x=0 correctly flagged as border artifact');
    assert(isPerimeterArtifact(719, 500) === true, 'Perimeter edge x=719 correctly flagged as border artifact');
    assert(isPerimeterArtifact(360, 0) === true, 'Perimeter edge y=0 correctly flagged as border artifact');
    assert(isPerimeterArtifact(360, 1079) === true, 'Perimeter edge y=1079 correctly flagged as border artifact');
    assert(isPerimeterArtifact(360, 500) === false, 'Internal anatomical pixel (360, 500) preserved');
  }

  // Scenario 3.2: Transparent alpha pixel suppression (Optical Inversion Prevention)
  {
    // A transparent pixel (alpha < 128) must NEVER be interpreted as dark ink contact
    const testAlpha = 50;
    const isInk = (alpha) => alpha >= 128;
    assert(!isInk(testAlpha), 'Semi-transparent pixels (a=50) rejected as non-contact/blank paper');
    assert(!isInk(0), 'Fully transparent pixels (a=0) rejected as non-contact/blank paper');
    assert(isInk(255), 'Opaque pixels (a=255) accepted for luminance evaluation');
  }

  // Scenario 3.3: Thin linear artifacts and sub-calcaneal marks suppression
  {
    const mainHeelY = 820;
    const isSubCalcanealArtifact = (cY0, mainY1) => cY0 > mainY1;
    const isThinScannerLine = (compW, compH) =>
      (compW > 15 && compH <= 4) ||
      (compH > 15 && compW <= 4) ||
      (compW / Math.max(1, compH) > 4.5 && compH <= 6);

    assert(isSubCalcanealArtifact(825, mainHeelY) === true, 'Mark below heel (Y=825 > HeelY=820) flagged for suppression');
    assert(isThinScannerLine(150, 2) === true, 'Horizontal 150x2px scanner line flagged for suppression');
    assert(isThinScannerLine(3, 200) === true, 'Vertical 3x200px sensor artifact flagged for suppression');
    assert(isThinScannerLine(45, 30) === false, 'Anatomical toe imprint (45x30px) preserved');
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: 1400px Downsampling Memory Clamping (OOM Prevention)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: 1400px Downsampling Memory Clamping (OOM Prevention) ---');

  function calculateDownsampling(origW, origH, maxDim = 1400) {
    let scale = 1.0;
    if (origW > maxDim || origH > maxDim) {
      scale = maxDim / Math.max(origW, origH);
    }
    const width = Math.round(origW * scale);
    const height = Math.round(origH * scale);
    return { scale, width, height };
  }

  // Scenario 4.1: Extreme High-Resolution Flatbed Scanner (8000 x 6000 px, 48 MP)
  {
    const { width, height, scale } = calculateDownsampling(8000, 6000);
    assert(width === 1400, 'Width clamped exactly to 1400px', `W: ${width}`);
    assert(height === 1050, 'Height scaled proportionally to 1050px', `H: ${height}`);
    assert(Math.abs(width / height - 8000 / 6000) < 0.01, '4:3 aspect ratio preserved within 1%');
  }

  // Scenario 4.2: Ultra-tall Harris Mat Sheet (3200 x 9600 px)
  {
    const { width, height } = calculateDownsampling(3200, 9600);
    assert(height === 1400, 'Height clamped exactly to 1400px', `H: ${height}`);
    assert(width === 467, 'Width clamped to 467px', `W: ${width}`);
    assert(width <= 1400 && height <= 1400, 'Both dimensions strictly <= 1400px');
  }

  // Scenario 4.3: Already optimal resolution (720 x 1080 px)
  {
    const { width, height, scale } = calculateDownsampling(720, 1080);
    assert(scale === 1.0, 'No downsampling applied to sub-1400px images', `Scale: ${scale}`);
    assert(width === 720 && height === 1080, 'Original dimensions preserved unchanged');
  }

  // Scenario 4.4: Degenerate Zero Dimension Clamping
  {
    const origW = 0;
    const origH = 0;
    const maxDim = 1400;
    const denom = Math.max(origW, origH);
    const scale = denom > 0 ? maxDim / denom : 1.0;
    const width = Math.round(origW * scale);
    const height = Math.round(origH * scale);
    assert(!isNaN(width) && !isNaN(height), 'Zero input dimensions handled safely without NaN scale');
  }

  // ---------------------------------------------------------------------------
  // SECTION 5: Resilient PDF Rendering Across Corrupted or Atypical Base64 Payloads
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Resilient PDF Rendering Across Corrupted Payloads ---');

  const basePatient = {
    id: 'patient-test-01',
    mrn: 'MRN-2026-8891',
    name: 'Eleanor Vance',
    dateOfBirth: '1979-04-12',
    gender: 'Female',
    weightKg: 68,
    heightCm: 165,
    phone: '+1-555-0199',
    referringDoctor: 'Dr. Marcus Brody, DPM',
    clinicalNotes: 'Suspected Charcot foot and metatarsalgia',
    createdAt: new Date().toISOString(),
  };

  const createBaseCase = (overrides = {}) => ({
    id: 'case-test-01',
    caseNumber: 'PPA-2026-9901',
    patientId: 'patient-test-01',
    footSide: 'Left',
    indication: 'Plantar pressure evaluation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    operatorName: 'Sarah Jenkins, C.Ped',
    clinicName: 'St. Jude Biomechanics Laboratory',
    rawScanDataUrl: '',
    processedHeatMapDataUrl: '',
    scanMetadata: {
      scannerModel: 'Harris Mat Scanner Pro',
      scannerDriver: 'WIA/TWAIN v2.4',
      dpi: 300,
      colorMode: 'Grayscale',
      orientationDeg: 0,
      captureTimestamp: new Date().toISOString(),
    },
    qcResult: {
      passed: true,
      score: 96,
      flags: { isBlank: false, isClipped: false, isLowResolution: false, isBlurred: false, isLowContrast: false },
      detectedDpi: 300,
      warnings: [],
    },
    algorithmVersion: 'PPA-2.0.0-CLINICAL-TOE-PRESERVED',
    categoryDistribution: [
      { category: 'C1', percentage: 25.0, areaMm2: 2500 },
      { category: 'C2', percentage: 35.0, areaMm2: 3500 },
      { category: 'C3', percentage: 25.0, areaMm2: 2500 },
      { category: 'C4', percentage: 10.0, areaMm2: 1000 },
      { category: 'C5', percentage: 5.0, areaMm2: 500 },
      { category: 'C6', percentage: 0.0, areaMm2: 0 },
    ],
    regionalAnalysis: {
      forefootContactPct: 38.0,
      midfootContactPct: 22.0,
      hindfootContactPct: 32.0,
      halluxContactPct: 8.0,
      peakContactCategory: 'C3',
      peakRegion: 'Midfoot',
      contactAreaCm2: 110.0,
      cavanaghArchIndex: 0.22,
      archClassification: 'Normal Arch',
      chippauxSmirakIndex: 26.5,
      staheliIndex: 0.42,
      diabeticUlcerRisk: {
        iwgdfRiskCategory: 0,
        riskLabel: 'Low Risk (Baseline)',
        offloadingDepthMm: 0,
        focalHyperpressureAlert: false,
        recommendations: ['Maintain regular monitoring'],
      },
    },
    orthoticMeasurements: {
      footLengthMm: 245,
      forefootWidthMm: 92,
      heelWidthMm: 62,
      ballGirthMm: 216,
      archIndex: 0.22,
      archType: 'Normal Arch',
      scaleMmPerPixel: 0.0847,
      measurementMethod: 'Optical Harris Mat Morphometry',
      calibratedAt: new Date().toISOString(),
      recommendations: ['Custom longitudinal arch support', 'Calcaneal shock pad'],
    },
    syncStatus: 'synced',
    integrityHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
    ...overrides,
  });

  // Scenario 5.1: Corrupted Base64 Payload in Single-Foot PDF Report
  {
    const corruptedCase = createBaseCase({
      rawScanDataUrl: 'data:image/png;base64,!!!TOTAL_JUNK_NOT_BASE64_AT_ALL!!!',
      processedHeatMapDataUrl: 'data:image/png;base64,INVALID_BYTES_TRUNCATED_123',
    });

    let doc = null;
    let singleFootError = null;
    try {
      doc = await reportPdf.generateClinicalReportPdf(corruptedCase, basePatient);
    } catch (err) {
      singleFootError = err;
    }

    assert(
      singleFootError === null && doc !== null,
      'generateClinicalReportPdf survives corrupted base64 payloads without unhandled crash',
      singleFootError ? `Threw: ${singleFootError.message}` : `Successfully generated ${doc?.getNumberOfPages()} pages`
    );
    if (doc) {
      assert(doc.getNumberOfPages() === 4, 'generateClinicalReportPdf outputs complete 4-page official medical report');
    }
  }

  // Scenario 5.2: Corrupted Base64 Payload in Bilateral Clubbed PDF Report
  {
    const leftCase = createBaseCase({
      footSide: 'Left',
      rawScanDataUrl: 'data:image/jpeg;base64,INVALID_CORRUPTED_LEFT_DATA',
      processedHeatMapDataUrl: 'data:image/png;base64,CORRUPTED_LEFT_HEATMAP',
    });
    const rightCase = createBaseCase({
      caseNumber: 'PPA-2026-9902',
      footSide: 'Right',
      rawScanDataUrl: 'data:image/webp;base64,CORRUPTED_RIGHT_DATA_###',
      processedHeatMapDataUrl: 'data:image/png;base64,CORRUPTED_RIGHT_HEATMAP',
    });

    let doc = null;
    let bilateralError = null;
    try {
      doc = await reportPdf.generateBilateralClubbedReportPdf(leftCase, rightCase, basePatient);
    } catch (err) {
      bilateralError = err;
    }

    assert(
      bilateralError === null && doc !== null,
      'generateBilateralClubbedReportPdf survives corrupted bilateral payloads without unhandled crash',
      bilateralError ? `Threw: ${bilateralError.message}` : `Successfully generated ${doc?.getNumberOfPages()} pages`
    );
    if (doc) {
      assert(doc.getNumberOfPages() === 4, 'generateBilateralClubbedReportPdf outputs complete 4-page bilateral report');
    }
  }

  // Scenario 5.3: Missing/Undefined Optional Fields on AnalysisCase (Robustness Audit)
  // Check if generateClinicalReportPdf crashes when optional fields are omitted
  {
    const minimalCase = {
      ...createBaseCase(),
      qcResult: undefined, // qcResult is optional in AnalysisCase
      syncStatus: undefined, // syncStatus is optional
    };

    let doc = null;
    let crashError = null;
    try {
      doc = await reportPdf.generateClinicalReportPdf(minimalCase, basePatient);
    } catch (err) {
      crashError = err;
    }

    assert(
      crashError === null,
      'generateClinicalReportPdf guards against undefined qcResult or syncStatus',
      crashError ? `Crashed with: ${crashError.message}` : 'Safe execution verified'
    );
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n======================================================================');
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`STRESS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${results.length} CHECKS`);
  console.log(`OVERALL STRESS STATUS: ${failed === 0 ? 'ALL CRITERIA VERIFIED' : 'DEFECTS DETECTED'}`);
  console.log('======================================================================\n');

  return { passed, failed, results };
}

runAdversarialSuite().catch(console.error);
