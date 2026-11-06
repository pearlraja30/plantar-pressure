// Electron Preload Script for Secure IPC Bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  enumerateScanners: () => ipcRenderer.invoke('scanner:enumerate'),
  acquireScan: (options) => ipcRenderer.invoke('scanner:acquire', options),
  getPrinters: () => ipcRenderer.invoke('system:get-printers'),
  getDefaultPrinter: () => ipcRenderer.invoke('system:get-default-printer'),
  openScannerFileDialog: () => ipcRenderer.invoke('scanner:open-file-dialog'),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
});
