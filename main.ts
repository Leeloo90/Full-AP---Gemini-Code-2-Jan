import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 1. Handling __dirname in ESM environment [cite: 341-343]
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const MEDIA_PROTOCOL = 'media-file';

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#0A0A0A', // Deepest background for "Clean Laboratory" aesthetic [cite: 350, 2661]
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // Ensure this points to your compiled preload file [cite: 352]
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the app from the Vite dev server or the production build [cite: 359-366]
  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  /**
   * CRITICAL: Register the Media Protocol
   * Bypasses browser security to allow local 4K video playback [cite: 7, 370-373].
   */
  protocol.registerFileProtocol(MEDIA_PROTOCOL, (request, callback) => {
    const url = request.url.replace(`${MEDIA_PROTOCOL}://`, '');
    try {
      const decodedPath = decodeURIComponent(url);
      
      // Windows path fix: Remove leading slash if it exists (e.g., /C:/ becomes C:/) [cite: 378-381]
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

// --- IPC HANDLERS (The Bridge to Native OS) [cite: 396-421] ---

/**
 * Opens a native OS folder picker.
 */
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({ 
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Media Root Folder'
  });
  return result.canceled ? null : result.filePaths[0];
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