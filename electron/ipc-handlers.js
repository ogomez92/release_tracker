import { dialog, app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get data file path
function getDataFilePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'releasetracker', 'data.json');
}

// Get settings file path
function getSettingsFilePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'releasetracker', 'settings.json');
}

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataPath = path.dirname(getDataFilePath());
  try {
    await fs.mkdir(dataPath, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

// Load data from JSON file
async function loadData() {
  await ensureDataDirectory();
  const dataPath = getDataFilePath();

  try {
    const data = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    // If file doesn't exist or is invalid, return default structure
    return {
      repos: [],
      releases: [],
      commits: [],
      lastFetch: null
    };
  }
}

// Save data to JSON file
async function saveData(data) {
  await ensureDataDirectory();
  const dataPath = getDataFilePath();
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Load settings from JSON file
async function loadSettings() {
  await ensureDataDirectory();
  const settingsPath = getSettingsFilePath();

  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    // If file doesn't exist or is invalid, return default structure
    return {
      githubToken: null
    };
  }
}

// Save settings to JSON file
async function saveSettings(settings) {
  await ensureDataDirectory();
  const settingsPath = getSettingsFilePath();
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

// Get GitHub token from settings or environment
async function getGitHubToken() {
  const settings = await loadSettings();
  return settings.githubToken || process.env.GITHUB_TOKEN || null;
}

// Parse GitHub URL from git config
function parseGitHubUrl(url) {
  if (!url) return null;

  // Remove trailing .git if present
  url = url.trim().replace(/\.git$/, '');

  // HTTPS format: https://github.com/owner/repo
  const httpsMatch = url.match(/https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], name: httpsMatch[2] };
  }

  // SSH format: git@github.com:owner/repo
  const sshMatch = url.match(/git@github\.com:([^\/]+)\/([^\/]+)/);
  if (sshMatch) {
    return { owner: sshMatch[1], name: sshMatch[2] };
  }

  return null;
}

// Read git config and extract remote origin URL
async function getGitRemoteUrl(gitDir) {
  const configPath = path.join(gitDir, 'config');

  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const lines = configContent.split('\n');

    let inRemoteOrigin = false;
    for (const line of lines) {
      const trimmed = line.trim();

      // Check if we're in the [remote "origin"] section
      if (trimmed === '[remote "origin"]') {
        inRemoteOrigin = true;
        continue;
      }

      // If we hit another section, stop
      if (inRemoteOrigin && trimmed.startsWith('[')) {
        break;
      }

      // Look for url = ...
      if (inRemoteOrigin && trimmed.startsWith('url')) {
        const match = trimmed.match(/url\s*=\s*(.+)/);
        if (match) {
          return match[1].trim();
        }
      }
    }
  } catch (err) {
    console.error('Error reading git config:', err);
  }

  return null;
}

// Recursively scan directory for .git folders
async function scanDirectoryForGitRepos(dirPath, foundRepos = []) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip common directories that shouldn't be scanned
      if (entry.isDirectory()) {
        if (entry.name === '.git') {
          // Found a git repository
          const remoteUrl = await getGitRemoteUrl(fullPath);
          if (remoteUrl) {
            const parsed = parseGitHubUrl(remoteUrl);
            if (parsed) {
              foundRepos.push({
                owner: parsed.owner,
                name: parsed.name,
                url: `https://github.com/${parsed.owner}/${parsed.name}`,
                path: path.dirname(fullPath)
              });
            }
          }
        } else if (!['node_modules', '.cache', 'dist', 'build', '.svelte-kit'].includes(entry.name)) {
          // Recursively scan subdirectories
          await scanDirectoryForGitRepos(fullPath, foundRepos);
        }
      }
    }
  } catch (err) {
    // Silently ignore permission errors and continue
    console.error('Error scanning directory:', err);
  }

  return foundRepos;
}

// IPC Handler: Select folder
async function selectFolder() {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

// IPC Handler: Scan folder for git repos
async function scanFolder(event, folderPath) {
  const repos = await scanDirectoryForGitRepos(folderPath);
  return repos;
}

// IPC Handler: Get all tracked repos
async function getRepos() {
  const data = await loadData();
  return data.repos;
}

// IPC Handler: Add a repository
async function addRepo(event, owner, name, source) {
  const data = await loadData();

  // Check for duplicates
  const exists = data.repos.find(
    (repo) => repo.owner === owner && repo.name === name
  );

  if (exists) {
    throw new Error('Repository already tracked');
  }

  const newRepo = {
    id: randomUUID(),
    owner,
    name,
    url: `https://github.com/${owner}/${name}`,
    addedAt: new Date().toISOString(),
    source: source || 'manual'
  };

  data.repos.push(newRepo);
  await saveData(data);

  return newRepo;
}

// IPC Handler: Remove a repository
async function removeRepo(event, id) {
  const data = await loadData();

  data.repos = data.repos.filter((repo) => repo.id !== id);
  data.releases = data.releases.filter((release) => release.repoId !== id);

  await saveData(data);
}

// IPC Handler: Fetch latest releases and commits from GitHub using GraphQL
async function fetchReleases() {
  const data = await loadData();

  // Ensure releases and commits arrays exist
  if (!data.releases) {
    data.releases = [];
  }
  if (!data.commits) {
    data.commits = [];
  }

  if (data.repos.length === 0) {
    return [];
  }

  const newReleases = [];
  const newCommits = [];

  try {
    // Build GraphQL query to fetch all repos in a single request
    // Fetch both releases and commits for each repo
    const repoQueries = data.repos.map((repo, index) => {
      return `
        repo${index}: repository(owner: "${repo.owner}", name: "${repo.name}") {
          latestRelease {
            id
            tagName
            name
            publishedAt
            url
            description
          }
          defaultBranchRef {
            target {
              ... on Commit {
                oid
                message
                committedDate
                author {
                  name
                }
                url
              }
            }
          }
        }
      `;
    }).join('\n');

    const query = `
      query {
        ${repoQueries}
      }
    `;

    // Get GitHub token from settings or environment
    const token = await getGitHubToken();

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ReleaseTracker-App',
        // Use stored token or environment variable
        ...(token && { 'Authorization': `bearer ${token}` })
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('GitHub API authentication failed. Check your GITHUB_TOKEN.');
      } else if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded');
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const result = await response.json();

    // Check for GraphQL errors
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(result.errors[0]?.message || 'GraphQL query failed');
    }

    // Process each repository's release and commit
    data.repos.forEach((repo, index) => {
      const repoData = result.data[`repo${index}`];

      // Skip if repo wasn't found
      if (!repoData) {
        console.log(`Repository not found: ${repo.owner}/${repo.name}`);
        return;
      }

      // Process release if available
      if (repoData.latestRelease) {
        const release = repoData.latestRelease;

        // Create release object
        const releaseData = {
          id: randomUUID(),
          repoId: repo.id,
          repoOwner: repo.owner,
          repoName: repo.name,
          tagName: release.tagName,
          name: release.name || release.tagName,
          publishedAt: release.publishedAt,
          htmlUrl: release.url,
          body: release.description || '',
          fetchedAt: new Date().toISOString()
        };

        // Check if this release already exists
        const existingIndex = data.releases.findIndex(
          (r) => r.repoId === repo.id && r.tagName === release.tagName
        );

        if (existingIndex >= 0) {
          // Update existing release
          data.releases[existingIndex] = releaseData;
        } else {
          // Add new release
          newReleases.push(releaseData);
        }
      } else {
        console.log(`No releases found for ${repo.owner}/${repo.name}`);
      }

      // Process commit if available (for repos without releases or to update commit data)
      if (repoData.defaultBranchRef?.target) {
        const commit = repoData.defaultBranchRef.target;

        // Create commit object
        const commitData = {
          id: randomUUID(),
          repoId: repo.id,
          repoOwner: repo.owner,
          repoName: repo.name,
          sha: commit.oid,
          message: commit.message,
          date: commit.committedDate,
          author: commit.author.name,
          htmlUrl: commit.url,
          fetchedAt: new Date().toISOString()
        };

        // Check if commit for this repo already exists
        const existingCommitIndex = data.commits.findIndex(
          (c) => c.repoId === repo.id
        );

        if (existingCommitIndex >= 0) {
          // Update existing commit
          data.commits[existingCommitIndex] = commitData;
        } else {
          // Add new commit
          newCommits.push(commitData);
        }
      }
    });

    // Add new releases and commits to data
    data.releases.push(...newReleases);
    data.commits.push(...newCommits);

    // Update last fetch time
    data.lastFetch = new Date().toISOString();

    await saveData(data);

    // Return all releases sorted by published date (newest first)
    return data.releases.sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  } catch (err) {
    console.error('Error fetching releases:', err);
    throw err;
  }
}

// IPC Handler: Get stored releases
async function getStoredReleases() {
  const data = await loadData();

  // Ensure releases array exists
  if (!data.releases) {
    data.releases = [];
  }

  // Sort by published date (newest first)
  return data.releases.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

// IPC Handler: Get stored commits
async function getStoredCommits() {
  const data = await loadData();

  // Ensure commits array exists
  if (!data.commits) {
    data.commits = [];
  }

  // Sort by commit date (newest first)
  return data.commits.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// IPC Handler: Fetch last commit for a repo using GraphQL
async function fetchLastCommit(event, owner, name) {
  try {
    const token = await getGitHubToken();

    const query = `
      query {
        repository(owner: "${owner}", name: "${name}") {
          defaultBranchRef {
            target {
              ... on Commit {
                oid
                message
                committedDate
                author {
                  name
                }
                url
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ReleaseTracker-App',
        ...(token && { 'Authorization': `bearer ${token}` })
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('GitHub API authentication failed. Check your GitHub token.');
      } else if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded');
      }
      throw new Error(`Failed to fetch commits: ${response.statusText}`);
    }

    const result = await response.json();

    // Check for GraphQL errors
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(result.errors[0]?.message || 'GraphQL query failed');
    }

    // Check if repository and commit exist
    if (!result.data?.repository?.defaultBranchRef?.target) {
      throw new Error('Repository not found or no commits available');
    }

    const commit = result.data.repository.defaultBranchRef.target;

    return {
      sha: commit.oid,
      message: commit.message,
      date: commit.committedDate,
      author: commit.author.name,
      htmlUrl: commit.url
    };
  } catch (err) {
    console.error(`Error fetching last commit for ${owner}/${name}:`, err);
    throw err;
  }
}

// IPC Handler: Save GitHub token
async function saveGitHubToken(event, token) {
  const settings = await loadSettings();
  settings.githubToken = token;
  await saveSettings(settings);
}

// IPC Handler: Get GitHub token (return stored token, not env var)
async function getStoredGitHubToken() {
  const settings = await loadSettings();
  return settings.githubToken || null;
}

// IPC Handler: Remove GitHub token
async function removeGitHubToken() {
  const settings = await loadSettings();
  settings.githubToken = null;
  await saveSettings(settings);
}

// IPC Handler: Get rate limit status from GitHub
async function getRateLimit() {
  try {
    const token = await getGitHubToken();

    const response = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'User-Agent': 'ReleaseTracker-App',
        ...(token && { 'Authorization': `bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch rate limit');
    }

    const data = await response.json();
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: data.rate.reset.toString(),
      used: data.rate.used
    };
  } catch (err) {
    console.error('Error fetching rate limit:', err);
    throw err;
  }
}

// IPC Handler: Export data to file
async function exportData() {
  try {
    const data = await loadData();

    const result = await dialog.showSaveDialog({
      title: 'Export Release Tracker Data',
      defaultPath: `releasetracker-export-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false };
    }

    await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8');

    return {
      success: true,
      path: result.filePath
    };
  } catch (err) {
    console.error('Error exporting data:', err);
    throw err;
  }
}

// IPC Handler: Import data from file
async function importData() {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Import Release Tracker Data',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: 'Import cancelled' };
    }

    const filePath = result.filePaths[0];
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const importedData = JSON.parse(fileContent);

    // Validate imported data structure
    if (!importedData.repos || !Array.isArray(importedData.repos)) {
      throw new Error('Invalid data format: missing repos array');
    }

    if (!importedData.releases || !Array.isArray(importedData.releases)) {
      throw new Error('Invalid data format: missing releases array');
    }

    // Load current data and merge
    const currentData = await loadData();

    // Merge repos (avoid duplicates based on owner/name)
    const existingRepoKeys = new Set(
      currentData.repos.map(r => `${r.owner}/${r.name}`)
    );

    const newRepos = importedData.repos.filter(
      r => !existingRepoKeys.has(`${r.owner}/${r.name}`)
    );

    currentData.repos.push(...newRepos);

    // Merge releases (avoid duplicates based on repoId/tagName)
    const existingReleaseKeys = new Set(
      currentData.releases.map(r => `${r.repoId}-${r.tagName}`)
    );

    const newReleases = importedData.releases.filter(
      r => !existingReleaseKeys.has(`${r.repoId}-${r.tagName}`)
    );

    currentData.releases.push(...newReleases);

    // Save merged data
    await saveData(currentData);

    return {
      success: true,
      repoCount: newRepos.length,
      releaseCount: newReleases.length
    };
  } catch (err) {
    console.error('Error importing data:', err);
    throw err;
  }
}

// IPC Handler: Get update folder path from settings
async function getUpdateFolderPath() {
  const settings = await loadSettings();
  return settings.updateFolderPath || null;
}

// IPC Handler: Save update folder path to settings
async function saveUpdateFolderPath(event, folderPath) {
  const settings = await loadSettings();
  settings.updateFolderPath = folderPath;
  await saveSettings(settings);
}

// IPC Handler: Check for uncommitted changes in a repo
async function checkUncommittedChanges(event, repoPath) {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath });
    return {
      hasChanges: stdout.trim().length > 0,
      changes: stdout.trim()
    };
  } catch (err) {
    const stderr = err.stderr || '';
    const message = stderr.trim() || err.message || 'Failed to check git status';
    throw new Error(message);
  }
}

// IPC Handler: Get default branch name for a repo
async function getDefaultBranch(event, repoPath) {
  try {
    // Try to get the default branch from origin/HEAD
    const { stdout } = await execAsync(
      'git symbolic-ref refs/remotes/origin/HEAD',
      { cwd: repoPath }
    );
    // Output is like "refs/remotes/origin/main" - extract branch name
    const match = stdout.trim().match(/refs\/remotes\/origin\/(.+)/);
    if (match) {
      return match[1];
    }
  } catch {
    // symbolic-ref failed, try fallback methods
  }

  // Fallback: try common branch names
  try {
    await execAsync('git rev-parse --verify origin/main', { cwd: repoPath });
    return 'main';
  } catch {
    // main doesn't exist
  }

  try {
    await execAsync('git rev-parse --verify origin/master', { cwd: repoPath });
    return 'master';
  } catch {
    // master doesn't exist either
  }

  throw new Error('Could not determine default branch');
}

// IPC Handler: Checkout to a specific branch
async function checkoutBranch(event, repoPath, branchName) {
  try {
    await execAsync(`git checkout ${branchName}`, { cwd: repoPath });
    return { success: true };
  } catch (err) {
    const stderr = err.stderr || '';
    const message = stderr.trim() || err.message || `Failed to checkout ${branchName}`;
    throw new Error(message);
  }
}

// IPC Handler: Pull updates from remote
async function pullUpdates(event, repoPath) {
  try {
    const { stdout, stderr } = await execAsync('git pull', {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });
    const output = stdout.trim() || stderr.trim();
    return {
      success: true,
      output: output,
      upToDate: output.includes('Already up to date') || output.includes('Already up-to-date')
    };
  } catch (err) {
    const stderr = err.stderr || '';
    let message = stderr.trim() || err.message || 'Failed to pull updates';

    // Make auth errors more user-friendly
    if (message.includes('could not read Username') || message.includes('Authentication failed')) {
      message = 'Authentication required. Add a GitHub token in Settings.';
    }

    // Make network errors clearer
    if (message.includes('Connection was reset') || message.includes('Could not resolve host')) {
      message = 'Network error: ' + message;
    }

    throw new Error(message);
  }
}

// IPC Handler: Show message box dialog
async function showMessageBox(event, options) {
  const result = await dialog.showMessageBox(options);
  return { response: result.response };
}

// IPC Handler: Check if a directory exists
async function directoryExists(event, dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// IPC Handler: Clone a git repository
async function cloneRepo(event, repoUrl, targetPath) {
  try {
    // Ensure parent directory exists
    const parentDir = path.dirname(targetPath);
    await fs.mkdir(parentDir, { recursive: true });

    // Get GitHub token for authenticated cloning (needed for private repos)
    const token = await getGitHubToken();

    // Build clone URL with token if available
    let cloneUrl = repoUrl;
    if (token && repoUrl.includes('github.com')) {
      // Convert https://github.com/owner/repo to https://token@github.com/owner/repo
      cloneUrl = repoUrl.replace('https://github.com', `https://${token}@github.com`);
    }

    // Clone the repository (disable prompts to avoid hanging)
    const { stdout, stderr } = await execAsync(
      `git clone "${cloneUrl}" "${targetPath}"`,
      {
        cwd: parentDir,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      }
    );
    return {
      success: true,
      output: stdout.trim() || stderr.trim()
    };
  } catch (err) {
    // Extract the actual git error message from stderr
    const stderr = err.stderr || '';
    let message = stderr.trim() || err.message || 'Unknown clone error';

    // Clean up error message - remove "Cloning into..." line
    message = message.split('\n').filter(line => !line.startsWith('Cloning into')).join('\n').trim();

    // Make auth errors more user-friendly
    if (message.includes('could not read Username') || message.includes('Authentication failed')) {
      message = 'Authentication required. Add a GitHub token in Settings for private repos.';
    }

    throw new Error(message);
  }
}

export {
  selectFolder,
  scanFolder,
  getRepos,
  addRepo,
  removeRepo,
  fetchReleases,
  getStoredReleases,
  getStoredCommits,
  fetchLastCommit,
  saveGitHubToken,
  getStoredGitHubToken,
  removeGitHubToken,
  getRateLimit,
  exportData,
  importData,
  getUpdateFolderPath,
  saveUpdateFolderPath,
  checkUncommittedChanges,
  getDefaultBranch,
  checkoutBranch,
  pullUpdates,
  showMessageBox,
  directoryExists,
  cloneRepo
};
