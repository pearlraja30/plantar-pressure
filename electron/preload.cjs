// Electron Preload Script for Secure IPC Bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  enumerateScanners: () => ipcRenderer.invoke('scanner:enumerate'),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
});
