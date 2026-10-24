/**
 * Plantar Pressure Analysis System - Live Edge & Quad Detection Service
 * Real-time Sobel gradient and quadrilateral bounding box detector for camera viewfinders.
 * Operates on downscaled sample frames (e.g. 160x120) with exponential moving average (EMA)
 * smoothing to deliver jitter-free 60fps HUD overlays.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface DetectedQuad {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
  confidence: number; // 0 to 100
  isDetected: boolean;
}

/**
 * Detects paper sheet / Harris Mat outline from downscaled canvas buffer.
 * Coordinates returned are normalized [0.0, 1.0] relative to video container width and height.
 */
export function detectLiveQuadFromCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  previousQuad?: DetectedQuad | null
): DetectedQuad {
  // Safe default bounding box centered in viewfinder frame (A4 paper aspect approx 1:1.414)
  const defaultQuad: DetectedQuad = {
    topLeft: { x: 0.15, y: 0.12 },
    topRight: { x: 0.85, y: 0.12 },
    bottomRight: { x: 0.85, y: 0.88 },
    bottomLeft: { x: 0.15, y: 0.88 },
    confidence: 0,
    isDetected: false,
  };

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // 1. Convert to grayscale luminance array
    const gray = new Float32Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // 2. Fast Sobel Gradient Magnitude pass
    const edges = new Float32Array(width * height);
    let maxEdge = 1;
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x;
        // Horizontal gradient (dx)
        const gx =
          -gray[idx - width - 1] + gray[idx - width + 1] -
          2 * gray[idx - 1] + 2 * gray[idx + 1] -
          gray[idx + width - 1] + gray[idx + width + 1];

        // Vertical gradient (dy)
        const gy =
          -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
          gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];

        const mag = Math.sqrt(gx * gx + gy * gy);
        edges[idx] = mag;
        if (mag > maxEdge) maxEdge = mag;
      }
    }

    // Dynamic threshold based on peak gradient
    const edgeThreshold = Math.max(35, maxEdge * 0.35);

    // 3. Scan candidate rays from the 4 quadrants to detect paper boundary
    const marginX = Math.floor(width * 0.08);
    const marginY = Math.floor(height * 0.08);

    // Detect Top Edge
    let topY = Math.floor(height * 0.12);
    for (let y = marginY; y < height * 0.45; y++) {
      let edgeCount = 0;
      for (let x = Math.floor(width * 0.25); x < width * 0.75; x++) {
        if (edges[y * width + x] > edgeThreshold) edgeCount++;
      }
      if (edgeCount > width * 0.2) {
        topY = y;
        break;
      }
    }

    // Detect Bottom Edge
    let bottomY = Math.floor(height * 0.88);
    for (let y = height - marginY; y > height * 0.55; y--) {
      let edgeCount = 0;
      for (let x = Math.floor(width * 0.25); x < width * 0.75; x++) {
        if (edges[y * width + x] > edgeThreshold) edgeCount++;
      }
      if (edgeCount > width * 0.2) {
        bottomY = y;
        break;
      }
    }

    // Detect Left Edge
    let leftX = Math.floor(width * 0.15);
    for (let x = marginX; x < width * 0.45; x++) {
      let edgeCount = 0;
      for (let y = Math.floor(height * 0.25); y < height * 0.75; y++) {
        if (edges[y * width + x] > edgeThreshold) edgeCount++;
      }
      if (edgeCount > height * 0.2) {
        leftX = x;
        break;
      }
    }

    // Detect Right Edge
    let rightX = Math.floor(width * 0.85);
    for (let x = width - marginX; x > width * 0.55; x--) {
      let edgeCount = 0;
      for (let y = Math.floor(height * 0.25); y < height * 0.75; y++) {
        if (edges[y * width + x] > edgeThreshold) edgeCount++;
      }
      if (edgeCount > height * 0.2) {
        rightX = x;
        break;
      }
    }

    // Validate detected rectangle geometry
    const detectedW = (rightX - leftX) / width;
    const detectedH = (bottomY - topY) / height;

    const isValidArea = detectedW >= 0.4 && detectedW <= 0.95 && detectedH >= 0.45 && detectedH <= 0.95;
    const confidence = isValidArea ? Math.min(98, Math.round((detectedW * detectedH) * 130)) : 25;

    const rawQuad: DetectedQuad = {
      topLeft: { x: leftX / width, y: topY / height },
      topRight: { x: rightX / width, y: topY / height },
      bottomRight: { x: rightX / width, y: bottomY / height },
      bottomLeft: { x: leftX / width, y: bottomY / height },
      confidence,
      isDetected: isValidArea && confidence >= 45,
    };

    // 4. Exponential Moving Average (EMA) smoothing (alpha = 0.35) against jitter
    if (!previousQuad) {
      return rawQuad;
    }

    const alpha = 0.35;
    const smooth = (curr: Point2D, prev: Point2D): Point2D => ({
      x: Math.round((alpha * curr.x + (1 - alpha) * prev.x) * 1000) / 1000,
      y: Math.round((alpha * curr.y + (1 - alpha) * prev.y) * 1000) / 1000,
    });

    return {
      topLeft: smooth(rawQuad.topLeft, previousQuad.topLeft),
      topRight: smooth(rawQuad.topRight, previousQuad.topRight),
      bottomRight: smooth(rawQuad.bottomRight, previousQuad.bottomRight),
      bottomLeft: smooth(rawQuad.bottomLeft, previousQuad.bottomLeft),
      confidence: Math.round(alpha * rawQuad.confidence + (1 - alpha) * previousQuad.confidence),
      isDetected: rawQuad.isDetected || (previousQuad.isDetected && confidence >= 35),
    };
  } catch (err) {
    console.warn('Live edge detection frame warning:', err);
    return defaultQuad;
  }
}
