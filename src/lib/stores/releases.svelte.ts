import type { TrackedRepo, Release, ScannedGitRepo, StoredCommit } from '$lib/types';

class ReleasesStore {
	repos = $state<TrackedRepo[]>([]);
	releases = $state<Release[]>([]);
	commits = $state<StoredCommit[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);
	scanning = $state(false);
	scannedRepos = $state<ScannedGitRepo[]>([]);

	constructor() {
		// Load initial data when store is created
		if (typeof window !== 'undefined' && window.electronAPI) {
			this.loadRepos();
			this.loadStoredReleases();
			this.loadStoredCommits();
		}
	}

	async loadRepos() {
		if (!window.electronAPI) return;

		try {
			this.loading = true;
			this.error = null;
			this.repos = await window.electronAPI.getRepos();
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load repositories';
			console.error('Error loading repos:', err);
		} finally {
			this.loading = false;
		}
	}

	async addRepoManual(owner: string, name: string) {
		if (!window.electronAPI) return;

		try {
			this.loading = true;
			this.error = null;
			const newRepo = await window.electronAPI.addRepo(owner, name, 'manual');
			this.repos = [...this.repos, newRepo];
			return newRepo;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to add repository';
			console.error('Error adding repo:', err);
			throw err;
		} finally {
			this.loading = false;
		}
	}

	async selectFolder() {
		if (!window.electronAPI) return;

		try {
			this.error = null;
			const folderPath = await window.electronAPI.selectFolder();
			return folderPath;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to select folder';
			console.error('Error selecting folder:', err);
			return null;
		}
	}

	async scanFolder(folderPath: string) {
		if (!window.electronAPI) return;

		try {
			this.scanning = true;
			this.error = null;
			this.scannedRepos = await window.electronAPI.scanFolder(folderPath);
			return this.scannedRepos;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to scan folder';
			console.error('Error scanning folder:', err);
			return [];
		} finally {
			this.scanning = false;
		}
	}

	async addScannedRepos(repos: ScannedGitRepo[]) {
		if (!window.electronAPI) return;

		try {
			this.loading = true;
			this.error = null;
			const added: TrackedRepo[] = [];

			for (const repo of repos) {
				try {
					const newRepo = await window.electronAPI.addRepo(repo.owner, repo.name, 'folder');
					added.push(newRepo);
				} catch (err) {
					// Skip duplicates silently
					console.log(`Skipping ${repo.owner}/${repo.name}: already tracked`);
				}
			}

			// Reload repos to get the updated list
			await this.loadRepos();
			this.scannedRepos = [];
			return added;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to add repositories';
			console.error('Error adding scanned repos:', err);
			return [];
		} finally {
			this.loading = false;
		}
	}

	async removeRepo(id: string) {
		if (!window.electronAPI) return;

		try {
			this.loading = true;
			this.error = null;
			await window.electronAPI.removeRepo(id);
			this.repos = this.repos.filter((repo) => repo.id !== id);
			this.releases = this.releases.filter((release) => release.repoId !== id);
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to remove repository';
			console.error('Error removing repo:', err);
		} finally {
			this.loading = false;
		}
	}

	async refreshReleases() {
		if (!window.electronAPI) return;

		try {
			this.loading = true;
			this.error = null;
			this.releases = await window.electronAPI.fetchReleases();
			// Also reload commits since fetchReleases now fetches commits too
			this.commits = await window.electronAPI.getStoredCommits();
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to fetch releases';
			console.error('Error fetching releases:', err);
		} finally {
			this.loading = false;
		}
	}

	async loadStoredReleases() {
		if (!window.electronAPI) return;

		try {
			this.loading = true;
			this.error = null;
			this.releases = await window.electronAPI.getStoredReleases();
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load releases';
			console.error('Error loading releases:', err);
		} finally {
			this.loading = false;
		}
	}

	async loadStoredCommits() {
		if (!window.electronAPI) return;

		try {
			this.loading = true;
			this.error = null;
			this.commits = await window.electronAPI.getStoredCommits();
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load commits';
			console.error('Error loading commits:', err);
		} finally {
			this.loading = false;
		}
	}

	clearError() {
		this.error = null;
	}

	clearScannedRepos() {
		this.scannedRepos = [];
	}
}

export const releasesStore = new ReleasesStore();
