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
        isDefault?: boolean;
        isPrinterScanner?: boolean;
      }>
    >;
    acquireScan?: (options?: {
      deviceId?: string;
      dpi?: number;
      colorMode?: 'Color' | 'Grayscale';
      deviceName?: string;
    }) => Promise<{
      success: boolean;
      dataUrl?: string;
      filename?: string;
      deviceName?: string;
      error?: string;
    }>;
    getPrinters?: () => Promise<
      Array<{
        name: string;
        driverName?: string;
        portName?: string;
        isDefault: boolean;
        status?: string;
      }>
    >;
    getDefaultPrinter?: () => Promise<string | null>;
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
