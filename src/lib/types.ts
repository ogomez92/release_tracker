// Repository tracking types
export interface TrackedRepo {
	id: string;
	owner: string;
	name: string;
	url: string;
	addedAt: string;
	source: 'folder' | 'manual';
}

// GitHub release types
export interface Release {
	id: string;
	repoId: string;
	repoOwner: string;
	repoName: string;
	tagName: string;
	name: string;
	publishedAt: string;
	htmlUrl: string;
	body: string;
	fetchedAt?: string;
}

// Scanned git repository (before adding to tracked repos)
export interface ScannedGitRepo {
	owner: string;
	name: string;
	url: string;
	path: string;
}

// Last commit information
export interface LastCommit {
	sha: string;
	message: string;
	date: string;
	author: string;
	htmlUrl: string;
}

// Stored commit (includes repo information)
export interface StoredCommit {
	id: string;
	repoId: string;
	repoOwner: string;
	repoName: string;
	sha: string;
	message: string;
	date: string;
	author: string;
	htmlUrl: string;
	fetchedAt: string;
}

// Rate limit information
export interface RateLimit {
	limit: number;
	remaining: number;
	reset: string;
	used: number;
}

// Export/Import result
export interface ExportResult {
	success: boolean;
	path?: string;
}

export interface ImportResult {
	success: boolean;
	message?: string;
	repoCount?: number;
	releaseCount?: number;
}

// Electron API exposed via preload script
export interface ElectronAPI {
	selectFolder: () => Promise<string | null>;
	scanFolder: (path: string) => Promise<ScannedGitRepo[]>;
	getRepos: () => Promise<TrackedRepo[]>;
	addRepo: (owner: string, name: string, source: 'folder' | 'manual') => Promise<TrackedRepo>;
	removeRepo: (id: string) => Promise<void>;
	fetchReleases: () => Promise<Release[]>;
	getStoredReleases: () => Promise<Release[]>;
	getStoredCommits: () => Promise<StoredCommit[]>;
	fetchLastCommit: (owner: string, name: string) => Promise<LastCommit>;
	saveGitHubToken: (token: string) => Promise<void>;
	getGitHubToken: () => Promise<string | null>;
	removeGitHubToken: () => Promise<void>;
	getRateLimit: () => Promise<RateLimit>;
	exportData: () => Promise<ExportResult>;
	importData: () => Promise<ImportResult>;
}

// Global window interface extension for TypeScript
declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
