/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface Window {
  electronAPI?: {
    isDesktop: boolean;
    enumerateScanners: () => Promise<
      Array<{
        id: string;
        name: string;
        interface: string;
        status: string;
        manufacturer?: string;
        maxDpi?: number;
      }>
    >;
    openScannerFileDialog?: () => Promise<{
      dataUrl: string;
      filename: string;
      sizeBytes: number;
    } | null>;
    getAppVersion: () => Promise<{
      version: string;
      platform: string;
      arch: string;
      algorithm: string;
    }>;
  };
}
