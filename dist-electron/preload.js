const { contextBridge, ipcRenderer } = require('electron');

/**
 * The contextBridge ensures that the React frontend cannot
 * access Node.js primitives directly, protecting the user's system.
 * This establishes the 'window.electron' object in the renderer process.
 */
contextBridge.exposeInMainWorld('electron', {
  // --- Media & Protocol Handlers ---

  /**
   * Converts a physical system path into a 'media-file://' URL
   * that the <video> tag can actually play.
   */
  getAssetUrl: (filePath) => ipcRenderer.invoke('get-asset-url', filePath),

  // --- File System Operations ---

  /**
   * Opens a native OS folder picker.
   * Returns the absolute path of the selected folder.
   */
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  /**
   * NEW: Opens a native file picker for specific metadata files.
   * Allows multi-selection of specific file types (xml, srt, csv, etc.)
   */
  selectFiles: (extensions) => ipcRenderer.invoke('select-files', extensions),

  /**
   * Scans a directory for filenames.
   * Used during ingest to index media or reconnect offline clips.
   */
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),

  /**
   * Reads a file from the filesystem and returns its content as a UTF-8 string.
   * Required for parsing DaVinci CSVs, XMEML syncs, and SRT transcripts.
   */
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  /**
   * Utility to join path segments correctly based on the OS (Windows vs Mac).
   */
  pathJoin: (...args) => ipcRenderer.invoke('path-join', ...args),

  // --- App State & Navigation ---

  /**
   * Listen for window-level events like 'Deep Focus' triggers.
   * Used to communicate from the Main process back to the React UI.
   */
  onDeepFocusToggle: (callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on('toggle-deep-focus', subscription);
    return () => ipcRenderer.removeListener('toggle-deep-focus', subscription);
  },
});