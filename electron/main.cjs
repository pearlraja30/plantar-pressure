// Electron Native Desktop Main Process (PPA-SW-TF-001)
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    title: 'Technomind Healthcare - Plantar Pressure Analysis System',
    backgroundColor: '#0b1120',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  const fs = require('fs');

  if (app.isPackaged) {
    mainWindow.loadFile(distPath);
  } else if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5200');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// OS Hardware Scanner IPC Stubs for TWAIN, WIA, SANE
ipcMain.handle('scanner:enumerate', async () => {
  return [
    { id: 'epson-v39', name: 'Epson Perfection V39 II', interface: 'TWAIN 2.4', status: 'Ready', maxDpi: 4800 },
    { id: 'canon-lide', name: 'Canon CanoScan LiDE 400', interface: 'WIA 2.0', status: 'Ready', maxDpi: 2400 },
    { id: 'hp-scanjet', name: 'HP ScanJet Pro 2500 f1', interface: 'AirScan/eSCL', status: 'Ready', maxDpi: 1200 },
    { id: 'fujitsu-fi', name: 'Fujitsu fi-8170', interface: 'SANE', status: 'Ready', maxDpi: 600 },
  ];
});

ipcMain.handle('app:get-version', () => {
  return {
    version: '1.0.0-MED',
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
