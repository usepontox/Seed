const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

    // Printer API
    getPrinters: () => ipcRenderer.invoke('printer:getPrinters'),
    print: (options) => ipcRenderer.invoke('printer:print', options),

    // Check if running in Electron
    isElectron: true,
});
