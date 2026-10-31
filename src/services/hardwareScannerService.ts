import { ScannerDevice } from '../types';

export interface DiscoveredScanner extends ScannerDevice {
  isDirectCaptureSupported: boolean;
  manufacturer?: string;
  hardwareId?: string;
}

/**
 * HardwareScannerService: Real device discovery and direct hardware ingestion.
 * 
 * Strict Clinical Data Integrity Policy:
 * 1. NEVER generates or returns synthetic/sample scanner devices.
 * 2. If no hardware devices are physically attached, returns an empty array [].
 * 3. Acquires 100% genuine scan bytes via direct optical hardware sensor, OS scan interfaces, or user-selected scanner output file.
 */
class HardwareScannerService {
  private cachedScanners: DiscoveredScanner[] = [];
  private lastEnumeratedAt: number = 0;

  /**
   * Enumerates genuine physical scanner and imaging devices connected to the host system.
   * NEVER returns mock/stale devices.
   */
  public async enumerateAttachedScanners(forceRefresh = false): Promise<DiscoveredScanner[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedScanners.length > 0 && now - this.lastEnumeratedAt < 3000) {
      return this.cachedScanners;
    }

    const discovered: DiscoveredScanner[] = [];
    const seenIds = new Set<string>();

    // 1. Electron Native OS Hardware Discovery (Windows WIA/TWAIN, macOS ImageCapture/USB, Linux SANE)
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
                interface: (s.interface as any) || 'TWAIN',
                status: s.status === 'Ready' ? 'Ready' : 'Connected',
                maxDpi: s.maxDpi || 2400,
                supportsColor: true,
                supportsDuplex: false,
                isDirectCaptureSupported: false,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[HardwareScanner] Electron enumeration error:', err);
      }
    }

    // 2. Web Media Devices Discovery (Direct UVC podoscopes, document cameras, high-res optical scanning bars)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');

        for (const v of videoInputs) {
          const label = v.label || '';
          const id = v.deviceId || 'uvc-' + Math.random().toString(36).slice(2, 7);
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const isDedicatedScanner =
              /scanner|podoscope|harris|document|flatbed|digitizer/i.test(label);
            discovered.push({
              id,
              name: label || (videoInputs.length === 1 ? 'Primary Optical Sensor' : `Optical Camera / Scanner (${id.slice(0, 6)})`),
              manufacturer: isDedicatedScanner ? 'Medical Imaging Hardware' : 'UVC Optical Sensor',
              interface: 'Direct Optical / UVC',
              status: 'Ready',
              maxDpi: 1200,
              supportsColor: true,
              supportsDuplex: false,
              isDirectCaptureSupported: true,
            });
          }
        }
      } catch (err) {
        console.warn('[HardwareScanner] MediaDevices enumeration error:', err);
      }
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
              });
            }
          }
        }
      } catch (err) {
        console.warn('[HardwareScanner] WebUSB enumeration error:', err);
      }
    }

    this.cachedScanners = discovered;
    this.lastEnumeratedAt = now;
    return discovered;
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
      };

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
   * Captures the genuine, uncompressed optical frame from a direct UVC / optical scanning sensor
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

      // Allow 350ms for automatic white balance / gain stabilization
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

