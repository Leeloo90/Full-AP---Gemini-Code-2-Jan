// preload.js
const { contextBridge, ipcRenderer } = require('electron');

/**
 * The contextBridge ensures that the React frontend cannot
 * access Node.js primitives directly, protecting the user's system .
 */
contextBridge.exposeInMainWorld('electron', {
  // --- Media & Protocol Handlers ---

  /**
   * Converts a physical system path into a 'media-file://' URL
   * that the <video> tag can actually play [cite: 432-434].
   */
  getAssetUrl: (filePath) => ipcRenderer.invoke('get-asset-url', filePath),

  // --- File System Operations ---

  /**
   * Opens a native OS folder picker.
   * Returns the absolute path of the selected folder [cite: 438-440].
   */
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  /**
   * Scans a directory for filenames.
   * Used during ingest to index media or reconnect offline clips [cite: 443-445].
   */
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),

  /**
   * Utility to join path segments correctly based on the OS (Windows vs Mac) .
   */
  pathJoin: (...args) => ipcRenderer.invoke('path-join', ...args),

  // --- App State & Navigation ---

  /**
   * Listen for window-level events like 'Deep Focus' triggers
   * from the native menu [cite: 453-455].
   */
  onDeepFocusToggle: (callback) => ipcRenderer.on('toggle-deep-focus', callback),
});