/**
 * Impression Detection Service
 * 
 * Performs pixel-by-pixel scanning to autodetect the genuine foot impression boundary
 * on Harris Mat papers and scanner beds, eliminating extraneous borders, blank margins,
 * and scanner frame edges while strictly preserving original pixel data.
 */

export interface ImpressionCropResult {
  hasImpression: boolean;
  originalWidth: number;
  originalHeight: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  croppedDataUrl: string;
  originalDataUrl: string;
}

/**
 * Autodetects the foot impression on an ingested scan or photograph pixel-by-pixel.
 * Crops cleanly to the bounding box with clinical margin padding.
 */
export async function detectAndCropImpression(
  sourceUrl: string,
  paddingPx = 16
): Promise<ImpressionCropResult> {
  return new Promise((resolve) => {
    if (!sourceUrl || typeof window === 'undefined') {
      return resolve({
        hasImpression: false,
        originalWidth: 0,
        originalHeight: 0,
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        croppedDataUrl: sourceUrl,
        originalDataUrl: sourceUrl,
      });
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;

      if (w <= 0 || h <= 0) {
        return resolve({
          hasImpression: false,
          originalWidth: w,
          originalHeight: h,
          bounds: { x: 0, y: 0, width: w, height: h },
          croppedDataUrl: sourceUrl,
          originalDataUrl: sourceUrl,
        });
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return resolve({
          hasImpression: false,
          originalWidth: w,
          originalHeight: h,
          bounds: { x: 0, y: 0, width: w, height: h },
          croppedDataUrl: sourceUrl,
          originalDataUrl: sourceUrl,
        });
      }

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // 1. Build a 256-bin luminance histogram of the image to find the true paper background
      const hist = new Int32Array(256);
      const sampleStepX = Math.max(1, Math.floor(w / 120));
      const sampleStepY = Math.max(1, Math.floor(h / 120));
      let sampleCount = 0;

      for (let y = 0; y < h; y += sampleStepY) {
        const rowOffset = y * w * 4;
        for (let x = 0; x < w; x += sampleStepX) {
          const idx = rowOffset + x * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          hist[lum]++;
          sampleCount++;
        }
      }

      // Find dominant paper background luminance (typically in the brighter range >= 140)
      let maxCount = 0;
      let bgLum = 245;
      for (let l = 140; l < 256; l++) {
        if (hist[l] > maxCount) {
          maxCount = hist[l];
          bgLum = l;
        }
      }

      // Fallback if background is darker (e.g. specialized photo paper)
      if (maxCount < sampleCount * 0.1) {
        for (let l = 0; l < 256; l++) {
          if (hist[l] > maxCount) {
            maxCount = hist[l];
            bgLum = l;
          }
        }
      }

      // Threshold: pixels with significant darkness or chroma contrast against paper
      const deltaThresh = Math.max(22, bgLum * 0.12);

      // 2. Build row & column occupancy profiles
      const rowCounts = new Int32Array(h);
      const colCounts = new Int32Array(w);

      // Scan rows, rejecting full-width perimeter lines (scanner lid borders / shadows)
      for (let y = 0; y < h; y++) {
        const rowOffset = y * w * 4;
        let rowDark = 0;
        for (let x = 0; x < w; x++) {
          const idx = rowOffset + x * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (bgLum - lum > deltaThresh) {
            rowDark++;
          }
        }
        // Reject full-width scanner frame lines (> 75% dark)
        if (rowDark < w * 0.75) {
          rowCounts[y] = rowDark;
        }
      }

      // Scan columns, rejecting full-height perimeter lines
      for (let x = 0; x < w; x++) {
        let colDark = 0;
        for (let y = 0; y < h; y++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (bgLum - lum > deltaThresh) {
            colDark++;
          }
        }
        // Reject full-height scanner frame lines (> 75% dark)
        if (colDark < h * 0.75) {
          colCounts[x] = colDark;
        }
      }

      // Robust minimum pixel thresholds to reject single dust motes (1.5% of dimension)
      const minRowPixels = Math.max(5, Math.floor(w * 0.015));
      const minColPixels = Math.max(5, Math.floor(h * 0.015));

      // Find continuous spans of active rows/columns (allowing small gaps of up to 16px for Harris Mat grids)
      const findLongestActiveSpan = (counts: Int32Array, minThreshold: number, maxGap: number) => {
        const spans: { start: number; end: number; length: number }[] = [];
        let start = -1;
        let lastActive = -1;

        for (let i = 0; i < counts.length; i++) {
          if (counts[i] >= minThreshold) {
            if (start === -1) start = i;
            lastActive = i;
          } else {
            if (start !== -1 && i - lastActive > maxGap) {
              spans.push({ start, end: lastActive, length: lastActive - start + 1 });
              start = -1;
              lastActive = -1;
            }
          }
        }
        if (start !== -1) {
          spans.push({ start, end: lastActive, length: lastActive - start + 1 });
        }

        if (spans.length === 0) return null;
        spans.sort((a, b) => b.length - a.length);
        return spans[0];
      };

      const ySpan = findLongestActiveSpan(rowCounts, minRowPixels, 16);
      const xSpan = findLongestActiveSpan(colCounts, minColPixels, 16);

      // If no valid impression detected or bounding box occupies negligible area
      if (
        !ySpan ||
        !xSpan ||
        xSpan.length < 30 ||
        ySpan.length < 50
      ) {
        return resolve({
          hasImpression: false,
          originalWidth: w,
          originalHeight: h,
          bounds: { x: 0, y: 0, width: w, height: h },
          croppedDataUrl: sourceUrl,
          originalDataUrl: sourceUrl,
        });
      }

      // 3. Add clean clinical padding around the detected foot impression
      const minX = xSpan.start;
      const maxX = xSpan.end;
      const minY = ySpan.start;
      const maxY = ySpan.end;

      const cropX = Math.max(0, minX - paddingPx);
      const cropY = Math.max(0, minY - paddingPx);
      const cropW = Math.min(w - cropX, maxX - minX + 1 + paddingPx * 2);
      const cropH = Math.min(h - cropY, maxY - minY + 1 + paddingPx * 2);

      // Crop canvas directly at full native resolution (1:1 pixel fidelity)
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d')!;
      cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const croppedDataUrl = cropCanvas.toDataURL('image/png');

      resolve({
        hasImpression: true,
        originalWidth: w,
        originalHeight: h,
        bounds: { x: cropX, y: cropY, width: cropW, height: cropH },
        croppedDataUrl,
        originalDataUrl: sourceUrl,
      });
    };

    img.onerror = () => {
      resolve({
        hasImpression: false,
        originalWidth: 0,
        originalHeight: 0,
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        croppedDataUrl: sourceUrl,
        originalDataUrl: sourceUrl,
      });
    };

    img.src = sourceUrl;
  });
}
