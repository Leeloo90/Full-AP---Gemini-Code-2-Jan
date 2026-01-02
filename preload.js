
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getAssetUrl: (filePath) => ipcRenderer.invoke('get-asset-url', filePath),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
  pathJoin: (...args) => ipcRenderer.invoke('path-join', ...args),
});
