import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * 1. Handling __dirname in ESM environment.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const MEDIA_PROTOCOL = 'media-file';

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#0A0A0A', // Deepest background for "Clean Laboratory" aesthetic.
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      /**
       * Ensure this points to your compiled preload file.
       * In the build-electron step, preload.js is copied into the same directory as main.js.
       */
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  /**
   * Load the app from the Vite dev server or the production build.
   */
  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!);
    win.webContents.openDevTools();
  } else {
    // Production path points to the compiled frontend in the dist folder.
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  /**
   * CRITICAL: Register the Media Protocol.
   * Bypasses browser security to allow local 4K video playback.
   * This allows <video src="media-file://path/to/video.mp4"> to function.
   */
  protocol.registerFileProtocol(MEDIA_PROTOCOL, (request, callback) => {
    const url = request.url.replace(`${MEDIA_PROTOCOL}://`, '');
    try {
      const decodedPath = decodeURIComponent(url);
      
      /**
       * Windows path fix: Remove leading slash if it exists (e.g., /C:/ becomes C:/).
       */
      const filePath = process.platform === 'win32' && decodedPath.startsWith('/')
        ? decodedPath.substring(1)
        : decodedPath;

      callback({ path: path.normalize(filePath) });
    } catch (error) {
      console.error('Protocol Error:', error);
      callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC HANDLERS (The Bridge to Native OS) ---

/**
 * Opens a native OS folder picker.
 * Returns the absolute path of the selected directory or null if canceled.
 */
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({ 
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Media Root Folder'
  });
  return result.canceled ? null : result.filePaths[0];
});

/**
 * NEW: Opens a native file picker for specific metadata files.
 * Allows multi-selection of XML, SRT, SRTX, and CSV files.
 */
ipcMain.handle('select-files', async (_, extensions: string[]) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Metadata & Sync', extensions: extensions }
    ],
    title: 'Select Metadata/Sync Files'
  });
  return result.canceled ? [] : result.filePaths;
});

/**
 * Converts a physical system path into a 'media-file://' URL.
 */
ipcMain.handle('get-asset-url', async (_, filePath: string) => {
  return `${MEDIA_PROTOCOL}://${filePath}`;
});

/**
 * Scans a directory for filenames to populate the Smart Vault.
 */
ipcMain.handle('list-files', async (_, dirPath: string) => {
  try {
    return fs.readdirSync(dirPath);
  } catch (e) {
    console.error('Failed to list files:', e);
    return [];
  }
});

/**
 * Utility to join path segments correctly based on the OS.
 */
ipcMain.handle('path-join', async (_, ...args: string[]) => {
  return path.join(...args);
});

/**
 * Reads a file from the filesystem and returns its content as a UTF-8 string.
 * This is critical for parsing CSV, XMEML, and SRT metadata.
 */
ipcMain.handle('read-file', async (_, filePath: string) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error(`Failed to read file ${filePath}:`, e);
    throw e; // Re-throw to be handled by the renderer process.
  }
});