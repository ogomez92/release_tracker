<script lang="ts">
	import { onMount } from 'svelte';
	import RepoUpdateCard from '$lib/components/RepoUpdateCard.svelte';
	import type { RepoUpdateState, TrackedRepo } from '$lib/types';

	let savedFolderPath = $state<string | null>(null);
	let trackedRepos = $state<TrackedRepo[]>([]);
	let repoStates = $state<RepoUpdateState[]>([]);
	let isLoading = $state(true);
	let isUpdating = $state(false);
	let liveMessage = $state('');
	let updateComplete = $state(false);

	// Build repo path: baseFolder/owner/repoName
	function getRepoPath(baseFolder: string, owner: string, name: string): string {
		// Use forward slashes for path joining, works on Windows too with Node
		return `${baseFolder}/${owner}/${name}`.replace(/\\/g, '/');
	}

	// Summary stats
	let summary = $derived({
		total: repoStates.length,
		cloned: repoStates.filter((r) => r.status === 'done' && r.message?.includes('Cloned')).length,
		updated: repoStates.filter(
			(r) => r.status === 'done' && !r.upToDate && !r.message?.includes('Cloned')
		).length,
		upToDate: repoStates.filter((r) => r.status === 'done' && r.upToDate).length,
		skipped: repoStates.filter((r) => r.status === 'skipped'),
		failed: repoStates.filter((r) => r.status === 'error')
	});

	onMount(async () => {
		// Load tracked repos and saved folder path
		const [repos, path] = await Promise.all([
			window.electronAPI.getRepos(),
			window.electronAPI.getUpdateFolderPath()
		]);
		trackedRepos = repos;
		savedFolderPath = path;

		if (path && repos.length > 0) {
			initializeRepoStates(path, repos);
		}
		isLoading = false;
	});

	function initializeRepoStates(basePath: string, repos: TrackedRepo[]) {
		repoStates = repos.map((repo) => ({
			repoPath: getRepoPath(basePath, repo.owner, repo.name),
			repoName: `${repo.owner}/${repo.name}`,
			status: 'pending' as const
		}));
		updateComplete = false;
	}

	async function handleSelectFolder() {
		const path = await window.electronAPI.selectFolder();
		if (path) {
			savedFolderPath = path;
			await window.electronAPI.saveUpdateFolderPath(path);
			if (trackedRepos.length > 0) {
				initializeRepoStates(path, trackedRepos);
			}
		}
	}

	async function handlePullAll() {
		if (!savedFolderPath || trackedRepos.length === 0) return;

		isUpdating = true;
		updateComplete = false;
		liveMessage = 'Starting update process...';

		// Reset all states to pending
		initializeRepoStates(savedFolderPath, trackedRepos);

		// Process repos sequentially
		for (let i = 0; i < trackedRepos.length; i++) {
			const repo = trackedRepos[i];
			const repoPath = getRepoPath(savedFolderPath, repo.owner, repo.name);
			const repoName = `${repo.owner}/${repo.name}`;
			const repoUrl = repo.url;

			// Update status to checking
			repoStates[i] = { ...repoStates[i], status: 'checking' };
			liveMessage = `Checking ${repoName}...`;

			try {
				// Check if repo directory exists
				const exists = await window.electronAPI.directoryExists(repoPath);

				if (!exists) {
					// Clone the repository
					repoStates[i] = { ...repoStates[i], status: 'cloning' };
					liveMessage = `Cloning ${repoName}...`;

					const cloneResult = await window.electronAPI.cloneRepo(repoUrl, repoPath);

					repoStates[i] = {
						...repoStates[i],
						status: 'done',
						upToDate: false,
						message: 'Cloned successfully'
					};
					liveMessage = `Cloned ${repoName}`;
					continue;
				}

				// Repo exists - check for uncommitted changes
				const statusResult = await window.electronAPI.checkUncommittedChanges(repoPath);

				if (statusResult.hasChanges) {
					// Show dialog that user must acknowledge
					await window.electronAPI.showMessageBox({
						type: 'warning',
						title: 'Uncommitted Changes',
						message: `Repository "${repoName}" has uncommitted changes and will be skipped.\n\nChanges:\n${statusResult.changes.slice(0, 500)}${statusResult.changes.length > 500 ? '\n...' : ''}`,
						buttons: ['OK']
					});

					repoStates[i] = {
						...repoStates[i],
						status: 'skipped',
						hasUncommittedChanges: true,
						message: 'Has uncommitted changes'
					};
					liveMessage = `Skipped ${repoName} - uncommitted changes`;
					continue;
				}

				// Update status to pulling
				repoStates[i] = { ...repoStates[i], status: 'pulling' };
				liveMessage = `Pulling updates for ${repoName}...`;

				// Get default branch
				let defaultBranch: string;
				try {
					defaultBranch = await window.electronAPI.getDefaultBranch(repoPath);
				} catch {
					defaultBranch = 'main'; // Fallback
				}

				// Checkout default branch
				try {
					await window.electronAPI.checkoutBranch(repoPath, defaultBranch);
				} catch (err) {
					// If checkout fails, try to pull anyway
					console.warn(`Checkout to ${defaultBranch} failed:`, err);
				}

				// Pull updates
				const pullResult = await window.electronAPI.pullUpdates(repoPath);

				repoStates[i] = {
					...repoStates[i],
					status: 'done',
					upToDate: pullResult.upToDate,
					message: pullResult.upToDate ? 'Already up to date' : pullResult.output.split('\n')[0]
				};
				liveMessage = pullResult.upToDate
					? `${repoName} is already up to date`
					: `Updated ${repoName}`;
			} catch (err) {
				repoStates[i] = {
					...repoStates[i],
					status: 'error',
					error: err instanceof Error ? err.message : 'Unknown error occurred'
				};
				liveMessage = `Error updating ${repoName}`;
			}
		}

		isUpdating = false;
		updateComplete = true;
		liveMessage = 'Update process complete';
	}
</script>

<svelte:head>
	<title>Update Repos - Release Tracker</title>
</svelte:head>

<h2 id="page-heading" tabindex="-1">Update Repositories</h2>
<p>Clone or pull the latest code for all tracked repositories.</p>

<!-- Live region for screen readers -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
	{liveMessage}
</div>

{#if isLoading}
	<div role="status" aria-live="polite" class="loading-container">
		<span class="loading"></span>
		<span>Loading...</span>
	</div>
{:else}
	<section class="folder-section" aria-labelledby="folder-section-heading">
		<h3 id="folder-section-heading" class="sr-only">Repository Folder</h3>

		{#if savedFolderPath}
			<div class="folder-display">
				<div class="folder-info">
					<strong>Repository Folder:</strong>
					<span class="folder-path">{savedFolderPath}</span>
					<p class="folder-hint">
						Repos will be stored as: <code>{savedFolderPath}/owner/repo</code>
					</p>
				</div>
				<div class="folder-actions">
					<button type="button" onclick={handleSelectFolder} disabled={isUpdating}>
						Change Folder
					</button>
				</div>
			</div>
		{:else}
			<button
				type="button"
				class="primary"
				onclick={handleSelectFolder}
				aria-label="Select folder to store repositories"
			>
				Select Repository Folder
			</button>
			<p class="helper-text">
				Choose a folder where repositories will be stored. Each repo will be cloned as
				<code>folder/owner/repo</code>.
			</p>
		{/if}
	</section>

	{#if trackedRepos.length === 0}
		<p class="empty-state">
			No repositories are being tracked. Add some repos in the
			<a href="/add">Add Repositories</a> tab first.
		</p>
	{:else if savedFolderPath}
		<section class="update-section" aria-labelledby="repos-heading">
			<div class="update-header">
				<h3 id="repos-heading">
					{trackedRepos.length}
					{trackedRepos.length === 1 ? 'Repository' : 'Repositories'} Tracked
				</h3>

				<button
					type="button"
					class="primary"
					onclick={handlePullAll}
					disabled={isUpdating}
					aria-label="Update all {trackedRepos.length} repositories"
				>
					{isUpdating ? 'Updating...' : 'Update All Repos'}
				</button>
			</div>

			{#if updateComplete}
				<div class="summary" role="status" aria-live="polite">
					<h4>Update Summary</h4>
					<ul class="summary-list">
						{#if summary.cloned > 0}
							<li class="summary-cloned">
								<strong>{summary.cloned}</strong> cloned
							</li>
						{/if}
						<li class="summary-updated">
							<strong>{summary.updated}</strong> updated
						</li>
						<li class="summary-uptodate">
							<strong>{summary.upToDate}</strong> up to date
						</li>
						{#if summary.skipped.length > 0}
							<li class="summary-skipped">
								<strong>{summary.skipped.length}</strong> skipped
							</li>
						{/if}
						{#if summary.failed.length > 0}
							<li class="summary-failed">
								<strong>{summary.failed.length}</strong> failed
							</li>
						{/if}
					</ul>

					{#if summary.failed.length > 0}
						<div class="summary-details summary-errors">
							<h5>Errors</h5>
							<ul>
								{#each summary.failed as repo}
									<li>
										<strong>{repo.repoName}</strong>: {repo.error}
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if summary.skipped.length > 0}
						<div class="summary-details summary-warnings">
							<h5>Skipped</h5>
							<ul>
								{#each summary.skipped as repo}
									<li>
										<strong>{repo.repoName}</strong>: {repo.message}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}

			<div class="repo-grid">
				{#each repoStates as repoState, index (repoState.repoPath)}
					<RepoUpdateCard
						{repoState}
						onStateChange={(newState) => {
							repoStates[index] = newState;
						}}
					/>
				{/each}
			</div>
		</section>
	{/if}
{/if}

<style>
	h2 {
		margin-bottom: var(--spacing-sm);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.folder-section {
		margin-top: var(--spacing-lg);
		padding: var(--spacing-lg);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.folder-display {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.folder-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.folder-path {
		font-family: var(--font-family-mono, monospace);
		font-size: var(--font-size-sm);
		padding: var(--spacing-sm);
		background-color: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		word-break: break-all;
	}

	.folder-hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.folder-hint code {
		background-color: var(--color-bg);
		padding: 2px 4px;
		border-radius: 3px;
	}

	.folder-actions {
		display: flex;
		gap: var(--spacing-sm);
	}

	.helper-text {
		margin-top: var(--spacing-sm);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.helper-text code {
		background-color: var(--color-bg);
		padding: 2px 4px;
		border-radius: 3px;
	}

	.loading-container {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-lg);
		padding: var(--spacing-md);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.update-section {
		margin-top: var(--spacing-lg);
	}

	.update-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-md);
		flex-wrap: wrap;
		margin-bottom: var(--spacing-lg);
	}

	.update-header h3 {
		margin: 0;
	}

	.summary {
		margin-bottom: var(--spacing-lg);
		padding: var(--spacing-md);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.summary h4 {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-base);
	}

	.summary-list {
		display: flex;
		gap: var(--spacing-lg);
		flex-wrap: wrap;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.summary-list li {
		font-size: var(--font-size-sm);
	}

	.summary-cloned strong {
		color: var(--color-primary);
	}

	.summary-updated strong {
		color: var(--color-success);
	}

	.summary-uptodate strong {
		color: var(--color-text-secondary);
	}

	.summary-skipped strong {
		color: var(--color-warning, #d97706);
	}

	.summary-failed strong {
		color: var(--color-error);
	}

	.summary-details {
		margin-top: var(--spacing-md);
		padding: var(--spacing-md);
		border-radius: var(--border-radius);
	}

	.summary-details h5 {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.summary-details ul {
		margin: 0;
		padding-left: var(--spacing-md);
		font-size: var(--font-size-sm);
	}

	.summary-details li {
		margin-bottom: var(--spacing-xs);
		word-break: break-word;
	}

	.summary-errors {
		background-color: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-error);
	}

	.summary-errors h5 {
		color: var(--color-error);
	}

	.summary-warnings {
		background-color: rgba(217, 119, 6, 0.1);
		border: 1px solid var(--color-warning, #d97706);
	}

	.summary-warnings h5 {
		color: var(--color-warning, #d97706);
	}

	.repo-grid {
		display: grid;
		gap: var(--spacing-md);
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	}

	.empty-state {
		margin-top: var(--spacing-lg);
		padding: var(--spacing-lg);
		text-align: center;
		color: var(--color-text-secondary);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.empty-state a {
		color: var(--color-primary);
	}
</style>
