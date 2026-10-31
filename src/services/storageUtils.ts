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
