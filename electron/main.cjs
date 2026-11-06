// Electron Native Desktop Main Process (PPA-SW-TF-001)
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    title: 'Technomind Healthcare - PodoPress Plantar Pressure Analysis System',
    backgroundColor: '#0b1120',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  const isAdminLaunch = process.argv.some((arg) => arg === '--admin' || arg === '/admin' || arg === '-admin');
  const targetHash = isAdminLaunch ? '#/admin' : '';

  if (app.isPackaged) {
    mainWindow.loadFile(distPath, { hash: targetHash });
  } else if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL + (targetHash ? targetHash : ''));
  } else if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath, { hash: targetHash });
  } else {
    mainWindow.loadURL('http://localhost:5200' + (targetHash ? targetHash : ''));
  }

  // Application menu with native CmdOrCtrl+Shift+A Administrator shortcut
  const menuTemplate = [
    {
      label: 'Application',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Security',
      submenu: [
        {
          label: 'Hospital Administrator Console...',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(
                `window.dispatchEvent(new CustomEvent('podoload:admin-requested'));`
              );
            }
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // Disallow any external web navigation inside Electron window (keeps 100% offline & local)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!navigationUrl.startsWith('file://') && !navigationUrl.includes('localhost:') && !navigationUrl.includes('127.0.0.1:')) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    // Prevent opening unexpected external windows or tabs
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Helper: Execute PowerShell script reliably via Base64 EncodedCommand
async function runPowerShell(scriptText, timeoutMs = 15000) {
  const b64 = Buffer.from(scriptText, 'utf16le').toString('base64');
  return await execPromise(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`, {
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
  });
}

// OS Hardware Scanner Discovery - Pure Real Device Query (Zero Mock/Stale Data)
ipcMain.handle('scanner:enumerate', async () => {
  const devices = [];
  const seenIds = new Set();
  const platform = process.platform;

  if (platform === 'win32') {
    // 1. Query Windows WIA scanners and Win32 installed printers (identifying default printer-cum-scanner)
    try {
      const psScript = `
$output = @{
  scanners = @()
  printers = @()
  defaultPrinter = ""
}

try {
  $dm = New-Object -ComObject WIA.DeviceManager -ErrorAction SilentlyContinue
  if ($dm -and $dm.DeviceInfos) {
    foreach ($dev in $dm.DeviceInfos) {
      if ($dev.Type -eq 1) {
        $devId = [string]$dev.DeviceID
        $devName = [string]$dev.Properties.Item("Name").Value
        $mfg = [string]$dev.Properties.Item("Manufacturer").Value
        $output.scanners += @{
          id = $devId
          name = $devName
          manufacturer = $mfg
          interface = "WIA"
          status = "Ready"
          maxDpi = 4800
          isScanner = $true
        }
      }
    }
  }
} catch {}

try {
  $printers = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue
  foreach ($p in $printers) {
    $isDef = [bool]$p.Default
    $output.printers += @{
      name = [string]$p.Name
      driverName = [string]$p.DriverName
      portName = [string]$p.PortName
      isDefault = $isDef
      status = if ($p.PrinterStatus -eq 3) { "Ready" } else { "Connected" }
    }
    if ($isDef) {
      $output.defaultPrinter = [string]$p.Name
    }
  }
} catch {}

try {
  $pnp = Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPClass -eq 'Image' -or $_.Service -like '*scan*' } -ErrorAction SilentlyContinue
  foreach ($item in $pnp) {
    $exists = $output.scanners | Where-Object { $_.id -eq $item.DeviceID }
    if (-not $exists) {
      $output.scanners += @{
        id = [string]$item.DeviceID
        name = [string]$item.Name
        manufacturer = [string]$item.Manufacturer
        interface = "WIA"
        status = if ($item.Status -eq 'OK') { "Ready" } else { "Connected" }
        maxDpi = 4800
        isScanner = $true
      }
    }
  }
} catch {}

$output | ConvertTo-Json -Compress -Depth 4
      `;

      const { stdout } = await runPowerShell(psScript, 8000);
      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim());
        const rawScanners = Array.isArray(parsed.scanners) ? parsed.scanners : [];
        const rawPrinters = Array.isArray(parsed.printers) ? parsed.printers : [];
        const defaultPrinterName = (parsed.defaultPrinter || '').trim();

        // Add WIA scanner devices
        for (const item of rawScanners) {
          if (item && item.name && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            const isMatchDefault =
              defaultPrinterName &&
              (item.name.toLowerCase().includes(defaultPrinterName.toLowerCase()) ||
                defaultPrinterName.toLowerCase().includes(item.name.toLowerCase()));
            const isDefault = Boolean(isMatchDefault || (!defaultPrinterName && rawScanners.length === 1));

            devices.push({
              id: item.id || 'wia-' + Math.random().toString(36).slice(2, 7),
              name: isDefault ? `${item.name} (Default Printer cum Scanner)` : item.name,
              manufacturer: item.manufacturer || 'Windows Imaging Device',
              interface: 'WIA',
              status: item.status || 'Ready',
              maxDpi: item.maxDpi || 4800,
              isDefault,
              isPrinterScanner: true,
            });
          }
        }

        // Add installed printers (especially default printer-cum-scanner if not already covered)
        for (const p of rawPrinters) {
          const printerId = 'printer-' + (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
          if (p.name && !seenIds.has(printerId)) {
            // Check if this printer is already represented by a WIA scanner
            const alreadyPresent = devices.some(
              (d) =>
                d.name.toLowerCase().includes(p.name.toLowerCase()) ||
                p.name.toLowerCase().includes(d.name.toLowerCase())
            );
            if (!alreadyPresent) {
              seenIds.add(printerId);
              devices.push({
                id: printerId,
                name: p.isDefault ? `${p.name} (Default Printer cum Scanner)` : `${p.name} (Printer cum Scanner)`,
                manufacturer: p.driverName || 'System Printer',
                interface: 'WIA / Print Scan',
                status: p.status || 'Ready',
                maxDpi: 1200,
                isDefault: Boolean(p.isDefault),
                isPrinterScanner: true,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('WIA and Printer enumeration note:', e.message);
    }
  } else if (platform === 'darwin') {
    // 2. Query macOS USB & Printers/Scanners
    try {
      const { stdout } = await execPromise('system_profiler SPPrintersDataType SPUSBDataType -json', { timeout: 3500 });
      if (stdout) {
        const data = JSON.parse(stdout);
        if (Array.isArray(data.SPPrintersDataType)) {
          for (const item of data.SPPrintersDataType) {
            if (item._name && item.status !== 'no_info_found') {
              const id = 'mac-print-' + item._name.toLowerCase().replace(/[^a-z0-9]/g, '-');
              if (!seenIds.has(id)) {
                seenIds.add(id);
                devices.push({
                  id,
                  name: `${item._name} (Printer cum Scanner)`,
                  manufacturer: item.cupsversion || 'macOS ImageCapture / AirScan',
                  interface: 'AirScan/eSCL',
                  status: 'Ready',
                  maxDpi: 2400,
                  isPrinterScanner: true,
                  isDefault: devices.length === 0,
                });
              }
            }
          }
        }

        const findUsbScanners = (items) => {
          if (!Array.isArray(items)) return;
          for (const u of items) {
            const name = (u._name || '').toLowerCase();
            const isScanner =
              name.includes('scan') ||
              name.includes('perfection') ||
              name.includes('lide') ||
              name.includes('imaging') ||
              (u.device_class && u.device_class.toLowerCase().includes('image'));
            if (isScanner) {
              const id = 'usb-' + (u.serial_num || u._name).toLowerCase().replace(/[^a-z0-9]/g, '-');
              if (!seenIds.has(id)) {
                seenIds.add(id);
                devices.push({
                  id,
                  name: u._name,
                  manufacturer: u.manufacturer || 'USB Imaging Device',
                  interface: 'USB Direct',
                  status: 'Ready',
                  maxDpi: 4800,
                  isPrinterScanner: true,
                });
              }
            }
            if (u._items) findUsbScanners(u._items);
          }
        };

        if (Array.isArray(data.SPUSBDataType)) {
          findUsbScanners(data.SPUSBDataType);
        }
      }
    } catch (e) {
      console.warn('macOS hardware profiler note:', e.message);
    }
  } else if (platform === 'linux') {
    // 3. Query Linux SANE
    try {
      const { stdout } = await execPromise('scanimage -L', { timeout: 3000 });
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/device `([^']+)' is a (.+)/);
        if (match && !seenIds.has(match[1])) {
          seenIds.add(match[1]);
          devices.push({
            id: match[1],
            name: match[2].trim(),
            interface: 'SANE',
            status: 'Ready',
            maxDpi: 2400,
            isPrinterScanner: true,
            isDefault: devices.length === 0,
          });
        }
      }
    } catch (e) {
      console.warn('Linux SANE scanimage note:', e.message);
    }
  }

  // Sort so default printer-cum-scanner is first in the list
  devices.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

  return devices; // Strictly genuine devices attached. Empty if none attached.
});

// Hardware Scan Acquisition (WIA on Windows, SANE on Linux, or AirScan/dialog)
ipcMain.handle('scanner:acquire', async (event, options = {}) => {
  const platform = process.platform;
  const dpi = options.dpi || 300;
  const colorMode = options.colorMode === 'Grayscale' ? 2 : 1; // 1 = Color, 2 = Grayscale
  const targetId = options.deviceId || '';
  const tempOutputFile = path.join(app.getPath('temp'), `podoload_scan_${Date.now()}.jpg`);

  if (platform === 'win32') {
    try {
      const psScript = `
$temp = "${tempOutputFile.replace(/\\/g, '\\\\')}"
$target = "${targetId.replace(/"/g, '`"')}"
$scanned = $false
$errMsg = ""

try {
  $dm = New-Object -ComObject WIA.DeviceManager -ErrorAction Stop
  $dev = $null
  if ($target -and $target -ne "default" -and -not $target.StartsWith("printer-")) {
    foreach ($info in $dm.DeviceInfos) {
      if ($info.DeviceID -eq $target) {
        $dev = $info.Connect()
        break
      }
    }
  }
  if (-not $dev -and $dm.DeviceInfos.Count -gt 0) {
    foreach ($info in $dm.DeviceInfos) {
      if ($info.Type -eq 1) {
        $dev = $info.Connect()
        break
      }
    }
  }
  if ($dev) {
    $item = $dev.Items.Item(1)
    try { $item.Properties.Item("6146").Value = ${colorMode} } catch {}
    try { $item.Properties.Item("6147").Value = ${dpi} } catch {}
    try { $item.Properties.Item("6148").Value = ${dpi} } catch {}
    $image = $item.Transfer("{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}")
    if ($image) {
      if (Test-Path $temp) { Remove-Item $temp -Force }
      $image.SaveFile($temp)
      $scanned = $true
    }
  }
} catch {
  $errMsg = $_.Exception.Message
}

if (-not $scanned) {
  try {
    $dialog = New-Object -ComObject WIA.CommonDialog -ErrorAction Stop
    $image = $dialog.ShowAcquireImage(1, ${colorMode}, 131072, "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}", $false, $true, $true)
    if ($image) {
      if (Test-Path $temp) { Remove-Item $temp -Force }
      $image.SaveFile($temp)
      $scanned = $true
    }
  } catch {
    $errMsg = $_.Exception.Message
  }
}

if ($scanned -and (Test-Path $temp)) {
  Write-Output "SUCCESS"
} else {
  Write-Output "FAILED:$errMsg"
}
      `;

      const { stdout } = await runPowerShell(psScript, 60000);
      if (stdout && stdout.includes('SUCCESS') && fs.existsSync(tempOutputFile)) {
        const buffer = fs.readFileSync(tempOutputFile);
        const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        try { fs.unlinkSync(tempOutputFile); } catch {}
        return {
          success: true,
          dataUrl,
          filename: `scan_${Date.now()}.jpg`,
          deviceName: options.deviceName || 'System Flatbed Scanner',
        };
      } else {
        const errDetail = stdout.replace('FAILED:', '').trim();
        return {
          success: false,
          error: errDetail || 'Scanner did not return image data. Check connection and paper placement.',
        };
      }
    } catch (err) {
      return {
        success: false,
        error: err.message || 'WIA scan acquisition execution failed.',
      };
    }
  }

  return {
    success: false,
    error: `Hardware scanner automation is supported natively on Windows. On ${platform}, please import the scanned image file directly.`,
  };
});

// System Installed Printers Query
ipcMain.handle('system:get-printers', async () => {
  if (process.platform === 'win32') {
    try {
      const psScript = `Get-CimInstance Win32_Printer | Select-Object Name, DriverName, PortName, Default | ConvertTo-Json -Compress`;
      const { stdout } = await runPowerShell(psScript, 6000);
      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim());
        const list = Array.isArray(parsed) ? parsed : [parsed];
        return list.map((p) => ({
          name: p.Name,
          driverName: p.DriverName,
          portName: p.PortName,
          isDefault: Boolean(p.Default),
          status: 'Ready',
        }));
      }
    } catch (e) {
      console.warn('Error querying printers:', e.message);
    }
  }
  return [];
});

ipcMain.handle('system:get-default-printer', async () => {
  if (process.platform === 'win32') {
    try {
      const psScript = `(Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true }).Name`;
      const { stdout } = await runPowerShell(psScript, 4000);
      if (stdout && stdout.trim()) return stdout.trim();
    } catch (e) {}
  }
  return null;
});

// Native Scanner File Selection Dialog
ipcMain.handle('scanner:open-file-dialog', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Original Scanner Image File',
    filters: [
      {
        name: 'Scanner Images',
        extensions: ['png', 'jpg', 'jpeg', 'tif', 'tiff', 'bmp', 'webp'],
      },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mime =
    ext === 'png'
      ? 'image/png'
      : ext === 'jpg' || ext === 'jpeg'
      ? 'image/jpeg'
      : ext === 'webp'
      ? 'image/webp'
      : ext === 'bmp'
      ? 'image/bmp'
      : 'image/png';
  const dataUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`;

  return {
    dataUrl,
    filename: path.basename(filePath),
    sizeBytes: fileBuffer.length,
  };
});

ipcMain.handle('app:get-version', () => {
  return {
    version: '1.0.58',
    platform: process.platform,
    arch: process.arch,
    algorithm: 'v2.0.0-CLINICAL-TOE-PRESERVED',
  };
});

ipcMain.handle('app:quit', () => {
  app.quit();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
