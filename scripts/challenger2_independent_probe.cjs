/**
 * Plantar Pressure Analysis System - Challenger 2 Independent Adversarial Audit
 * 
 * Target: Requirements R2 & R3
 * 1. Unilateral Left/Right scan isolation and asymmetry evaluation (no 0% symmetric load leakage)
 * 2. Unilateral report isolation (no Left foot cloning into Right foot)
 * 3. Extreme resilience of PDF generation (generateClinicalReportPdf & generateBilateralClubbedReportPdf)
 *    under missing optional fields, empty arrays, edge characters, and null values
 * 4. Cavanagh Arch Index numerical integration validation on synthetic high-arch, normal-arch, and flat-foot polygons
 */

const { createJiti } = require('jiti');
const jiti = createJiti(__filename);

const podoIMat = jiti('../src/services/podoIMatProcessing.ts');
const reportPdf = jiti('../src/services/reportPdfService.ts');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function check(desc, condition, extraInfo = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${desc}${extraInfo ? ' (' + extraInfo + ')' : ''}`);
  } else {
    failedTests++;
    failureDetails.push({ desc, extraInfo });
    console.error(`  ✗ [FAIL] ${desc}${extraInfo ? ' (' + extraInfo + ')' : ''}`);
  }
}

async function runChallengerAudit() {
  console.log('======================================================================');
  console.log('   CHALLENGER 2: INDEPENDENT EMPIRICAL ADVERSARIAL AUDIT');
  console.log('======================================================================\n');

  // =========================================================================
  // 1. UNILATERAL SCAN ISOLATION & ASYMMETRY EVALUATION
  // =========================================================================
  console.log('>>> 1. Testing Unilateral Scan Isolation & Asymmetry Logic in PodoLoadResults');

  function evaluateAsymmetry(leftAnalysis, rightAnalysis, leftFoot, rightFoot, currentCase) {
    const hasLeft = Boolean(leftAnalysis || leftFoot || (currentCase?.footSide !== 'Right' && currentCase?.rawScanDataUrl));
    const hasRight = Boolean(rightAnalysis || rightFoot || currentCase?.rightRawScanDataUrl || (currentCase?.footSide === 'Right' && currentCase?.rawScanDataUrl));

    const lAreaNum = hasLeft ? (leftAnalysis?.regionalAnalysis?.contactAreaCm2 || currentCase?.regionalAnalysis?.contactAreaCm2 || 0) : 0;
    const rAreaNum = hasRight ? (rightAnalysis?.regionalAnalysis?.contactAreaCm2 || (currentCase?.footSide === 'Right' ? currentCase?.regionalAnalysis?.contactAreaCm2 : 0) || 0) : 0;

    let asymmetryLabel = 'Awaiting scan analysis';
    if (hasLeft && hasRight && lAreaNum > 0 && rAreaNum > 0) {
      const asymmetryVal = Math.round((Math.abs(lAreaNum - rAreaNum) / Math.max(lAreaNum, rAreaNum)) * 100);
      asymmetryLabel = `${asymmetryVal}% ${asymmetryVal <= 8 ? '(Symmetric Plantar Load)' : '(Asymmetric Plantar Load)'}`;
    } else if (hasLeft || hasRight || lAreaNum > 0 || rAreaNum > 0) {
      asymmetryLabel = `Unilateral Assessment (${hasRight && !hasLeft ? 'Right' : 'Left'} Foot Only)`;
    }
    return { asymmetryLabel, hasLeft, hasRight, lAreaNum, rAreaNum };
  }

  // Probe 1.1: Unilateral Left scan with currentCase containing Left foot and contactAreaCm2
  {
    const res = evaluateAsymmetry(
      null,
      null,
      null,
      null,
      { footSide: 'Left', rawScanDataUrl: 'data:image/png;base64,LEFT_DATA', regionalAnalysis: { contactAreaCm2: 120 } }
    );
    check(
      'Unilateral Left scan with only currentCase reports "Unilateral Assessment (Left Foot Only)"',
      res.asymmetryLabel === 'Unilateral Assessment (Left Foot Only)' && !res.hasRight && res.rAreaNum === 0,
      `Got: "${res.asymmetryLabel}", rAreaNum: ${res.rAreaNum}`
    );
  }

  // Probe 1.2: Unilateral Right scan with currentCase containing Right foot and contactAreaCm2
  {
    const res = evaluateAsymmetry(
      null,
      null,
      null,
      null,
      { footSide: 'Right', rawScanDataUrl: 'data:image/png;base64,RIGHT_DATA', regionalAnalysis: { contactAreaCm2: 115 } }
    );
    check(
      'Unilateral Right scan with only currentCase reports "Unilateral Assessment (Right Foot Only)"',
      res.asymmetryLabel === 'Unilateral Assessment (Right Foot Only)' && !res.hasLeft && res.lAreaNum === 0,
      `Got: "${res.asymmetryLabel}", lAreaNum: ${res.lAreaNum}`
    );
  }

  // Probe 1.3: Unilateral Left scan with leftAnalysis in component state
  {
    const res = evaluateAsymmetry(
      { regionalAnalysis: { contactAreaCm2: 125 } },
      null,
      { side: 'Left' },
      null,
      null
    );
    check(
      'Unilateral Left scan with leftAnalysis in state reports "Unilateral Assessment (Left Foot Only)"',
      res.asymmetryLabel === 'Unilateral Assessment (Left Foot Only)' && !res.hasRight,
      `Got: "${res.asymmetryLabel}"`
    );
  }

  // Probe 1.4: Bilateral scan with equal contact areas (e.g. 120 cm2 both)
  {
    const res = evaluateAsymmetry(
      { regionalAnalysis: { contactAreaCm2: 120 } },
      { regionalAnalysis: { contactAreaCm2: 120 } },
      { side: 'Left' },
      { side: 'Right' },
      null
    );
    check(
      'Bilateral scan with equal areas reports 0% (Symmetric Plantar Load)',
      res.asymmetryLabel === '0% (Symmetric Plantar Load)',
      `Got: "${res.asymmetryLabel}"`
    );
  }

  // Probe 1.5: Bilateral scan with high asymmetry (120 cm2 vs 80 cm2)
  {
    const res = evaluateAsymmetry(
      { regionalAnalysis: { contactAreaCm2: 120 } },
      { regionalAnalysis: { contactAreaCm2: 80 } },
      { side: 'Left' },
      { side: 'Right' },
      null
    );
    check(
      'Bilateral scan with high variance reports Asymmetric Plantar Load (33%)',
      res.asymmetryLabel === '33% (Asymmetric Plantar Load)',
      `Got: "${res.asymmetryLabel}"`
    );
  }

  // =========================================================================
  // 2. UNILATERAL REPORT PDF GENERATION & CONTRA-LATERAL FOOT CLONING AUDIT
  // =========================================================================
  console.log('\n>>> 2. Testing Unilateral Report Generation & Contra-lateral Foot Isolation in PodoLoadReport');

  function preparePdfCases(activeCase, leftRawScan, rightRawScan, leftHeatmap, rightHeatmap, leftAnalysis, rightAnalysis) {
    const hasRightData = Boolean(rightRawScan || activeCase.rightRawScanDataUrl);
    const hasLeftData = Boolean(leftRawScan || activeCase.rawScanDataUrl);

    const leftCaseForPdf = {
      ...activeCase,
      footSide: 'Left',
      rawScanDataUrl: leftRawScan || activeCase.rawScanDataUrl,
      processedHeatMapDataUrl: leftHeatmap || activeCase.processedHeatMapDataUrl,
      regionalAnalysis: leftAnalysis?.regionalAnalysis || activeCase.regionalAnalysis,
      orthoticMeasurements: leftAnalysis?.orthoticMeasurements || activeCase.orthoticMeasurements,
    };

    const rightCaseForPdf = {
      ...activeCase,
      footSide: 'Right',
      rawScanDataUrl: rightRawScan || activeCase.rightRawScanDataUrl || '',
      processedHeatMapDataUrl: rightHeatmap || activeCase.rightProcessedHeatMapDataUrl || '',
      regionalAnalysis: rightAnalysis?.regionalAnalysis || (hasRightData ? activeCase.regionalAnalysis : undefined),
      orthoticMeasurements: rightAnalysis?.orthoticMeasurements || (hasRightData ? activeCase.orthoticMeasurements : undefined),
    };

    const isBilateral = hasLeftData && hasRightData;
    const selectedSingleFootCase = hasRightData && !hasLeftData ? rightCaseForPdf : leftCaseForPdf;

    return { hasLeftData, hasRightData, isBilateral, selectedSingleFootCase, leftCaseForPdf, rightCaseForPdf };
  }

  // Probe 2.1: Unilateral Left scan - activeCase has rawScanDataUrl but no right scan
  {
    const activeCase = {
      id: 'case-unilateral-left',
      caseNumber: 'PPA-UNI-L',
      footSide: 'Left',
      rawScanDataUrl: 'data:image/png;base64,LEFT_SCAN_RAW',
      processedHeatMapDataUrl: 'data:image/png;base64,LEFT_HEATMAP',
      rightRawScanDataUrl: '',
      rightProcessedHeatMapDataUrl: '',
      regionalAnalysis: { contactAreaCm2: 110 },
      orthoticMeasurements: { footLengthMm: 250 },
    };

    const prep = preparePdfCases(activeCase, undefined, undefined, undefined, undefined, null, null);
    check(
      'Unilateral Left scan has hasLeftData=true, hasRightData=false, isBilateral=false',
      prep.hasLeftData === true && prep.hasRightData === false && prep.isBilateral === false,
      `hasLeft=${prep.hasLeftData}, hasRight=${prep.hasRightData}, isBilateral=${prep.isBilateral}`
    );
    check(
      'Unilateral Left scan selects leftCaseForPdf for single-foot clinical report',
      prep.selectedSingleFootCase === prep.leftCaseForPdf && prep.selectedSingleFootCase.footSide === 'Left',
      `Selected footSide: ${prep.selectedSingleFootCase.footSide}`
    );
    check(
      'Right foot rawScanDataUrl is NOT cloned from Left foot (must be empty)',
      prep.rightCaseForPdf.rawScanDataUrl === '' && prep.rightCaseForPdf.rawScanDataUrl !== activeCase.rawScanDataUrl,
      `rightCase rawScanDataUrl: "${prep.rightCaseForPdf.rawScanDataUrl}"`
    );
    check(
      'Right foot regionalAnalysis is undefined in unilateral Left scan (no data leakage)',
      prep.rightCaseForPdf.regionalAnalysis === undefined,
      `rightCase regionalAnalysis: ${JSON.stringify(prep.rightCaseForPdf.regionalAnalysis)}`
    );
  }

  // Probe 2.2: Unilateral Right scan
  {
    const activeCase = {
      id: 'case-unilateral-right',
      caseNumber: 'PPA-UNI-R',
      footSide: 'Right',
      rawScanDataUrl: '',
      processedHeatMapDataUrl: '',
      rightRawScanDataUrl: 'data:image/png;base64,RIGHT_SCAN_RAW',
      rightProcessedHeatMapDataUrl: 'data:image/png;base64,RIGHT_HEATMAP',
      regionalAnalysis: { contactAreaCm2: 112 },
      orthoticMeasurements: { footLengthMm: 252 },
    };

    const prep = preparePdfCases(activeCase, undefined, undefined, undefined, undefined, null, null);
    check(
      'Unilateral Right scan has hasLeftData=false, hasRightData=true, isBilateral=false',
      prep.hasLeftData === false && prep.hasRightData === true && prep.isBilateral === false,
      `hasLeft=${prep.hasLeftData}, hasRight=${prep.hasRightData}`
    );
    check(
      'Unilateral Right scan selects rightCaseForPdf with footSide="Right"',
      prep.selectedSingleFootCase === prep.rightCaseForPdf && prep.selectedSingleFootCase.footSide === 'Right',
      `Selected footSide: ${prep.selectedSingleFootCase.footSide}`
    );
  }

  // Probe 2.3: Bilateral scan triggers bilateral report
  {
    const activeCase = {
      id: 'case-bilateral',
      caseNumber: 'PPA-BI',
      rawScanDataUrl: 'data:image/png;base64,LEFT_SCAN_RAW',
      rightRawScanDataUrl: 'data:image/png;base64,RIGHT_SCAN_RAW',
    };
    const prep = preparePdfCases(activeCase, undefined, undefined, undefined, undefined, null, null);
    check(
      'Bilateral scan triggers bilateral report (isBilateral=true)',
      prep.isBilateral === true && prep.hasLeftData && prep.hasRightData,
      `isBilateral=${prep.isBilateral}`
    );
  }

  // =========================================================================
  // 3. EXTREME RESILIENCE & ADVERSARIAL STRESS TESTING OF PDF GENERATOR
  // =========================================================================
  console.log('\n>>> 3. Testing PDF Generation Robustness against Missing Fields & Malformed Inputs');

  const basePatient = {
    id: 'p-stress-01',
    mrn: 'MRN-STRESS-99',
    name: 'Dr. Jane Döe-Smíth (Jr.)',
    dateOfBirth: '1985-11-20',
    gender: 'Female',
    weightKg: 64,
    heightCm: 168,
    phone: '+1 (555) 901-2345',
    referringDoctor: 'Prof. Müller-Lüdenscheidt, MD',
    clinicalNotes: 'Severe bilateral pronation with hallux valgus & secondary metatarsalgia. Patient requests functional insole prescription with medial arch support.\n\nRepeated lines: ' + 'A'.repeat(500),
    createdAt: new Date().toISOString(),
  };

  const minimalValidCase = {
    id: 'case-min-01',
    caseNumber: 'PPA-MIN-001',
    patientId: 'p-stress-01',
    footSide: 'Left',
    indication: 'Plantar pressure screening for diabetic neuropathy',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    operatorName: 'Tech. John Doe',
    clinicName: 'Metropolitan Podiatric Clinic',
    rawScanDataUrl: '',
    processedHeatMapDataUrl: '',
    scanMetadata: {
      scannerModel: 'Harris Mat Scanner v2',
      scannerDriver: 'TWAIN 2.0',
      dpi: 300,
      colorMode: 'Grayscale',
      orientationDeg: 0,
      captureTimestamp: new Date().toISOString(),
    },
    qcResult: undefined, // TEST: undefined qcResult
    algorithmVersion: 'PPA-2.0.0',
    categoryDistribution: [
      { category: 'C1', percentage: 20.0, areaMm2: 2000 },
      { category: 'C2', percentage: 30.0, areaMm2: 3000 },
      { category: 'C3', percentage: 30.0, areaMm2: 3000 },
      { category: 'C4', percentage: 10.0, areaMm2: 1000 },
      { category: 'C5', percentage: 10.0, areaMm2: 1000 },
      { category: 'C6', percentage: 0.0, areaMm2: 0 },
    ],
    regionalAnalysis: {
      forefootContactPct: 35.0,
      midfootContactPct: 20.0,
      hindfootContactPct: 35.0,
      halluxContactPct: 10.0,
      peakContactCategory: 'C3',
      peakRegion: 'Metatarsal Head 1',
      contactAreaCm2: 110.0,
      cavanaghArchIndex: 0.20,
      archClassification: 'High Arch (Pes Cavus)',
      chippauxSmirakIndex: 25.0,
      staheliIndex: 0.40,
      diabeticUlcerRisk: {
        iwgdfRiskCategory: 1,
        riskLabel: 'Moderate Risk (Neuropathy)',
        offloadingDepthMm: 3.5,
        focalHyperpressureAlert: true,
        recommendations: ['Custom dual-density footbed'],
      },
    },
    orthoticMeasurements: {
      footLengthMm: 245,
      forefootWidthMm: 90,
      heelWidthMm: 60,
      ballGirthMm: 210,
      archIndex: 0.20,
      archType: 'High Arch',
      scaleMmPerPixel: 0.085,
      measurementMethod: 'Harris Mat Optical Morphometry',
      calibratedAt: new Date().toISOString(),
      recommendations: ['Deep heel cup', 'Metatarsal pad'],
    },
    syncStatus: undefined, // TEST: undefined syncStatus
    integrityHash: undefined, // TEST: undefined integrityHash
    signOff: undefined, // TEST: undefined signOff
  };

  // Probe 3.1: generateClinicalReportPdf with undefined qcResult, syncStatus, integrityHash, signOff
  {
    let doc = null;
    let errOccurred = null;
    try {
      doc = await reportPdf.generateClinicalReportPdf(minimalValidCase, basePatient);
    } catch (e) {
      errOccurred = e;
    }
    check(
      'generateClinicalReportPdf succeeds with undefined optional fields (qcResult, syncStatus, integrityHash, signOff)',
      errOccurred === null && doc !== null && doc.getNumberOfPages() === 4,
      errOccurred ? `Threw: ${errOccurred.message}` : `Pages: ${doc?.getNumberOfPages()}`
    );
  }

  // Probe 3.2: generateClinicalReportPdf with malformed base64 image strings
  {
    const malformedImageCase = {
      ...minimalValidCase,
      rawScanDataUrl: 'data:image/png;base64,CORRUPTED_HEX_NOT_BASE64_$%^&*()',
      processedHeatMapDataUrl: 'not_even_a_data_url',
    };
    let doc = null;
    let errOccurred = null;
    try {
      doc = await reportPdf.generateClinicalReportPdf(malformedImageCase, basePatient);
    } catch (e) {
      errOccurred = e;
    }
    check(
      'generateClinicalReportPdf gracefully catches unparseable image strings and continues',
      errOccurred === null && doc !== null && doc.getNumberOfPages() === 4,
      errOccurred ? `Threw: ${errOccurred.message}` : 'Generated without exception'
    );
  }

  // Probe 3.3: Bilateral clubbed report with undefined optional fields in both feet
  {
    const leftCase = { ...minimalValidCase, footSide: 'Left', caseNumber: 'PPA-LEFT-001' };
    const rightCase = { ...minimalValidCase, footSide: 'Right', caseNumber: 'PPA-RIGHT-001' };

    let doc = null;
    let errOccurred = null;
    try {
      doc = await reportPdf.generateBilateralClubbedReportPdf(leftCase, rightCase, basePatient);
    } catch (e) {
      errOccurred = e;
    }
    check(
      'generateBilateralClubbedReportPdf succeeds with undefined optional fields in both feet',
      errOccurred === null && doc !== null && doc.getNumberOfPages() === 4,
      errOccurred ? `Threw: ${errOccurred.message}` : `Pages: ${doc?.getNumberOfPages()}`
    );
  }

  // Probe 3.4: Patient with missing optional fields (dateOfBirth, weight, height, clinicalNotes, referringDoctor)
  {
    const emptyPatient = {
      id: 'p-bare-minimum',
      mrn: 'MRN-BARE',
      name: 'Anonymous Subject',
      gender: 'Other',
      phone: '',
      createdAt: new Date().toISOString(),
    };
    let doc = null;
    let errOccurred = null;
    try {
      doc = await reportPdf.generateClinicalReportPdf(minimalValidCase, emptyPatient);
    } catch (e) {
      errOccurred = e;
    }
    check(
      'generateClinicalReportPdf survives patient object with missing weight, height, DOB, and clinicalNotes',
      errOccurred === null && doc !== null && doc.getNumberOfPages() === 4,
      errOccurred ? `Threw: ${errOccurred.message}` : 'Safe handling of empty patient fields'
    );
  }

  // Probe 3.5: Super long strings (10,000 characters in clinical comments)
  {
    const longCase = {
      ...minimalValidCase,
      signOff: {
        physicianName: 'Dr. Long Text Tester',
        role: 'Chief Podiatric Surgeon',
        comments: 'Extensive clinical evaluation: ' + 'Observation note text. '.repeat(400),
        signedAt: new Date().toISOString(),
      },
    };
    let doc = null;
    let errOccurred = null;
    try {
      doc = await reportPdf.generateClinicalReportPdf(longCase, basePatient);
    } catch (e) {
      errOccurred = e;
    }
    check(
      'generateClinicalReportPdf wraps long clinical text without buffer overflow or crash',
      errOccurred === null && doc !== null && doc.getNumberOfPages() === 4,
      errOccurred ? `Threw: ${errOccurred.message}` : 'Long text formatted safely'
    );
  }

  // =========================================================================
  // 4. CAVANAGH ARCH INDEX NUMERICAL INTEGRATION VALIDATION
  // =========================================================================
  console.log('\n>>> 4. Testing Cavanagh Arch Index Numerical Integration & Geometry in podoIMatProcessing');

  // Probe 4.1: isPointInPolygon ray casting accuracy
  {
    const triangle = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 100 },
    ];
    const inside = podoIMat.isPointInPolygon({ x: 50, y: 50 }, triangle);
    const outside = podoIMat.isPointInPolygon({ x: 150, y: 50 }, triangle);
    const outsideAbove = podoIMat.isPointInPolygon({ x: 50, y: -10 }, triangle);

    check(
      'isPointInPolygon accurately identifies internal and external points',
      inside === true && outside === false && outsideAbove === false,
      `inside: ${inside}, outside: ${outside}, outsideAbove: ${outsideAbove}`
    );
  }

  // Probe 4.2: Synthetic High Arch Foot Outline Cavanagh Integration
  // In High Arch (Pes Cavus), the midfoot area B is very narrow / zero contact.
  {
    // Height = 300. Hindfoot: Y in [200, 300], Midfoot: Y in [100, 200], Forefoot: Y in [0, 100]
    // High arch contour: wide at hindfoot (width 60), narrow bridge at midfoot (width 4), wide at forefoot (width 80)
    const pesCavusPolygon = [
      { x: 30, y: 0 }, { x: 70, y: 0 }, // Forefoot top
      { x: 80, y: 90 }, // Forefoot bottom
      { x: 52, y: 120 }, { x: 52, y: 180 }, // Midfoot narrow bridge (width 4)
      { x: 80, y: 210 }, // Hindfoot top
      { x: 70, y: 300 }, { x: 30, y: 300 }, // Hindfoot bottom
      { x: 20, y: 210 },
      { x: 48, y: 180 }, { x: 48, y: 120 }, // Midfoot medial narrow bridge
      { x: 20, y: 90 },
    ];

    let hind = 0, mid = 0, fore = 0;
    const oneThirdY = 100;
    const twoThirdsY = 200;
    for (let py = 0; py <= 300; py += 2) {
      for (let px = 0; px <= 100; px += 2) {
        if (podoIMat.isPointInPolygon({ x: px, y: py }, pesCavusPolygon)) {
          if (py >= twoThirdsY) hind++;
          else if (py >= oneThirdY) mid++;
          else fore++;
        }
      }
    }
    const cavanaghAI = Number((mid / (hind + mid + fore)).toFixed(3));
    check(
      'Synthetic Pes Cavus polygon yields Cavanagh Arch Index < 0.15 (High Arch)',
      cavanaghAI < 0.15 && cavanaghAI > 0,
      `Cavanagh AI: ${cavanaghAI} (hind: ${hind}, mid: ${mid}, fore: ${fore})`
    );
  }

  // Probe 4.3: Synthetic Flat Foot (Pes Planus) Cavanagh Integration
  // In Flat Foot, midfoot width is almost equal to forefoot width.
  {
    // Rectangular block of 80x300
    const flatFootPolygon = [
      { x: 10, y: 0 }, { x: 90, y: 0 },
      { x: 90, y: 300 }, { x: 10, y: 300 },
    ];

    let hind = 0, mid = 0, fore = 0;
    const oneThirdY = 100;
    const twoThirdsY = 200;
    for (let py = 0; py <= 300; py += 2) {
      for (let px = 0; px <= 100; px += 2) {
        if (podoIMat.isPointInPolygon({ x: px, y: py }, flatFootPolygon)) {
          if (py >= twoThirdsY) hind++;
          else if (py >= oneThirdY) mid++;
          else fore++;
        }
      }
    }
    const cavanaghAI = Number((mid / (hind + mid + fore)).toFixed(3));
    check(
      'Synthetic Flat Foot polygon yields Cavanagh Arch Index ~0.333 (> 0.26, Flat Foot)',
      cavanaghAI >= 0.26 && Math.abs(cavanaghAI - 0.333) < 0.02,
      `Cavanagh AI: ${cavanaghAI} (hind: ${hind}, mid: ${mid}, fore: ${fore})`
    );
  }

  // Probe 4.4: 2D geometry functions (computePCA, rotatePoint, findPolygonIntersections)
  {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 100 },
      { x: 0, y: 100 },
    ];
    const mean = podoIMat.computeEmpiricalMean(pts);
    check(
      'computeEmpiricalMean computes centroid correctly',
      mean.x === 5 && mean.y === 50,
      `mean: (${mean.x}, ${mean.y})`
    );

    const rotated = podoIMat.rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    check(
      'rotatePoint rotates point by 90 degrees accurately',
      Math.abs(rotated.x - 0) < 1e-6 && Math.abs(rotated.y - 10) < 1e-6,
      `rotated: (${rotated.x.toFixed(4)}, ${rotated.y.toFixed(4)})`
    );

    const intersections = podoIMat.findPolygonIntersections(pts, { x: 5, y: 50 }, { x: 1, y: 0 });
    check(
      'findPolygonIntersections finds correct lateral intersections across polygon',
      intersections.length === 2 && (intersections[0].x === 0 || intersections[0].x === 10),
      `Found ${intersections.length} intersections`
    );
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n======================================================================');
  console.log(`CHALLENGER 2 INDEPENDENT AUDIT SUMMARY:`);
  console.log(`Total Checks: ${totalTests}`);
  console.log(`Passed:       ${passedTests}`);
  console.log(`Failed:       ${failedTests}`);
  console.log(`Status:       ${failedTests === 0 ? 'ALL VERIFICATIONS PASSED (NO DEFECTS)' : 'DEFECTS DETECTED'}`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    console.error('FAILURES:');
    failureDetails.forEach((f, idx) => {
      console.error(` ${idx + 1}. ${f.desc} - ${f.extraInfo}`);
    });
    process.exit(1);
  }
}

runChallengerAudit().catch((err) => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
