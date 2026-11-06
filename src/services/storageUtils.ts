/**
 * Safe Browser Storage Utility
 * Prevents QuotaExceededError crashes by catching storage errors,
 * purging bloated legacy cache keys, and enforcing lightweight payload storage in localStorage.
 * Full clinical data, scans, heatmaps, and audit logs are securely stored in IndexedDB (PodoPressDB).
 */

export function stripHeavyCasePayloads(c: any): any {
  if (!c) return c;
  return {
    ...c,
    // Clear heavy base64 strings (1MB - 3MB each) from localStorage mirror.
    // Full high-resolution raw scans & heatmaps are safely stored in IndexedDB!
    rawScanDataUrl: '',
    processedHeatMapDataUrl: '',
    rightRawScanDataUrl: '',
    rightProcessedHeatMapDataUrl: '',
    heatmapDataUrl: '',
  };
}

export const safeStorage = {
  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      console.warn(`[SafeStorage] Failed to write key "${key}" to localStorage:`, e?.name || e);
      // If quota exceeded, purge non-essential heavy mirrors (e.g. ppa-cases in localStorage)
      if (e?.name === 'QuotaExceededError' || e?.code === 22 || (e?.message && e.message.includes('quota'))) {
        try {
          // Remove bloated cases mirror from localStorage to reclaim quota immediately
          localStorage.removeItem('ppa-cases');
          // If the key that failed was not ppa-cases, retry saving it now that quota is freed
          if (key !== 'ppa-cases') {
            localStorage.setItem(key, value);
            return true;
          }
        } catch {
          // Fallback safely
        }
      }
      return false;
    }
  },

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

/**
 * Genuine FIPS 180-4 SHA-256 hash computation for 21 CFR Part 11 integrity audits.
 * Produces deterministic 64-character lowercase hex digest.
 */
export function computeSha256(asciiStr: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = asciiStr.length * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  asciiStr += '\x80';
  while ((asciiStr.length % 64) - 56) asciiStr += '\x00';
  for (i = 0; i < asciiStr.length; i++) {
    j = asciiStr.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 =
        hash[7] +
        (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
        ch +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 =
        (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;

      hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

