
import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#0A0A0A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('media-file', (request, callback) => {
    const url = request.url.replace('media-file://', '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error('Protocol Error:', error);
    }
  });
  createWindow();
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-asset-url', async (_, filePath: string) => {
  return `media-file://${filePath}`;
});

ipcMain.handle('list-files', async (_, dirPath: string) => {
  try {
    return fs.readdirSync(dirPath);
  } catch (e) {
    return [];
  }
});

ipcMain.handle('path-join', async (_, ...args: string[]) => {
  return path.join(...args);
});
