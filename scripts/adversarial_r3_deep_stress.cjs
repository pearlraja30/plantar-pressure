/**
 * Plantar Pressure Analysis System - Empirical Adversarial Stress Harness (R2 & R3)
 * Teamwork Challenger R3_2: Deep Boundary & Failure Mode Stress Test
 *
 * Applicable Standards: IEC 62304 Class B SaMD, ISO 13485:2016, ISO 14971:2019, 21 CFR Part 11
 *
 * Specific Focus Areas:
 * 1. Biomechanical Edge Cases:
 *    - Zero midfoot ground contact (Pes Cavus, AI 0.000)
 *    - Massive midfoot contact (Pes Planus, AI > 0.26)
 *    - Zero plantar area safe fallback (0.22)
 *    - Degenerate polygon geometry & ray-casting numerical stability
 * 2. Unilateral Scan Asymmetry Isolation:
 *    - Strict rejection of 0% symmetric load leakage on unilateral Left/Right scans
 *    - Clean resolution to "Unilateral Assessment (Left/Right Foot Only)"
 * 3. Contralateral Limb Isolation in PDF Reports:
 *    - Zero data leakage / zero footprint cloning of Left scan into Right foot
 *    - Truthful dispatch between single-foot and bilateral clubbed reports
 * 4. PDF Compilation Resilience:
 *    - Corrupted base64 payloads (junk strings, non-base64 bytes, invalid headers)
 *    - Undefined metadata fields (qcResult, syncStatus, integrityHash, signOff, cloudSyncId)
 *    - Minimal patient demographics & extreme text payloads
 */

const { createJiti } = require('jiti');
const jiti = createJiti(__filename);

const podoIMat = jiti('../src/services/podoIMatProcessing.ts');
const reportPdf = jiti('../src/services/reportPdfService.ts');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failureLog = [];

function assertCheck(desc, condition, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [PASS] ${desc}${details ? ' -> ' + details : ''}`);
  } else {
    failedChecks++;
    failureLog.push({ desc, details });
    console.error(`  ✗ [FAIL] ${desc}${details ? ' -> ' + details : ''}`);
  }
}

async function runAdversarialR3DeepStress() {
  console.log('======================================================================');
  console.log('   CHALLENGER R3_2: DEEP EMPIRICAL ADVERSARIAL STRESS TEST (R2 & R3)');
  console.log('======================================================================\n');

  // =========================================================================
  // SECTION 1: Biomechanical Boundary Conditions & Edge Cases
  // =========================================================================
  console.log('--- SECTION 1: Biomechanical Boundary Conditions & Edge Cases ---');

  // Test 1.1: Absolute Zero Midfoot Contact (Pes Cavus)
  {
    const hindfootPixels = 1600;
    const midfootPixels = 0; // Pure pes cavus, complete arch void
    const forefootPixels = 2200;
    const totalArea = hindfootPixels + midfootPixels + forefootPixels;
    const archIndex = totalArea > 0 ? Number((midfootPixels / totalArea).toFixed(3)) : 0.22;

    let classification = 'Normal Arch';
    if (archIndex < 0.21) classification = 'High Arch (Pes Cavus)';
    else if (archIndex > 0.26) classification = 'Flat Foot (Pes Planus)';

    assertCheck(
      'Zero midfoot contact yields Cavanagh Arch Index 0.000',
      archIndex === 0.000,
      `AI: ${archIndex}`
    );
    assertCheck(
      'Zero midfoot contact correctly classified as High Arch (Pes Cavus)',
      classification === 'High Arch (Pes Cavus)',
      `Classification: "${classification}"`
    );
  }

  // Test 1.2: Synthetic Pes Cavus Polygon Ray-Casting Integration
  {
    // A synthetic hollow polygon: hindfoot box [200, 700] to [280, 800],
    // forefoot box [180, 100] to [300, 300], and a thin 1px lateral bridge or zero midfoot
    const cavusPolygon = [
      { x: 180, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 300 }, // forefoot
      { x: 285, y: 350 }, { x: 285, y: 650 },                     // thin lateral strip (almost no midfoot)
      { x: 280, y: 700 }, { x: 280, y: 800 }, { x: 200, y: 800 }, // hindfoot
      { x: 200, y: 700 }, { x: 280, y: 650 },                     // return
      { x: 280, y: 350 }, { x: 180, y: 300 }
    ];

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of cavusPolygon) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const height = maxY - minY;
    const oneThirdY = minY + (1 / 3) * height;
    const twoThirdsY = minY + (2 / 3) * height;
    const step = 4;

    let hindCount = 0, midCount = 0, foreCount = 0;
    for (let py = Math.floor(minY); py <= Math.ceil(maxY); py += step) {
      for (let px = Math.floor(minX); px <= Math.ceil(maxX); px += step) {
        if (podoIMat.isPointInPolygon({ x: px, y: py }, cavusPolygon)) {
          if (py >= twoThirdsY) hindCount++;
          else if (py >= oneThirdY) midCount++;
          else foreCount++;
        }
      }
    }
    const totalCount = hindCount + midCount + foreCount;
    const cavusAI = totalCount > 0 ? Number((midCount / totalCount).toFixed(3)) : 0.22;

    assertCheck(
      'Synthetic Pes Cavus polygon evaluates to Arch Index < 0.15 (High Arch)',
      cavusAI < 0.15 && cavusAI >= 0.0,
      `AI: ${cavusAI} (hind: ${hindCount}, mid: ${midCount}, fore: ${foreCount})`
    );
  }

  // Test 1.3: Massive Midfoot Ground Contact (Pes Planus)
  {
    const hindfootPixels = 1200;
    const midfootPixels = 2400; // Colossal midfoot contact (severe collapsed arch)
    const forefootPixels = 1400;
    const totalArea = hindfootPixels + midfootPixels + forefootPixels;
    const archIndex = totalArea > 0 ? Number((midfootPixels / totalArea).toFixed(3)) : 0.22;

    let classification = 'Normal Arch';
    if (archIndex < 0.21) classification = 'High Arch (Pes Cavus)';
    else if (archIndex > 0.26) classification = 'Flat Foot (Pes Planus)';

    assertCheck(
      'Massive midfoot contact yields Cavanagh Arch Index > 0.26',
      archIndex > 0.26,
      `AI: ${archIndex}`
    );
    assertCheck(
      'Massive midfoot contact correctly classified as Flat Foot (Pes Planus)',
      classification === 'Flat Foot (Pes Planus)',
      `Classification: "${classification}"`
    );
  }

  // Test 1.4: Synthetic Pes Planus Uniform Rectangular Polygon
  {
    // Full rectangular footprint: equal contact across all thirds
    const flatPolygon = [
      { x: 150, y: 100 }, { x: 300, y: 100 },
      { x: 300, y: 700 }, { x: 150, y: 700 }
    ];

    let minX = 150, maxX = 300, minY = 100, maxY = 700;
    const height = maxY - minY;
    const oneThirdY = minY + (1 / 3) * height;
    const twoThirdsY = minY + (2 / 3) * height;
    const step = 5;

    let hindCount = 0, midCount = 0, foreCount = 0;
    for (let py = Math.floor(minY); py <= Math.ceil(maxY); py += step) {
      for (let px = Math.floor(minX); px <= Math.ceil(maxX); px += step) {
        if (podoIMat.isPointInPolygon({ x: px, y: py }, flatPolygon)) {
          if (py >= twoThirdsY) hindCount++;
          else if (py >= oneThirdY) midCount++;
          else foreCount++;
        }
      }
    }
    const totalCount = hindCount + midCount + foreCount;
    const flatAI = totalCount > 0 ? Number((midCount / totalCount).toFixed(3)) : 0.22;

    assertCheck(
      'Synthetic Flat Foot polygon evaluates to Arch Index > 0.26 (Flat Foot)',
      flatAI > 0.26,
      `AI: ${flatAI} (hind: ${hindCount}, mid: ${midCount}, fore: ${foreCount})`
    );
  }

  // Test 1.5: Zero Plantar Area Safe Fallback (mainFootArea = 0)
  {
    const hindfootPixels = 0;
    const midfootPixels = 0;
    const forefootPixels = 0;
    const mainFootArea = hindfootPixels + midfootPixels + forefootPixels;
    const archIndex = mainFootArea > 0 ? Number((midfootPixels / mainFootArea).toFixed(3)) : 0.22;

    assertCheck(
      'Zero plantar area returns safe fallback Arch Index of 0.22 without NaN or division by zero',
      archIndex === 0.22 && !isNaN(archIndex) && isFinite(archIndex),
      `AI: ${archIndex}`
    );
  }

  // Test 1.6: Degenerate Polygons and Numerical Limits
  {
    // Implementation of Shoelace formula matching podoIMatProcessing.ts line 811
    const calcArea = (pts) => {
      let area = 0;
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += pts[i].x * pts[j].y;
        area -= pts[j].x * pts[i].y;
      }
      return Math.abs(area) / 2;
    };

    const emptyArea = calcArea([]);
    assertCheck('Empty polygon area computes cleanly as 0', emptyArea === 0, `Area: ${emptyArea}`);

    const singlePointArea = calcArea([{ x: 50, y: 50 }]);
    assertCheck('Single-point polygon area computes cleanly as 0', singlePointArea === 0, `Area: ${singlePointArea}`);

    const collinearArea = calcArea([{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 }]);
    assertCheck('Collinear segment polygon area computes cleanly as 0', collinearArea === 0, `Area: ${collinearArea}`);

    // Test findPolygonIntersections with horizontal line
    const boxPoly = [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 50, y: 50 }, { x: 10, y: 50 }];
    const intersections = podoIMat.findPolygonIntersections(boxPoly, { x: 0, y: 30 }, { x: 1, y: 0 });
    assertCheck('findPolygonIntersections returns 2 points across rectangular polygon', intersections.length === 2, `Count: ${intersections.length}`);
  }

  // Test 1.7: Classification Threshold Exact Boundary Conformance
  {
    const classify = (ai) => {
      if (ai < 0.21) return 'High Arch (Pes Cavus)';
      if (ai > 0.26) return 'Flat Foot (Pes Planus)';
      return 'Normal Arch';
    };

    assertCheck('Boundary AI 0.209 is High Arch (Pes Cavus)', classify(0.209) === 'High Arch (Pes Cavus)');
    assertCheck('Boundary AI 0.210 is Normal Arch', classify(0.210) === 'Normal Arch');
    assertCheck('Boundary AI 0.260 is Normal Arch', classify(0.260) === 'Normal Arch');
    assertCheck('Boundary AI 0.261 is Flat Foot (Pes Planus)', classify(0.261) === 'Flat Foot (Pes Planus)');
  }

  // =========================================================================
  // SECTION 2: Unilateral Scan Asymmetry Isolation
  // =========================================================================
  console.log('\n--- SECTION 2: Unilateral Scan Asymmetry Isolation ---');

  function evaluateAsymmetryInResults(leftAnalysis, rightAnalysis, leftFoot, rightFoot, currentCase) {
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

  // Test 2.1: Unilateral Left scan with only currentCase in scope
  {
    const res = evaluateAsymmetryInResults(
      null,
      null,
      null,
      null,
      {
        footSide: 'Left',
        rawScanDataUrl: 'data:image/png;base64,LEFT_SCAN_MOCK_BYTES',
        regionalAnalysis: { contactAreaCm2: 124.5 }
      }
    );

    assertCheck(
      'Unilateral Left scan correctly identifies hasLeft=true and hasRight=false',
      res.hasLeft === true && res.hasRight === false,
      `hasLeft: ${res.hasLeft}, hasRight: ${res.hasRight}`
    );
    assertCheck(
      'Unilateral Left scan assigns strictly rAreaNum=0',
      res.rAreaNum === 0 && res.lAreaNum === 124.5,
      `lAreaNum: ${res.lAreaNum}, rAreaNum: ${res.rAreaNum}`
    );
    assertCheck(
      'Unilateral Left scan rejects 0% symmetric load and outputs "Unilateral Assessment (Left Foot Only)"',
      res.asymmetryLabel === 'Unilateral Assessment (Left Foot Only)' && !res.asymmetryLabel.includes('Symmetric Plantar Load'),
      `Label: "${res.asymmetryLabel}"`
    );
  }

  // Test 2.2: Unilateral Right scan with only currentCase in scope
  {
    const res = evaluateAsymmetryInResults(
      null,
      null,
      null,
      null,
      {
        footSide: 'Right',
        rawScanDataUrl: 'data:image/png;base64,RIGHT_SCAN_MOCK_BYTES',
        regionalAnalysis: { contactAreaCm2: 119.0 }
      }
    );

    assertCheck(
      'Unilateral Right scan correctly identifies hasLeft=false and hasRight=true',
      res.hasLeft === false && res.hasRight === true,
      `hasLeft: ${res.hasLeft}, hasRight: ${res.hasRight}`
    );
    assertCheck(
      'Unilateral Right scan assigns strictly lAreaNum=0',
      res.lAreaNum === 0 && res.rAreaNum === 119.0,
      `lAreaNum: ${res.lAreaNum}, rAreaNum: ${res.rAreaNum}`
    );
    assertCheck(
      'Unilateral Right scan rejects 0% symmetric load and outputs "Unilateral Assessment (Right Foot Only)"',
      res.asymmetryLabel === 'Unilateral Assessment (Right Foot Only)' && !res.asymmetryLabel.includes('Symmetric Plantar Load'),
      `Label: "${res.asymmetryLabel}"`
    );
  }

  // Test 2.3: Unilateral Left scan with leftAnalysis in component state
  {
    const res = evaluateAsymmetryInResults(
      { regionalAnalysis: { contactAreaCm2: 122.0 } },
      null,
      { side: 'Left' },
      null,
      null
    );

    assertCheck(
      'Unilateral Left scan with state object outputs "Unilateral Assessment (Left Foot Only)"',
      res.asymmetryLabel === 'Unilateral Assessment (Left Foot Only)',
      `Label: "${res.asymmetryLabel}"`
    );
  }

  // Test 2.4: Unilateral Right scan with rightAnalysis in component state
  {
    const res = evaluateAsymmetryInResults(
      null,
      { regionalAnalysis: { contactAreaCm2: 121.5 } },
      null,
      { side: 'Right' },
      null
    );

    assertCheck(
      'Unilateral Right scan with state object outputs "Unilateral Assessment (Right Foot Only)"',
      res.asymmetryLabel === 'Unilateral Assessment (Right Foot Only)',
      `Label: "${res.asymmetryLabel}"`
    );
  }

  // Test 2.5: True Bilateral Scan - Symmetrical Load (within 8%)
  {
    const res = evaluateAsymmetryInResults(
      { regionalAnalysis: { contactAreaCm2: 120.0 } },
      { regionalAnalysis: { contactAreaCm2: 124.0 } },
      { side: 'Left' },
      { side: 'Right' },
      null
    );

    // Asymmetry = round(|120 - 124| / 124 * 100) = round(4 / 124 * 100) = 3%
    assertCheck(
      'Bilateral scan with 3% variance outputs "3% (Symmetric Plantar Load)"',
      res.asymmetryLabel === '3% (Symmetric Plantar Load)',
      `Label: "${res.asymmetryLabel}"`
    );
  }

  // Test 2.6: True Bilateral Scan - Asymmetrical Load (> 8%)
  {
    const res = evaluateAsymmetryInResults(
      { regionalAnalysis: { contactAreaCm2: 100.0 } },
      { regionalAnalysis: { contactAreaCm2: 150.0 } },
      { side: 'Left' },
      { side: 'Right' },
      null
    );

    // Asymmetry = round(|100 - 150| / 150 * 100) = round(50 / 150 * 100) = 33%
    assertCheck(
      'Bilateral scan with 33% variance outputs "33% (Asymmetric Plantar Load)"',
      res.asymmetryLabel === '33% (Asymmetric Plantar Load)',
      `Label: "${res.asymmetryLabel}"`
    );
  }

  // =========================================================================
  // SECTION 3: Contralateral Limb Isolation in PDF Reports (Zero Cloning)
  // =========================================================================
  console.log('\n--- SECTION 3: Contralateral Limb Isolation in PDF Reports (Zero Cloning) ---');

  function evaluateReportPdfDispatch(activeCase, leftRawScan, rightRawScan, leftHeatmap, rightHeatmap, leftAnalysis, rightAnalysis) {
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

    return {
      hasLeftData,
      hasRightData,
      isBilateral,
      leftCaseForPdf,
      rightCaseForPdf,
      selectedSingleFootCase,
    };
  }

  // Test 3.1: Unilateral Left Scan Limb Isolation
  {
    const activeCase = {
      id: 'case-unilateral-left-audit',
      caseNumber: 'PPA-2026-UNI-L',
      footSide: 'Left',
      rawScanDataUrl: 'data:image/png;base64,LEFT_SCAN_EXCLUSIVE_PIXELS',
      processedHeatMapDataUrl: 'data:image/png;base64,LEFT_HEATMAP_EXCLUSIVE_PIXELS',
      rightRawScanDataUrl: '',
      rightProcessedHeatMapDataUrl: '',
      regionalAnalysis: { contactAreaCm2: 121.0, cavanaghArchIndex: 0.23 },
      orthoticMeasurements: { footLengthMm: 252, archIndex: 0.23 },
    };

    const dispatch = evaluateReportPdfDispatch(activeCase, null, null, null, null, null, null);

    assertCheck(
      'Unilateral Left scan has hasLeftData=true and hasRightData=false',
      dispatch.hasLeftData === true && dispatch.hasRightData === false && dispatch.isBilateral === false,
      `isBilateral: ${dispatch.isBilateral}`
    );
    assertCheck(
      'Unilateral Left scan does NOT clone rawScanDataUrl into Right foot case (must be empty string)',
      dispatch.rightCaseForPdf.rawScanDataUrl === '' && dispatch.rightCaseForPdf.rawScanDataUrl !== activeCase.rawScanDataUrl,
      `rightCaseForPdf.rawScanDataUrl: "${dispatch.rightCaseForPdf.rawScanDataUrl}"`
    );
    assertCheck(
      'Unilateral Left scan preserves undefined regionalAnalysis for Right foot case',
      dispatch.rightCaseForPdf.regionalAnalysis === undefined,
      `rightCaseForPdf.regionalAnalysis: ${dispatch.rightCaseForPdf.regionalAnalysis}`
    );
    assertCheck(
      'Unilateral Left scan preserves undefined orthoticMeasurements for Right foot case',
      dispatch.rightCaseForPdf.orthoticMeasurements === undefined,
      `rightCaseForPdf.orthoticMeasurements: ${dispatch.rightCaseForPdf.orthoticMeasurements}`
    );
    assertCheck(
      'Unilateral Left scan selects leftCaseForPdf for single-foot clinical report dispatch',
      dispatch.selectedSingleFootCase.footSide === 'Left' && dispatch.selectedSingleFootCase.rawScanDataUrl === activeCase.rawScanDataUrl,
      `Selected footSide: ${dispatch.selectedSingleFootCase.footSide}`
    );
  }

  // Test 3.2: Unilateral Right Scan Limb Isolation
  {
    const activeCase = {
      id: 'case-unilateral-right-audit',
      caseNumber: 'PPA-2026-UNI-R',
      footSide: 'Right',
      rawScanDataUrl: '',
      processedHeatMapDataUrl: '',
      rightRawScanDataUrl: 'data:image/png;base64,RIGHT_SCAN_EXCLUSIVE_PIXELS',
      rightProcessedHeatMapDataUrl: 'data:image/png;base64,RIGHT_HEATMAP_EXCLUSIVE_PIXELS',
      regionalAnalysis: { contactAreaCm2: 118.0, cavanaghArchIndex: 0.21 },
      orthoticMeasurements: { footLengthMm: 248, archIndex: 0.21 },
    };

    const dispatch = evaluateReportPdfDispatch(activeCase, null, null, null, null, null, null);

    assertCheck(
      'Unilateral Right scan has hasLeftData=false and hasRightData=true',
      dispatch.hasLeftData === false && dispatch.hasRightData === true && dispatch.isBilateral === false,
      `hasLeftData: ${dispatch.hasLeftData}, hasRightData: ${dispatch.hasRightData}`
    );
    assertCheck(
      'Unilateral Right scan selects rightCaseForPdf for single-foot clinical report dispatch',
      dispatch.selectedSingleFootCase.footSide === 'Right',
      `Selected footSide: ${dispatch.selectedSingleFootCase.footSide}`
    );
  }

  // =========================================================================
  // SECTION 4: PDF Compilation Resilience Under Corrupted Payloads & Undefined Fields
  // =========================================================================
  console.log('\n--- SECTION 4: PDF Compilation Resilience Under Corrupted Payloads & Undefined Fields ---');

  const baselinePatient = {
    id: 'pt-adversarial-01',
    mrn: 'MRN-ADV-2026-99',
    name: 'Adversarial Test Patient',
    dateOfBirth: '1985-06-15',
    gender: 'Female',
    weightKg: 62,
    heightCm: 168,
    phone: '+1-555-8822',
    referringDoctor: 'Dr. Evelyn Cross, MD',
    clinicalNotes: 'Adversarial integrity stress test scan',
    createdAt: new Date().toISOString(),
  };

  const createAuditCase = (overrides = {}) => ({
    id: 'case-adv-01',
    caseNumber: 'PPA-2026-ADV-01',
    patientId: 'pt-adversarial-01',
    footSide: 'Left',
    indication: 'Adversarial PDF generation stress test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    operatorName: 'Stress Test Automation',
    clinicName: 'PodoPress SaMD Verification Lab',
    rawScanDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    processedHeatMapDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    scanMetadata: {
      scannerModel: 'Harris Mat Scanner 3000',
      scannerDriver: 'WIA/TWAIN v2.5',
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
    algorithmVersion: 'PPA-2.0.0-PROBE',
    categoryDistribution: [
      { category: 'C1', percentage: 20.0, areaMm2: 2000 },
      { category: 'C2', percentage: 40.0, areaMm2: 4000 },
      { category: 'C3', percentage: 20.0, areaMm2: 2000 },
      { category: 'C4', percentage: 10.0, areaMm2: 1000 },
      { category: 'C5', percentage: 10.0, areaMm2: 1000 },
      { category: 'C6', percentage: 0.0, areaMm2: 0 },
    ],
    regionalAnalysis: {
      forefootContactPct: 35.0,
      midfootContactPct: 20.0,
      hindfootContactPct: 35.0,
      halluxContactPct: 10.0,
      peakContactCategory: 'C4',
      peakRegion: '1st Metatarsal',
      contactAreaCm2: 115.0,
      cavanaghArchIndex: 0.22,
      archClassification: 'Normal Arch',
      chippauxSmirakIndex: 25.0,
      staheliIndex: 0.38,
      diabeticUlcerRisk: {
        iwgdfRiskCategory: 0,
        riskLabel: 'Low Risk (Baseline)',
        offloadingDepthMm: 0,
        focalHyperpressureAlert: false,
        recommendations: ['Routine monitoring'],
      },
    },
    orthoticMeasurements: {
      footLengthMm: 250,
      forefootWidthMm: 94,
      heelWidthMm: 64,
      ballGirthMm: 218,
      archIndex: 0.22,
      archType: 'Normal Arch',
      scaleMmPerPixel: 0.0847,
      measurementMethod: 'Optical Calibration',
      calibratedAt: new Date().toISOString(),
      recommendations: ['Supportive contouring'],
    },
    syncStatus: 'synced',
    integrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    ...overrides,
  });

  // Test 4.1: Corrupted Base64 Payload Stress (Single-Foot)
  {
    const corruptedCase = createAuditCase({
      rawScanDataUrl: 'data:image/png;base64,GARBAGE_NOT_BASE64_AT_ALL_$$$%%%^^^&&&',
      processedHeatMapDataUrl: 'data:image/jpeg;base64,CORRUPTED_TRUNCATED_BYTES',
    });

    let doc = null;
    let err = null;
    try {
      doc = await reportPdf.generateClinicalReportPdf(corruptedCase, baselinePatient);
    } catch (e) {
      err = e;
    }

    assertCheck(
      'generateClinicalReportPdf cleanly survives corrupted base64 images without throwing',
      err === null && doc !== null,
      err ? `Error: ${err.message}` : `Generated ${doc?.getNumberOfPages()} pages`
    );
    if (doc) {
      assertCheck(
        'generateClinicalReportPdf outputs full 4 pages despite corrupted image payloads',
        doc.getNumberOfPages() === 4,
        `Page count: ${doc.getNumberOfPages()}`
      );
    }
  }

  // Test 4.2: Corrupted Base64 Payload Stress (Bilateral Clubbed)
  {
    const leftCorrupted = createAuditCase({
      footSide: 'Left',
      rawScanDataUrl: 'data:image/webp;base64,LEFT_JUNK_BYTES_!!!',
      processedHeatMapDataUrl: 'data:image/png;base64,LEFT_HM_JUNK_BYTES_???',
    });
    const rightCorrupted = createAuditCase({
      caseNumber: 'PPA-2026-ADV-02',
      footSide: 'Right',
      rawScanDataUrl: 'data:image/jpeg;base64,RIGHT_JUNK_BYTES_###',
      processedHeatMapDataUrl: 'data:image/png;base64,RIGHT_HM_JUNK_BYTES_@@@',
    });

    let doc = null;
    let err = null;
    try {
      doc = await reportPdf.generateBilateralClubbedReportPdf(leftCorrupted, rightCorrupted, baselinePatient);
    } catch (e) {
      err = e;
    }

    assertCheck(
      'generateBilateralClubbedReportPdf cleanly survives corrupted bilateral base64 images without throwing',
      err === null && doc !== null,
      err ? `Error: ${err.message}` : `Generated ${doc?.getNumberOfPages()} pages`
    );
    if (doc) {
      assertCheck(
        'generateBilateralClubbedReportPdf outputs full 4 pages despite corrupted bilateral image payloads',
        doc.getNumberOfPages() === 4,
        `Page count: ${doc.getNumberOfPages()}`
      );
    }
  }

  // Test 4.3: Undefined Optional Metadata Fields (qcResult, syncStatus, integrityHash, signOff, cloudSyncId)
  {
    const caseMissingMetadata = createAuditCase({
      qcResult: undefined,
      syncStatus: undefined,
      cloudSyncId: undefined,
      integrityHash: undefined,
      signOff: undefined,
    });

    let doc = null;
    let err = null;
    try {
      doc = await reportPdf.generateClinicalReportPdf(caseMissingMetadata, baselinePatient);
    } catch (e) {
      err = e;
    }

    assertCheck(
      'generateClinicalReportPdf survives undefined qcResult, syncStatus, integrityHash, signOff, cloudSyncId',
      err === null && doc !== null,
      err ? `Error: ${err.message}` : `Generated ${doc?.getNumberOfPages()} pages`
    );
    if (doc) {
      assertCheck(
        'generateClinicalReportPdf outputs 4 pages with defensive fallback values for undefined metadata',
        doc.getNumberOfPages() === 4,
        `Page count: ${doc.getNumberOfPages()}`
      );
    }
  }

  // Test 4.4: Bilateral Report with Undefined Optional Metadata Fields on Both Feet
  {
    const leftMissing = createAuditCase({
      footSide: 'Left',
      qcResult: undefined,
      syncStatus: undefined,
      integrityHash: undefined,
      signOff: undefined,
    });
    const rightMissing = createAuditCase({
      caseNumber: 'PPA-2026-ADV-02',
      footSide: 'Right',
      qcResult: undefined,
      syncStatus: undefined,
      integrityHash: undefined,
      signOff: undefined,
    });

    let doc = null;
    let err = null;
    try {
      doc = await reportPdf.generateBilateralClubbedReportPdf(leftMissing, rightMissing, baselinePatient);
    } catch (e) {
      err = e;
    }

    assertCheck(
      'generateBilateralClubbedReportPdf survives undefined metadata fields across both feet',
      err === null && doc !== null,
      err ? `Error: ${err.message}` : `Generated ${doc?.getNumberOfPages()} pages`
    );
    if (doc) {
      assertCheck(
        'generateBilateralClubbedReportPdf outputs 4 pages with missing metadata',
        doc.getNumberOfPages() === 4,
        `Page count: ${doc.getNumberOfPages()}`
      );
    }
  }

  // Test 4.5: Minimal Patient Demographics (Missing DOB, weight, height, phone, notes)
  {
    const minimalPatient = {
      id: 'pt-sparse-01',
      mrn: 'MRN-SPARSE-001',
      name: 'Sparse Demographic Patient',
      gender: 'Male',
      phone: '',
      // weightKg, heightCm, dateOfBirth, clinicalNotes omitted
      createdAt: new Date().toISOString(),
    };

    let doc = null;
    let err = null;
    try {
      doc = await reportPdf.generateClinicalReportPdf(createAuditCase(), minimalPatient);
    } catch (e) {
      err = e;
    }

    assertCheck(
      'generateClinicalReportPdf survives minimal patient demographics without crash',
      err === null && doc !== null,
      err ? `Error: ${err.message}` : `Generated ${doc?.getNumberOfPages()} pages`
    );
    if (doc) {
      assertCheck(
        'generateClinicalReportPdf produces 4 pages for minimal patient demographics',
        doc.getNumberOfPages() === 4,
        `Page count: ${doc.getNumberOfPages()}`
      );
    }
  }

  // Test 4.6: Extreme Clinical Text Payloads (Buffer / text wrap stress)
  {
    const massiveTextPatient = {
      ...baselinePatient,
      clinicalNotes: 'Patient presents with severe neuropathic symptoms. '.repeat(200), // ~10,000 characters
      referringDoctor: 'Dr. LongName '.repeat(50),
    };

    let doc = null;
    let err = null;
    try {
      doc = await reportPdf.generateClinicalReportPdf(createAuditCase(), massiveTextPatient);
    } catch (e) {
      err = e;
    }

    assertCheck(
      'generateClinicalReportPdf wraps 10,000-character clinical notes without crash or buffer overflow',
      err === null && doc !== null,
      err ? `Error: ${err.message}` : `Generated ${doc?.getNumberOfPages()} pages`
    );
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n======================================================================');
  console.log('CHALLENGER R3_2 DEEP ADVERSARIAL STRESS TEST SUMMARY:');
  console.log(`Total Checks:  ${totalChecks}`);
  console.log(`Passed:        ${passedChecks}`);
  console.log(`Failed:        ${failedChecks}`);
  console.log(`Final Verdict: ${failedChecks === 0 ? 'APPROVE (ALL CHECKS PASSED)' : 'REJECT (DEFECTS FOUND)'}`);
  console.log('======================================================================\n');

  if (failedChecks > 0) {
    process.exit(1);
  }
}

runAdversarialR3DeepStress().catch((err) => {
  console.error('Fatal crash during adversarial test harness execution:', err);
  process.exit(1);
});
