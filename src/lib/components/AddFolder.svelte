<script lang="ts">
	import { releasesStore } from '$lib/stores/releases.svelte';
	import type { ScannedGitRepo } from '$lib/types';

	let selectedPath = $state<string | null>(null);
	let addingRepos = $state(false);
	let selectedRepos = $state<Set<string>>(new Set());

	// When scanned repos change, select all by default
	$effect(() => {
		if (releasesStore.scannedRepos.length > 0) {
			selectedRepos = new Set(releasesStore.scannedRepos.map((r) => r.url));
		}
	});

	async function handleSelectFolder() {
		const path = await releasesStore.selectFolder();
		if (path) {
			selectedPath = path;
			await releasesStore.scanFolder(path);
		}
	}

	async function handleAddSelected() {
		addingRepos = true;
		const reposToAdd = releasesStore.scannedRepos.filter((repo) => selectedRepos.has(repo.url));
		await releasesStore.addScannedRepos(reposToAdd);
		addingRepos = false;
		selectedPath = null;
		selectedRepos = new Set();
	}

	function handleClearResults() {
		releasesStore.clearScannedRepos();
		selectedPath = null;
		selectedRepos = new Set();
	}

	function toggleRepo(url: string) {
		if (selectedRepos.has(url)) {
			selectedRepos.delete(url);
		} else {
			selectedRepos.add(url);
		}
		selectedRepos = selectedRepos; // Trigger reactivity
	}

	function toggleSelectAll() {
		if (selectedRepos.size === releasesStore.scannedRepos.length) {
			selectedRepos = new Set();
		} else {
			selectedRepos = new Set(releasesStore.scannedRepos.map((r) => r.url));
		}
	}

	let allSelected = $derived(
		releasesStore.scannedRepos.length > 0 &&
			selectedRepos.size === releasesStore.scannedRepos.length
	);
	let someSelected = $derived(selectedRepos.size > 0 && !allSelected);
</script>

<section aria-labelledby="folder-heading">
	<h2 id="folder-heading">Add from Folder</h2>
	<p>Select a folder to scan for Git repositories with GitHub remotes.</p>

	<div class="folder-controls">
		<button
			type="button"
			onclick={handleSelectFolder}
			disabled={releasesStore.scanning}
			aria-label="Select folder to scan for repositories"
		>
			{releasesStore.scanning ? 'Scanning...' : 'Select Folder'}
		</button>

		{#if selectedPath}
			<p class="selected-path">
				<strong>Selected:</strong>
				{selectedPath}
			</p>
		{/if}
	</div>

	{#if releasesStore.scanning}
		<div role="status" aria-live="polite" class="loading-container">
			<span class="loading"></span>
			<span>Scanning folder for Git repositories...</span>
		</div>
	{/if}

	{#if releasesStore.scannedRepos.length > 0}
		<div
			role="region"
			aria-labelledby="scan-results-heading"
			aria-live="polite"
			class="scan-results"
		>
			<div class="results-header">
				<h3 id="scan-results-heading">
					Found {releasesStore.scannedRepos.length} GitHub
					{releasesStore.scannedRepos.length === 1 ? 'repository' : 'repositories'}
				</h3>

				<label class="select-all-label">
					<input
						type="checkbox"
						checked={allSelected}
						indeterminate={someSelected}
						onchange={toggleSelectAll}
						aria-label="Select all repositories"
					/>
					<span>Select All</span>
				</label>
			</div>

			<ul role="list">
				{#each releasesStore.scannedRepos as repo (repo.url)}
					<li>
						<label class="repo-checkbox">
							<input
								type="checkbox"
								checked={selectedRepos.has(repo.url)}
								onchange={() => toggleRepo(repo.url)}
								aria-label={`Select ${repo.owner}/${repo.name}`}
							/>
							<div class="repo-info">
								<strong>{repo.owner}/{repo.name}</strong>
								<span class="repo-path">{repo.path}</span>
							</div>
						</label>
					</li>
				{/each}
			</ul>

			<div class="selection-summary">
				<p>
					{selectedRepos.size} of {releasesStore.scannedRepos.length}
					{selectedRepos.size === 1 ? 'repository' : 'repositories'} selected
				</p>
			</div>

			<div class="result-actions">
				<button
					type="button"
					class="primary"
					onclick={handleAddSelected}
					disabled={addingRepos || releasesStore.loading || selectedRepos.size === 0}
					aria-label="Add {selectedRepos.size} selected {selectedRepos.size === 1 ? 'repository' : 'repositories'}"
				>
					{addingRepos ? 'Adding...' : `Add Selected (${selectedRepos.size})`}
				</button>
				<button type="button" onclick={handleClearResults} disabled={addingRepos}>
					Clear Results
				</button>
			</div>
		</div>
	{:else if selectedPath && !releasesStore.scanning}
		<p class="empty-state">No GitHub repositories found in the selected folder.</p>
	{/if}
</section>

<style>
	section {
		margin-bottom: var(--spacing-xl);
		padding: var(--spacing-lg);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	h2 {
		margin-bottom: var(--spacing-sm);
	}

	.folder-controls {
		margin-top: var(--spacing-md);
	}

	.selected-path {
		margin-top: var(--spacing-sm);
		padding: var(--spacing-sm);
		background-color: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		font-size: var(--font-size-sm);
		word-break: break-all;
	}

	.loading-container {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-md);
		padding: var(--spacing-md);
		background-color: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.scan-results {
		margin-top: var(--spacing-md);
		padding: var(--spacing-md);
		background-color: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-md);
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}

	.scan-results h3 {
		margin: 0;
		color: var(--color-success);
	}

	.select-all-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		cursor: pointer;
		font-weight: 600;
		font-size: var(--font-size-sm);
	}

	.select-all-label input[type='checkbox'] {
		cursor: pointer;
		width: 18px;
		height: 18px;
	}

	.scan-results ul {
		list-style: none;
		margin-bottom: var(--spacing-md);
	}

	.scan-results li {
		border-bottom: 1px solid var(--color-border);
	}

	.scan-results li:last-child {
		border-bottom: none;
	}

	.repo-checkbox {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm);
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.repo-checkbox:hover {
		background-color: var(--color-bg-secondary);
	}

	.repo-checkbox input[type='checkbox'] {
		margin-top: 2px;
		cursor: pointer;
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.repo-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		flex: 1;
	}

	.repo-path {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		word-break: break-all;
	}

	.selection-summary {
		margin-bottom: var(--spacing-md);
		padding: var(--spacing-sm);
		background-color: var(--color-bg-secondary);
		border-radius: var(--border-radius);
		text-align: center;
	}

	.selection-summary p {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-weight: 600;
	}

	.result-actions {
		display: flex;
		gap: var(--spacing-sm);
	}

	.empty-state {
		margin-top: var(--spacing-md);
		padding: var(--spacing-md);
		text-align: center;
		color: var(--color-text-secondary);
		background-color: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}
</style>
