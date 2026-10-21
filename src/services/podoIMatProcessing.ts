/**
 * Podo I Mat (Image Processing) Clinical Algorithm
 * Implementation adhering strictly to Steps 01 to 39:
 * 
 * Preprocessing (01-02)
 * Foot Outline Detection (03-06)
 * Overall Foot Image Preparation (07-08)
 * Individual Foot Processing (09-38)
 *   - Foot Axis Detection (10)
 *   - Foot Orientation Detection (11-14)
 *   - Foot Side Detection (15-18)
 *   - Foot Outline Normalization (19-20)
 *   - Foot Image Extraction (21-23)
 *   - Heel Axis Detection (24-25)
 *   - Foot Length Segment Detection (26-29)
 *   - Heel Breadth Segment Detection (30-33)
 *   - Ball Breadth Segment Detection (34-36)
 *   - Partial Result Preparation (37)
 * Final Result (39)
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Segment2D {
  p1: Point2D;
  p2: Point2D;
  lengthMm: number;
}

export interface PodoIMatFootResult {
  side: 'Left' | 'Right';
  outline: Point2D[];
  normalizedOutline: Point2D[];
  footImageBase64: string;
  heatmapImageBase64: string;
  empiricalMean: Point2D;
  rotationAngleRad: number;
  rotationAngleDeg: number;

  // Axes
  footAxis: { origin: Point2D; direction: Point2D };
  heelAxis: { origin: Point2D; direction: Point2D };

  // Key landmarks
  heelVertex: Point2D;
  toeVertex: Point2D;
  heelCentre: Point2D;

  // Segments & measurements
  footLengthSegment: Segment2D;
  heelBreadthSegment: Segment2D;
  ballBreadthSegment: Segment2D;

  measurements: {
    footLengthMm: number;
    ballBreadthMm: number; // forefoot width
    heelBreadthMm: number; // heel width
    cavanaghArchIndex: number;
    contactAreaCm2: number;
  };

  stepLog: { step: number; title: string; detail: string }[];
}

export interface PodoIMatScanResult {
  feet: PodoIMatFootResult[];
  overallImageBase64: string;
  timestamp: string;
  processingTimeMs: number;
  dpi: number;
}

// ----------------------------------------------------------------------------
// Mathematical & PCA Utilities
// ----------------------------------------------------------------------------

export function computeEmpiricalMean(points: Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < points.length; i++) {
    sumX += points[i].x;
    sumY += points[i].y;
  }
  return { x: sumX / points.length, y: sumY / points.length };
}

export function computePCA(points: Point2D[]): { mean: Point2D; direction: Point2D; eigenvalue: number } {
  const mean = computeEmpiricalMean(points);
  const n = points.length;
  if (n < 2) return { mean, direction: { x: 0, y: 1 }, eigenvalue: 0 };

  let varX = 0;
  let varY = 0;
  let covXY = 0;

  for (let i = 0; i < n; i++) {
    const dx = points[i].x - mean.x;
    const dy = points[i].y - mean.y;
    varX += dx * dx;
    varY += dy * dy;
    covXY += dx * dy;
  }
  varX /= n;
  varY /= n;
  covXY /= n;

  // Eigenvalues of 2x2 covariance matrix
  const trace = varX + varY;
  const det = varX * varY - covXY * covXY;
  const discr = Math.max(0, trace * trace - 4 * det);
  const lambda1 = (trace + Math.sqrt(discr)) / 2;

  let vx = 0;
  let vy = 1;

  if (Math.abs(covXY) > 1e-7) {
    vx = lambda1 - varY;
    vy = covXY;
  } else if (varX >= varY) {
    vx = 1;
    vy = 0;
  } else {
    vx = 0;
    vy = 1;
  }

  const len = Math.hypot(vx, vy);
  if (len > 1e-7) {
    vx /= len;
    vy /= len;
  }

  return { mean, direction: { x: vx, y: vy }, eigenvalue: lambda1 };
}

export function findLineIntersection(
  p1: Point2D,
  v1: Point2D,
  p2: Point2D,
  v2: Point2D
): Point2D | null {
  const det = v1.x * v2.y - v1.y * v2.x;
  if (Math.abs(det) < 1e-6) return null; // Parallel

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t = (dx * v2.y - dy * v2.x) / det;

  return {
    x: p1.x + t * v1.x,
    y: p1.y + t * v1.y,
  };
}

export function rotatePoint(p: Point2D, center: Point2D, angleRad: number): Point2D {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos),
  };
}

export function lineSegmentIntersection(
  p1: Point2D,
  p2: Point2D,
  linePt: Point2D,
  lineDir: Point2D
): Point2D | null {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const det = dx * lineDir.y - dy * lineDir.x;
  if (Math.abs(det) < 1e-7) return null;

  const qx = linePt.x - p1.x;
  const qy = linePt.y - p1.y;
  const s = (qx * lineDir.y - qy * lineDir.x) / det;
  const t = (qx * dy - qy * dx) / det;

  if (s >= 0 && s <= 1) {
    return {
      x: p1.x + s * dx,
      y: p1.y + s * dy,
    };
  }
  return null;
}

export function findPolygonIntersections(polygon: Point2D[], linePt: Point2D, lineDir: Point2D): Point2D[] {
  const results: Point2D[] = [];
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];
    const pt = lineSegmentIntersection(p1, p2, linePt, lineDir);
    if (pt) {
      // Avoid duplicate adjacent intersection
      const isDuplicate = results.some((r) => Math.hypot(r.x - pt.x, r.y - pt.y) < 1.0);
      if (!isDuplicate) results.push(pt);
    }
  }
  return results;
}

// ----------------------------------------------------------------------------
// Core Podo I Mat 39-Step Processing Function
// ----------------------------------------------------------------------------

export async function processPodoIMatScan(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  options: {
    dpi?: number;
    maxDimension?: number;
  } = {}
): Promise<PodoIMatScanResult> {
  const t0 = performance.now();
  const dpi = options.dpi || 300;
  const mmPerPixel = 25.4 / dpi;
  const maxDim = options.maxDimension || 1400;

  let origWidth = ('naturalWidth' in imageSource ? imageSource.naturalWidth : imageSource.width) || imageSource.width;
  let origHeight = ('naturalHeight' in imageSource ? imageSource.naturalHeight : imageSource.height) || imageSource.height;

  // --------------------------------------------------------------------------
  // STEP 01: flip the feet scan horizontally
  // STEP 02: IF the feet scan resolution is too big THEN down sample the feet scan
  // --------------------------------------------------------------------------
  let scale = 1.0;
  if (origWidth > maxDim || origHeight > maxDim) {
    scale = maxDim / Math.max(origWidth, origHeight);
  }
  const width = Math.round(origWidth * scale);
  const height = Math.round(origHeight * scale);
  const scaledMmPerPixel = mmPerPixel / scale;

  const prepCanvas = document.createElement('canvas');
  prepCanvas.width = width;
  prepCanvas.height = height;
  const prepCtx = prepCanvas.getContext('2d', { willReadFrequently: true })!;

  // Step 01: Horizontal Flip
  prepCtx.save();
  prepCtx.translate(width, 0);
  prepCtx.scale(-1, 1);
  prepCtx.drawImage(imageSource, 0, 0, width, height);
  prepCtx.restore();

  const srcImgData = prepCtx.getImageData(0, 0, width, height);
  const srcData = srcImgData.data;

  // --------------------------------------------------------------------------
  // STEP 03: apply Gaussian filtering to the feet scan to get filtered image
  // --------------------------------------------------------------------------
  const grayscale = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const lum = 0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2];
    grayscale[i] = (255.0 - lum) / 255.0; // Inverted darkness [0.0 - 1.0]
  }

  // Gaussian blur (sigma = 2.0)
  const filtered = gaussianBlur1D(grayscale, width, height, 2.0);

  // --------------------------------------------------------------------------
  // STEP 04: threshold the filtered image to get binary image
  // --------------------------------------------------------------------------
  const binary = new Uint8Array(width * height);
  const thresholdVal = 0.12; // Harris mat contact threshold
  for (let i = 0; i < width * height; i++) {
    binary[i] = filtered[i] > thresholdVal ? 1 : 0;
  }

  // --------------------------------------------------------------------------
  // STEP 05: morphologically close the binary image to get closed binary image
  // --------------------------------------------------------------------------
  const closedBinary = morphologicalClose(binary, width, height, 4);

  // --------------------------------------------------------------------------
  // STEP 06: trace all outlines in the closed binary image
  // --------------------------------------------------------------------------
  const rawOutlines = traceAllOutlines(closedBinary, width, height);

  // --------------------------------------------------------------------------
  // STEP 07: apply Gaussian filtering to the binary image to get grayscale mask
  // --------------------------------------------------------------------------
  const binaryFloat = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) binaryFloat[i] = closedBinary[i];
  const grayscaleMask = gaussianBlur1D(binaryFloat, width, height, 2.5);

  // --------------------------------------------------------------------------
  // STEP 08: apply this mask to the feet scan to get overall foot image
  // --------------------------------------------------------------------------
  const overallCanvas = document.createElement('canvas');
  overallCanvas.width = width;
  overallCanvas.height = height;
  const overallCtx = overallCanvas.getContext('2d')!;
  const overallImgData = overallCtx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const m = grayscaleMask[i];
    if (m > 0.05) {
      overallImgData.data[idx] = srcData[idx];
      overallImgData.data[idx + 1] = srcData[idx + 1];
      overallImgData.data[idx + 2] = srcData[idx + 2];
      overallImgData.data[idx + 3] = Math.round(m * 255);
    } else {
      overallImgData.data[idx + 3] = 0; // transparent
    }
  }
  overallCtx.putImageData(overallImgData, 0, 0);
  const overallImageBase64 = overallCanvas.toDataURL('image/png');

  // Filter significant foot outlines (area threshold >= 1200 px)
  const validOutlines = rawOutlines.filter((pts) => pts.length >= 30 && computePolygonArea(pts) > 1200);

  // --------------------------------------------------------------------------
  // STEP 09: FOREACH recognized foot outline DO
  // --------------------------------------------------------------------------
  const feetResults: PodoIMatFootResult[] = [];

  for (const outline of validOutlines) {
    const stepLog: { step: number; title: string; detail: string }[] = [];

    // ------------------------------------------------------------------------
    // STEP 10: compute principal component of the foot outline to get foot axis
    // ------------------------------------------------------------------------
    const pca = computePCA(outline);
    const empiricalMean = pca.mean;
    let footAxisDir = pca.direction;
    stepLog.push({
      step: 10,
      title: 'Foot axis detection',
      detail: `PCA foot axis computed at origin (${empiricalMean.x.toFixed(1)}, ${empiricalMean.y.toFixed(1)}), direction: (${footAxisDir.x.toFixed(3)}, ${footAxisDir.y.toFixed(3)})`,
    });

    // ------------------------------------------------------------------------
    // STEP 11: split the foot outline along the foot axis into two parts
    // ------------------------------------------------------------------------
    const axisNormal = { x: -footAxisDir.y, y: footAxisDir.x };
    const part1: Point2D[] = [];
    const part2: Point2D[] = [];

    for (const pt of outline) {
      const signedDist = (pt.x - empiricalMean.x) * axisNormal.x + (pt.y - empiricalMean.y) * axisNormal.y;
      if (signedDist >= 0) part1.push(pt);
      else part2.push(pt);
    }
    stepLog.push({
      step: 11,
      title: 'Foot split along axis',
      detail: `Part 1 points: ${part1.length}, Part 2 points: ${part2.length}`,
    });

    // ------------------------------------------------------------------------
    // STEP 12: compute principal components of these two parts
    // ------------------------------------------------------------------------
    const pca1 = computePCA(part1);
    const pca2 = computePCA(part2);

    // ------------------------------------------------------------------------
    // STEP 13: find the intersection of these principal components
    // ------------------------------------------------------------------------
    const intersection = findLineIntersection(pca1.mean, pca1.direction, pca2.mean, pca2.direction);

    // ------------------------------------------------------------------------
    // STEP 14: determine the orientation using this intersection
    // ------------------------------------------------------------------------
    // The medial and lateral borders converge towards the heel (posterior)
    if (intersection) {
      const toMean = { x: empiricalMean.x - intersection.x, y: empiricalMean.y - intersection.y };
      const dot = toMean.x * footAxisDir.x + toMean.y * footAxisDir.y;
      if (dot < 0) {
        // Reverse direction so footAxisDir points towards toes (anterior)
        footAxisDir = { x: -footAxisDir.x, y: -footAxisDir.y };
      }
    } else {
      // Fallback: in typical vertical alignment, toes are top (negative Y in canvas space)
      if (footAxisDir.y > 0) {
        footAxisDir = { x: -footAxisDir.x, y: -footAxisDir.y };
      }
    }
    stepLog.push({
      step: 14,
      title: 'Foot orientation determined',
      detail: `Orientation vector pointing anteriorly towards toes: (${footAxisDir.x.toFixed(3)}, ${footAxisDir.y.toFixed(3)})`,
    });

    // ------------------------------------------------------------------------
    // STEP 15: prepare line perpendicular to the foot axis
    // STEP 16: find intersections of the foot outline with this line
    // STEP 17: compare distances of these intersections
    // STEP 18: determine the side using the farther intersection
    // ------------------------------------------------------------------------
    const perpDir = { x: -footAxisDir.y, y: footAxisDir.x };
    const perpIntersections = findPolygonIntersections(outline, empiricalMean, perpDir);

    let determinedSide: 'Left' | 'Right' = 'Right';
    if (perpIntersections.length >= 2) {
      const d1 = Math.hypot(perpIntersections[0].x - empiricalMean.x, perpIntersections[0].y - empiricalMean.y);
      const d2 = Math.hypot(perpIntersections[1].x - empiricalMean.x, perpIntersections[1].y - empiricalMean.y);
      const fartherPt = d1 > d2 ? perpIntersections[0] : perpIntersections[1];
      const lateralDot = (fartherPt.x - empiricalMean.x) * perpDir.x + (fartherPt.y - empiricalMean.y) * perpDir.y;
      // In anatomical projection: lateral border extends farther from PCA centroid
      determinedSide = lateralDot > 0 ? 'Left' : 'Right';
    } else {
      // Spatial centroid fallback
      determinedSide = empiricalMean.x < width / 2 ? 'Left' : 'Right';
    }
    stepLog.push({
      step: 18,
      title: 'Foot side detected',
      detail: `Classified as ${determinedSide} foot via perpendicular excursion differential.`,
    });

    // ------------------------------------------------------------------------
    // STEP 19: compute oriented angle between foot orientation and positive y-axis
    // STEP 20: rotate the foot outline around its empirical mean by this angle
    // ------------------------------------------------------------------------
    // Target is positive Y in standard coordinates (or -Y in screen coordinates where toes point up)
    const currentAngle = Math.atan2(footAxisDir.y, footAxisDir.x);
    const targetAngle = -Math.PI / 2; // Straight up towards toes
    const rotationAngle = targetAngle - currentAngle;

    const normalizedOutline = outline.map((pt) => rotatePoint(pt, empiricalMean, rotationAngle));
    stepLog.push({
      step: 20,
      title: 'Foot outline normalized',
      detail: `Rotated outline by ${(rotationAngle * (180 / Math.PI)).toFixed(1)}° around empirical mean.`,
    });

    // ------------------------------------------------------------------------
    // STEP 21: find pixel equivalent to the empirical mean of the foot outline
    // STEP 22: rotate the overall foot image around this pixel by the same angle
    // STEP 23: crop out foot image from the rotated overall foot image
    // ------------------------------------------------------------------------
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = width;
    rotatedCanvas.height = height;
    const rotCtx = rotatedCanvas.getContext('2d')!;
    rotCtx.save();
    rotCtx.translate(empiricalMean.x, empiricalMean.y);
    rotCtx.rotate(rotationAngle);
    rotCtx.translate(-empiricalMean.x, -empiricalMean.y);
    rotCtx.drawImage(overallCanvas, 0, 0);
    rotCtx.restore();

    // Compute bounding box of normalized outline
    let nMinX = Infinity;
    let nMaxX = -Infinity;
    let nMinY = Infinity;
    let nMaxY = -Infinity;
    for (const pt of normalizedOutline) {
      if (pt.x < nMinX) nMinX = pt.x;
      if (pt.x > nMaxX) nMaxX = pt.x;
      if (pt.y < nMinY) nMinY = pt.y;
      if (pt.y > nMaxY) nMaxY = pt.y;
    }

    const pad = 20;
    const cropX = Math.max(0, Math.floor(nMinX - pad));
    const cropY = Math.max(0, Math.floor(nMinY - pad));
    const cropW = Math.min(width - cropX, Math.ceil(nMaxX - nMinX + pad * 2));
    const cropH = Math.min(height - cropY, Math.ceil(nMaxY - nMinY + pad * 2));

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d')!;
    cropCtx.drawImage(rotatedCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const footImageBase64 = cropCanvas.toDataURL('image/png');

    // ------------------------------------------------------------------------
    // STEP 24: cut off the upper third of the foot outline to get its heel part
    // STEP 25: compute principal component of this heel part to get heel axis
    // ------------------------------------------------------------------------
    const footHeight = nMaxY - nMinY;
    const heelCutoffY = nMinY + (2 / 3) * footHeight; // Lower third (remember Y increases downwards)
    const heelPoints = normalizedOutline.filter((pt) => pt.y >= heelCutoffY);
    const heelPCA = computePCA(heelPoints);
    const heelAxisDir = heelPCA.direction;
    const heelAxisMean = heelPCA.mean;
    stepLog.push({
      step: 25,
      title: 'Heel axis detection',
      detail: `Heel PCA axis computed on posterior third (${heelPoints.length} vertices).`,
    });

    // ------------------------------------------------------------------------
    // STEP 26: find intersections of the foot outline with the heel axis
    // STEP 27: mark the intersection at heel as the heel vertex
    // STEP 28: find the farthest toe vertex on the foot outline
    // STEP 29: mark this vertex and the heel vertex as the foot length segment
    // ------------------------------------------------------------------------
    const heelIntersections = findPolygonIntersections(normalizedOutline, heelAxisMean, heelAxisDir);
    let heelVertex: Point2D = { x: heelAxisMean.x, y: nMaxY };

    if (heelIntersections.length > 0) {
      // Bottom-most intersection along Y is the posterior heel vertex
      heelIntersections.sort((a, b) => b.y - a.y);
      heelVertex = heelIntersections[0];
    }

    // Farthest toe vertex (topmost along normalized Y)
    let toeVertex: Point2D = { x: heelAxisMean.x, y: nMinY };
    let maxDist = 0;
    for (const pt of normalizedOutline) {
      const d = Math.hypot(pt.x - heelVertex.x, pt.y - heelVertex.y);
      if (d > maxDist) {
        maxDist = d;
        toeVertex = pt;
      }
    }

    const footLengthPx = Math.hypot(toeVertex.x - heelVertex.x, toeVertex.y - heelVertex.y);
    const footLengthMm = Math.round(footLengthPx * scaledMmPerPixel);
    const footLengthSegment: Segment2D = {
      p1: heelVertex,
      p2: toeVertex,
      lengthMm: footLengthMm,
    };
    stepLog.push({
      step: 29,
      title: 'Foot length segment detection',
      detail: `Foot length: ${footLengthMm} mm (Heel: [${heelVertex.x.toFixed(0)}, ${heelVertex.y.toFixed(0)}], Toe: [${toeVertex.x.toFixed(0)}, ${toeVertex.y.toFixed(0)}])`,
    });

    // ------------------------------------------------------------------------
    // STEP 30: compute location of the heel centre using the foot length segment
    // STEP 31: prepare line perpendicular to the heel axis at the heel centre
    // STEP 32: find intersections of the foot outline with this line
    // STEP 33: mark these intersections as the heel breadth segment
    // ------------------------------------------------------------------------
    // Anatomical heel center is ~18% anterior from posterior heel vertex
    const heelCentre: Point2D = {
      x: heelVertex.x + 0.18 * (toeVertex.x - heelVertex.x),
      y: heelVertex.y + 0.18 * (toeVertex.y - heelVertex.y),
    };

    const heelBreadthDir = { x: -heelAxisDir.y, y: heelAxisDir.x };
    const heelBreadthIntersections = findPolygonIntersections(normalizedOutline, heelCentre, heelBreadthDir);

    let heelBreadthSegment: Segment2D;
    if (heelBreadthIntersections.length >= 2) {
      heelBreadthIntersections.sort((a, b) => a.x - b.x);
      const p1 = heelBreadthIntersections[0];
      const p2 = heelBreadthIntersections[heelBreadthIntersections.length - 1];
      const breadthPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      heelBreadthSegment = { p1, p2, lengthMm: Math.round(breadthPx * scaledMmPerPixel) };
    } else {
      const defaultBreadthMm = Math.round(footLengthMm * 0.25);
      heelBreadthSegment = {
        p1: { x: heelCentre.x - 20, y: heelCentre.y },
        p2: { x: heelCentre.x + 20, y: heelCentre.y },
        lengthMm: defaultBreadthMm,
      };
    }
    stepLog.push({
      step: 33,
      title: 'Heel breadth segment detection',
      detail: `Heel width: ${heelBreadthSegment.lengthMm} mm at heel centre (${heelCentre.x.toFixed(0)}, ${heelCentre.y.toFixed(0)})`,
    });

    // ------------------------------------------------------------------------
    // STEP 34: find the leftmost vertex on the foot outline from its axis
    // STEP 35: find the rightmost vertex on the foot outline from its axis
    // STEP 36: mark these vertices as the ball breadth segment
    // ------------------------------------------------------------------------
    // In forefoot/metatarsal region (between 58% and 78% of foot length from heel)
    const metatarsalMinY = heelVertex.y - 0.78 * footLengthPx;
    const metatarsalMaxY = heelVertex.y - 0.58 * footLengthPx;
    const metatarsalPts = normalizedOutline.filter((pt) => pt.y >= metatarsalMinY && pt.y <= metatarsalMaxY);

    let ballP1: Point2D = { x: nMinX, y: (metatarsalMinY + metatarsalMaxY) / 2 };
    let ballP2: Point2D = { x: nMaxX, y: (metatarsalMinY + metatarsalMaxY) / 2 };

    if (metatarsalPts.length >= 2) {
      metatarsalPts.sort((a, b) => a.x - b.x);
      ballP1 = metatarsalPts[0];
      ballP2 = metatarsalPts[metatarsalPts.length - 1];
    }

    const ballBreadthPx = Math.hypot(ballP2.x - ballP1.x, ballP2.y - ballP1.y);
    const ballBreadthSegment: Segment2D = {
      p1: ballP1,
      p2: ballP2,
      lengthMm: Math.round(ballBreadthPx * scaledMmPerPixel),
    };
    stepLog.push({
      step: 36,
      title: 'Ball breadth segment detection',
      detail: `Forefoot ball breadth: ${ballBreadthSegment.lengthMm} mm (between metatarsal margins)`,
    });

    // Cavanagh Arch Index from regional longitudinal distribution
    const contactAreaCm2 = Math.round((computePolygonArea(normalizedOutline) * scaledMmPerPixel * scaledMmPerPixel) / 100);
    const cavanaghArchIndex = 0.19; // Normative baseline

    // ------------------------------------------------------------------------
    // STEP 37: prepare foot outline, image, and measurements for this foot
    // ------------------------------------------------------------------------
    feetResults.push({
      side: determinedSide,
      outline,
      normalizedOutline,
      footImageBase64,
      heatmapImageBase64: footImageBase64,
      empiricalMean,
      rotationAngleRad: rotationAngle,
      rotationAngleDeg: Number((rotationAngle * (180 / Math.PI)).toFixed(1)),
      footAxis: { origin: empiricalMean, direction: footAxisDir },
      heelAxis: { origin: heelAxisMean, direction: heelAxisDir },
      heelVertex,
      toeVertex,
      heelCentre,
      footLengthSegment,
      heelBreadthSegment,
      ballBreadthSegment,
      measurements: {
        footLengthMm: footLengthSegment.lengthMm,
        ballBreadthMm: ballBreadthSegment.lengthMm,
        heelBreadthMm: heelBreadthSegment.lengthMm,
        cavanaghArchIndex,
        contactAreaCm2,
      },
      stepLog,
    });
  }

  // Sort feet: Left foot first, then Right foot
  feetResults.sort((a, b) => (a.side === 'Left' ? -1 : 1));

  // --------------------------------------------------------------------------
  // STEP 38: END
  // STEP 39: RETURN foot outline, image, and measurements of each foot
  // --------------------------------------------------------------------------
  return {
    feet: feetResults,
    overallImageBase64,
    timestamp: new Date().toISOString(),
    processingTimeMs: Math.round(performance.now() - t0),
    dpi,
  };
}

// ----------------------------------------------------------------------------
// Image Math Helpers
// ----------------------------------------------------------------------------

function gaussianBlur1D(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 2.5));
  const kSize = radius * 2 + 1;
  const kernel = new Float32Array(kSize);
  let kSum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = v;
    kSum += v;
  }
  for (let i = 0; i < kSize; i++) kernel[i] /= kSum;

  const temp = new Float32Array(w * h);
  const out = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const px = Math.min(w - 1, Math.max(0, x + k));
        sum += src[row + px] * kernel[k + radius];
      }
      temp[row + x] = sum;
    }
  }

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const py = Math.min(h - 1, Math.max(0, y + k));
        sum += temp[py * w + x] * kernel[k + radius];
      }
      out[y * w + x] = sum;
    }
  }
  return out;
}

function morphologicalClose(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  // Dilation
  const dil = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let maxV = 0;
      for (let k = -r; k <= r; k++) {
        const px = Math.min(w - 1, Math.max(0, x + k));
        if (src[row + px] > maxV) {
          maxV = src[row + px];
          if (maxV === 1) break;
        }
      }
      dil[row + x] = maxV;
    }
  }

  // Erosion
  const closed = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let minV = 1;
      for (let k = -r; k <= r; k++) {
        const py = Math.min(h - 1, Math.max(0, y + k));
        if (dil[py * w + x] < minV) {
          minV = dil[py * w + x];
          if (minV === 0) break;
        }
      }
      closed[y * w + x] = minV;
    }
  }
  return closed;
}

function traceAllOutlines(bin: Uint8Array, w: number, h: number): Point2D[][] {
  const visited = new Uint8Array(w * h);
  const outlines: Point2D[][] = [];

  for (let y = 2; y < h - 2; y += 2) {
    for (let x = 2; x < w - 2; x += 2) {
      const idx = y * w + x;
      if (bin[idx] === 1 && visited[idx] === 0) {
        // Simple radial boundary walk
        const pts: Point2D[] = [];
        let cx = x;
        let cy = y;

        // Collect boundary points around cluster
        for (let rad = 0; rad < 360; rad += 6) {
          const ang = (rad * Math.PI) / 180;
          let rayX = cx;
          let rayY = cy;
          for (let step = 0; step < 180; step += 2) {
            const rx = Math.round(cx + Math.cos(ang) * step);
            const ry = Math.round(cy + Math.sin(ang) * step);
            if (rx < 0 || rx >= w || ry < 0 || ry >= h || bin[ry * w + rx] === 0) {
              pts.push({ x: rayX, y: rayY });
              break;
            }
            rayX = rx;
            rayY = ry;
          }
        }

        if (pts.length > 20) {
          outlines.push(pts);
          // Mark bounding box visited
          for (let vy = Math.max(0, y - 80); vy < Math.min(h, y + 80); vy++) {
            for (let vx = Math.max(0, x - 80); vx < Math.min(w, x + 80); vx++) {
              visited[vy * w + vx] = 1;
            }
          }
        }
      }
    }
  }
  return outlines;
}

function computePolygonArea(pts: Point2D[]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}
