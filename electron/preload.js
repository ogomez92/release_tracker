import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Folder operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanFolder: (path) => ipcRenderer.invoke('scan-folder', path),

  // Repository management
  getRepos: () => ipcRenderer.invoke('get-repos'),
  addRepo: (owner, name, source) => ipcRenderer.invoke('add-repo', owner, name, source),
  removeRepo: (id) => ipcRenderer.invoke('remove-repo', id),

  // Release fetching
  fetchReleases: () => ipcRenderer.invoke('fetch-releases'),
  getStoredReleases: () => ipcRenderer.invoke('get-stored-releases'),

  // Commit fetching
  getStoredCommits: () => ipcRenderer.invoke('get-stored-commits'),
  fetchLastCommit: (owner, name) => ipcRenderer.invoke('fetch-last-commit', owner, name),

  // Settings & token management
  saveGitHubToken: (token) => ipcRenderer.invoke('save-github-token', token),
  getGitHubToken: () => ipcRenderer.invoke('get-github-token'),
  removeGitHubToken: () => ipcRenderer.invoke('remove-github-token'),
  getRateLimit: () => ipcRenderer.invoke('get-rate-limit'),

  // Data management
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data')
});
