import { ScannerDevice } from '../types';

export interface ScanAcquisitionResult {
  success: boolean;
  connected: boolean;
  dataUrl?: string;
  filename?: string;
  error?: string;
  deviceName?: string;
}

export interface DiscoveredScanner extends ScannerDevice {
  isDirectCaptureSupported: boolean;
  manufacturer?: string;
  hardwareId?: string;
  isDefault?: boolean;
  isPrinterScanner?: boolean;
  driverType?: string;
}

/**
 * HardwareScannerService: Real device discovery and direct hardware ingestion.
 * 
 * Strict Clinical Data Integrity Policy:
 * 1. Automatically queries and discovers real Windows WIA scanners and installed Win32 printers.
 * 2. Identifies and auto-selects the default printer cum scanner.
 * 3. Never confuses laptop webcams with flatbed optical scanners.
 * 4. Triggers genuine hardware scanning in Electron desktop via Windows WIA automation.
 * 5. Provides structured printer-cum-scanner pairing for web browsers.
 */
class HardwareScannerService {
  private cachedScanners: DiscoveredScanner[] = [];
  private lastEnumeratedAt: number = 0;

  /**
   * Enumerates genuine physical scanner and imaging devices connected to the host system.
   */
  public async enumerateAttachedScanners(forceRefresh = false): Promise<DiscoveredScanner[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedScanners.length > 0 && now - this.lastEnumeratedAt < 3000) {
      return this.cachedScanners;
    }

    const discovered: DiscoveredScanner[] = [];
    const seenIds = new Set<string>();

    // 1. Electron Native OS Hardware Discovery (Windows WIA/Printers, macOS ImageCapture, Linux SANE)
    if (typeof window !== 'undefined' && (window as any).electronAPI?.enumerateScanners) {
      try {
        const electronScanners = await (window as any).electronAPI.enumerateScanners();
        if (Array.isArray(electronScanners)) {
          for (const s of electronScanners) {
            if (s && s.id && !seenIds.has(s.id)) {
              seenIds.add(s.id);
              discovered.push({
                id: s.id,
                name: s.name || 'Flatbed Scanner',
                manufacturer: s.manufacturer || 'System Hardware',
                interface: (s.interface as any) || 'WIA',
                status: s.status === 'Ready' ? 'Ready' : 'Connected',
                maxDpi: s.maxDpi || 4800,
                supportsColor: true,
                supportsDuplex: false,
                isDirectCaptureSupported: true, // Native Electron WIA direct capture supported!
                isDefault: Boolean(s.isDefault),
                isPrinterScanner: Boolean(s.isPrinterScanner),
              });
            }
          }
        }
      } catch (err) {
        console.warn('[HardwareScanner] Electron enumeration error:', err);
      }
    }

    // 2. Saved / Configured Workstation Default Printer cum Scanner (for web browser or offline station)
    const configuredDefault = this.getDefaultPrinterScanner();
    if (configuredDefault && !seenIds.has(configuredDefault.id)) {
      seenIds.add(configuredDefault.id);
      discovered.push({
        ...configuredDefault,
        isDefault: discovered.length === 0 || configuredDefault.isDefault,
      });
    }

    // 3. WebUSB Hardware Discovery (Paired USB flatbed scanners & digitizers)
    if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      try {
        const usbDevices = await (navigator as any).usb.getDevices();
        if (Array.isArray(usbDevices)) {
          for (const u of usbDevices) {
            const name =
              u.productName ||
              u.manufacturerName ||
              `USB Scanner (${u.vendorId.toString(16)}:${u.productId.toString(16)})`;
            const id = `usb-${u.vendorId}-${u.productId}-${u.serialNumber || '0'}`;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              discovered.push({
                id,
                name,
                manufacturer: u.manufacturerName || 'USB Peripheral',
                interface: 'WebUSB',
                status: 'Connected',
                maxDpi: 2400,
                supportsColor: true,
                supportsDuplex: false,
                isDirectCaptureSupported: false,
                isPrinterScanner: true,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[HardwareScanner] WebUSB enumeration error:', err);
      }
    }

    // 4. Web Media Devices Discovery: STRICTLY for Dedicated Optical Scanners / Podoscope ONLY
    // NOTE: Regular webcams are NOT flatbed scanners and must never hijack the scanner workflow!
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');

        for (const v of videoInputs) {
          const label = (v.label || '').toLowerCase();
          const isDedicatedScanner =
            /scanner|podoscope|harris|digitizer|document\s*camera/i.test(label);

          // Only include if explicitly identified as an optical scanner/podoscope hardware
          if (isDedicatedScanner) {
            const id = v.deviceId || 'uvc-' + Math.random().toString(36).slice(2, 7);
            if (!seenIds.has(id)) {
              seenIds.add(id);
              discovered.push({
                id,
                name: v.label || 'Dedicated Optical Scanner / Podoscope',
                manufacturer: 'Medical Imaging Hardware',
                interface: 'Direct Optical / UVC',
                status: 'Ready',
                maxDpi: 1200,
                supportsColor: true,
                supportsDuplex: false,
                isDirectCaptureSupported: true,
                isPrinterScanner: false,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[HardwareScanner] MediaDevices enumeration error:', err);
      }
    }

    // Sort: Default printer-cum-scanner first
    discovered.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

    this.cachedScanners = discovered;
    this.lastEnumeratedAt = now;
    return discovered;
  }

  /**
   * Acquires genuine scan image from hardware scanner via Electron WIA automation or local bridge.
   * STRICT CLINICAL TRUTH POLICY: Zero dummy, random, or sample footprint generation.
   * If physical hardware is offline, disconnected, or unpowered, returns truthful connectivity error.
   */
  public async acquireHardwareScan(
    deviceId?: string,
    options?: {
      dpi?: number;
      colorMode?: 'Color' | 'Grayscale';
      deviceName?: string;
      footSide?: 'Left' | 'Right';
    }
  ): Promise<ScanAcquisitionResult> {
    const side = options?.footSide || 'Left';
    const dpi = options?.dpi || 300;
    const devName = options?.deviceName || 'Calibrated Scanner';

    // 1. Electron Desktop Native Direct Hardware Capture (Windows WIA / SANE / USB)
    if (typeof window !== 'undefined' && (window as any).electronAPI?.acquireScan) {
      try {
        const res = await (window as any).electronAPI.acquireScan({
          deviceId,
          dpi,
          colorMode: options?.colorMode || 'Grayscale',
          deviceName: devName,
        });
        if (res && res.success && res.dataUrl) {
          return {
            success: true,
            connected: true,
            dataUrl: res.dataUrl,
            filename: res.filename || `scan_${side.toLowerCase()}_${Date.now()}.jpg`,
            deviceName: devName,
          };
        } else {
          return {
            success: false,
            connected: false,
            error:
              res?.error ||
              `Scanner "${devName}" is offline or disconnected. Please verify the USB/Wi-Fi connection and ensure the scanner is powered ON.`,
            deviceName: devName,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          connected: false,
          error: `Hardware scanner communication error: ${err.message || 'Device disconnected'}. Please check cable and power.`,
          deviceName: devName,
        };
      }
    }

    // 2. Web Browser: Vite Dev Server Scanner API Endpoint
    if (typeof fetch !== 'undefined') {
      try {
        const resp = await fetch('/api/scanner/acquire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            dpi,
            colorMode: options?.colorMode || 'Grayscale',
            deviceName: devName,
            footSide: side,
          }),
        });
        if (resp.ok) {
          const apiData = await resp.json();
          if (apiData && apiData.success && apiData.dataUrl) {
            return {
              success: true,
              connected: true,
              dataUrl: apiData.dataUrl,
              filename: apiData.filename || `scan_${side.toLowerCase()}_${Date.now()}.jpg`,
              deviceName: devName,
            };
          }
        }
      } catch (e) {
        // Dev server API not available
      }
    }

    // 3. Clinical Truth Enforcement: ZERO DUMMY/RANDOM DATA
    // When no physical device responds or is attached, truthfully report offline status!
    return {
      success: false,
      connected: false,
      error: `Scanner "${devName}" is not responding or disconnected. Please ensure the physical scanner is connected via USB/Wi-Fi, powered ON, and installed on this workstation.`,
      deviceName: devName,
    };
  }

  /**
   * Retrieves configured default printer-cum-scanner for this workstation
   */
  public getDefaultPrinterScanner(): DiscoveredScanner | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('podoload_default_printer_scanner');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.name) return parsed;
      }
    } catch (e) {
      console.warn('Error reading default printer scanner from storage:', e);
    }
    return null;
  }

  /**
   * Saves user-selected default printer-cum-scanner to workstation storage
   */
  public saveDefaultPrinterScanner(device: {
    id?: string;
    name: string;
    manufacturer?: string;
    interface?: string;
  }): DiscoveredScanner {
    const id = device.id || 'printer-' + device.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newScanner: DiscoveredScanner = {
      id,
      name: device.name,
      manufacturer: device.manufacturer || 'System Hardware',
      interface: (device.interface as any) || 'System Printer/Scanner',
      status: 'Ready',
      maxDpi: 1200,
      supportsColor: true,
      supportsDuplex: false,
      isDirectCaptureSupported: typeof window !== 'undefined' && Boolean((window as any).electronAPI?.acquireScan),
      isDefault: true,
      isPrinterScanner: true,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('podoload_default_printer_scanner', JSON.stringify(newScanner));
      } catch (e) {}
    }

    this.enumerateAttachedScanners(true);
    return newScanner;
  }

  /**
   * Clinical printer-cum-scanner presets commonly installed in clinics
   */
  public getCommonPrinterPresets(): Array<{ name: string; brand: string; type: string }> {
    return [
      { name: 'Epson EcoTank / L-Series (L3250 / L3210 / L3150 / L4150)', brand: 'Epson', type: 'All-in-One Printer cum Scanner' },
      { name: 'HP LaserJet / DeskJet Ink Advantage MFP (M140 / 415 / 2700)', brand: 'HP', type: 'All-in-One Printer cum Scanner' },
      { name: 'Canon PIXMA / imageCLASS Multifunction (G2020 / G3010 / MF3010)', brand: 'Canon', type: 'All-in-One Printer cum Scanner' },
      { name: 'Brother MFC / DCP Series Multifunction (L2520D / T520W / T720DW)', brand: 'Brother', type: 'All-in-One Printer cum Scanner' },
      { name: 'Epson Perfection V39 / V19 Flatbed Scanner', brand: 'Epson', type: 'Dedicated Flatbed Optical Scanner' },
      { name: 'Canon CanoScan LiDE 300 / 400 Flatbed Scanner', brand: 'Canon', type: 'Dedicated Flatbed Optical Scanner' },
      { name: 'Generic Windows WIA / TWAIN Flatbed Scanner', brand: 'Windows', type: 'Standard Imaging Device' },
    ];
  }

  /**
   * Prompts user via browser WebUSB picker to pair a physical USB scanner
   */
  public async requestUsbScanner(): Promise<DiscoveredScanner | null> {
    if (typeof navigator === 'undefined' || !('usb' in navigator)) {
      throw new Error(
        'WebUSB is not supported in this browser. Please use Electron Desktop or a WebUSB-compatible browser.'
      );
    }

    try {
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x04a9 }, // Canon
          { vendorId: 0x03f0 }, // HP
          { vendorId: 0x04f9 }, // Brother
          { vendorId: 0x04c5 }, // Fujitsu
          { vendorId: 0x0638 }, // Avision
          { vendorId: 0x07b3 }, // Plustek
        ],
      });

      if (!device) return null;

      const name = device.productName || device.manufacturerName || 'Paired USB Scanner';
      const id = `usb-${device.vendorId}-${device.productId}-${device.serialNumber || '0'}`;
      const newScanner: DiscoveredScanner = {
        id,
        name,
        manufacturer: device.manufacturerName || 'USB Hardware',
        interface: 'WebUSB',
        status: 'Connected',
        maxDpi: 2400,
        supportsColor: true,
        supportsDuplex: false,
        isDirectCaptureSupported: false,
        isPrinterScanner: true,
        isDefault: true,
      };

      this.saveDefaultPrinterScanner(newScanner);
      await this.enumerateAttachedScanners(true);
      return newScanner;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Captures the genuine, uncompressed optical frame from a dedicated UVC / podoscope sensor
   */
  public async acquireDirectOpticalFrame(
    deviceId: string
  ): Promise<{ dataUrl: string; width: number; height: number }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Direct optical streaming is not supported in this environment.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 3840, min: 1280 },
        height: { ideal: 2160, min: 720 },
      },
    });

    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video
            .play()
            .then(() => resolve())
            .catch(reject);
        };
        video.onerror = () =>
          reject(new Error('Failed to play video stream from scanner device.'));
        setTimeout(() => reject(new Error('Hardware scanner stream timed out.')), 6000);
      });

      await new Promise((r) => setTimeout(r, 350));

      const w = video.videoWidth || 1920;
      const h = video.videoHeight || 1080;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { alpha: false })!;
      ctx.drawImage(video, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/png');
      return { dataUrl, width: w, height: h };
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  }

  /**
   * Native file acquisition via Electron if available
   */
  public async openNativeScannerFileDialog(): Promise<{
    dataUrl: string;
    filename: string;
    sizeBytes: number;
  } | null> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openScannerFileDialog) {
      return await (window as any).electronAPI.openScannerFileDialog();
    }
    return null;
  }
}

export const hardwareScannerService = new HardwareScannerService();
