import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import * as handlers from './ipc-handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let server;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Start local HTTP server to serve static files
function startServer() {
  const buildPath = path.join(__dirname, '..', 'build');

  server = http.createServer((req, res) => {
    let pathname = req.url.split('?')[0];
    if (pathname === '/') pathname = '/index.html';

    let filePath = path.join(buildPath, pathname);

    // Check if file exists
    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA fallback - serve index.html for routes
    const indexPath = path.join(buildPath, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(indexPath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve(port);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  });

  // Register IPC handlers
  ipcMain.handle('select-folder', handlers.selectFolder);
  ipcMain.handle('scan-folder', handlers.scanFolder);
  ipcMain.handle('get-repos', handlers.getRepos);
  ipcMain.handle('add-repo', handlers.addRepo);
  ipcMain.handle('remove-repo', handlers.removeRepo);
  ipcMain.handle('fetch-releases', handlers.fetchReleases);
  ipcMain.handle('get-stored-releases', handlers.getStoredReleases);
  ipcMain.handle('get-stored-commits', handlers.getStoredCommits);
  ipcMain.handle('fetch-last-commit', handlers.fetchLastCommit);
  ipcMain.handle('save-github-token', handlers.saveGitHubToken);
  ipcMain.handle('get-github-token', handlers.getStoredGitHubToken);
  ipcMain.handle('remove-github-token', handlers.removeGitHubToken);
  ipcMain.handle('get-rate-limit', handlers.getRateLimit);
  ipcMain.handle('export-data', handlers.exportData);
  ipcMain.handle('import-data', handlers.importData);

  // Update feature handlers
  ipcMain.handle('get-update-folder-path', handlers.getUpdateFolderPath);
  ipcMain.handle('save-update-folder-path', handlers.saveUpdateFolderPath);
  ipcMain.handle('check-uncommitted-changes', handlers.checkUncommittedChanges);
  ipcMain.handle('get-default-branch', handlers.getDefaultBranch);
  ipcMain.handle('checkout-branch', handlers.checkoutBranch);
  ipcMain.handle('pull-updates', handlers.pullUpdates);
  ipcMain.handle('show-message-box', handlers.showMessageBox);
  ipcMain.handle('directory-exists', handlers.directoryExists);
  ipcMain.handle('clone-repo', handlers.cloneRepo);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.startsWith('http://127.0.0.1')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  // Handle navigation events to open external links in browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation within the app (localhost dev or production server)
    if (url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:')) {
      return;
    }
    // Open external URLs in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const isDev = process.env.NODE_ENV === 'development';

  let appUrl;
  if (isDev) {
    appUrl = 'http://localhost:5173';
  } else {
    const port = await startServer();
    appUrl = `http://127.0.0.1:${port}`;
  }

  createWindow();
  mainWindow.loadURL(appUrl);

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      mainWindow.loadURL(appUrl);
    }
  });
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
