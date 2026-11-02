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

// OS Hardware Scanner Discovery - Pure Real Device Query (Zero Mock/Stale Data)
ipcMain.handle('scanner:enumerate', async () => {
  const devices = [];
  const seenIds = new Set();
  const platform = process.platform;

  if (platform === 'win32') {
    // 1. Query Windows WIA / PnP imaging devices via PowerShell
    try {
      const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPClass -eq 'Image' -or $_.Service -like '*scan*' } | Select-Object -Property DeviceID, Name, Manufacturer, Status | ConvertTo-Json -Compress"`;
      const { stdout } = await execPromise(psCmd, { timeout: 3500 });
      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of list) {
          if (item && item.Name && !seenIds.has(item.DeviceID)) {
            seenIds.add(item.DeviceID);
            devices.push({
              id: item.DeviceID || 'wia-' + Math.random().toString(36).slice(2, 7),
              name: item.Name,
              manufacturer: item.Manufacturer || 'Windows Imaging Device',
              interface: 'WIA',
              status: item.Status === 'OK' ? 'Ready' : 'Connected',
              maxDpi: 4800,
            });
          }
        }
      }
    } catch (e) {
      console.warn('WIA PnP enumeration note:', e.message);
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
                  name: item._name,
                  manufacturer: item.cupsversion || 'macOS ImageCapture / AirScan',
                  interface: 'AirScan/eSCL',
                  status: 'Ready',
                  maxDpi: 2400,
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
          });
        }
      }
    } catch (e) {
      console.warn('Linux SANE scanimage note:', e.message);
    }
  }

  return devices; // Strictly genuine devices attached. Empty if none attached.
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
    version: '1.0.35',
    platform: process.platform,
    arch: process.arch,
    algorithm: 'v2.0.0-CLINICAL-TOE-PRESERVED',
  };
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
