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

// Update feature types
export type RepoUpdateStatus = 'pending' | 'checking' | 'cloning' | 'pulling' | 'done' | 'error' | 'skipped';

export interface RepoUpdateState {
	repoPath: string;
	repoName: string;
	status: RepoUpdateStatus;
	message?: string;
	error?: string;
	hasUncommittedChanges?: boolean;
	upToDate?: boolean;
}

export interface UncommittedChangesResult {
	hasChanges: boolean;
	changes: string;
}

export interface CheckoutResult {
	success: boolean;
}

export interface PullResult {
	success: boolean;
	output: string;
	upToDate: boolean;
}

export interface MessageBoxOptions {
	type: 'none' | 'info' | 'error' | 'question' | 'warning';
	message: string;
	title: string;
	buttons: string[];
}

export interface MessageBoxResult {
	response: number;
}

export interface CloneResult {
	success: boolean;
	output: string;
}

// GitHub user repo (from API)
export interface GitHubUserRepo {
	owner: string;
	name: string;
	url: string;
	description: string;
	isPrivate: boolean;
}

// Parsed repo from URL
export interface ParsedRepo {
	owner: string;
	name: string;
	url: string;
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
	// Update feature methods
	getUpdateFolderPath: () => Promise<string | null>;
	saveUpdateFolderPath: (path: string) => Promise<void>;
	checkUncommittedChanges: (repoPath: string) => Promise<UncommittedChangesResult>;
	getDefaultBranch: (repoPath: string) => Promise<string>;
	checkoutBranch: (repoPath: string, branch: string) => Promise<CheckoutResult>;
	discardChanges: (repoPath: string) => Promise<CheckoutResult>;
	pullUpdates: (repoPath: string) => Promise<PullResult>;
	showMessageBox: (options: MessageBoxOptions) => Promise<MessageBoxResult>;
	directoryExists: (dirPath: string) => Promise<boolean>;
	cloneRepo: (repoUrl: string, targetPath: string) => Promise<CloneResult>;
	// Add by username/URL methods
	fetchUserRepos: (username: string) => Promise<GitHubUserRepo[]>;
	fetchReposFromUrl: (url: string) => Promise<ParsedRepo[]>;
}

// Global window interface extension for TypeScript
declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
