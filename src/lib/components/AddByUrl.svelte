<script lang="ts">
	import { releasesStore } from '$lib/stores/releases.svelte';
	import type { ParsedRepo } from '$lib/types';

	let url = $state('');
	let loading = $state(false);
	let addingRepos = $state(false);
	let fetchedRepos = $state<ParsedRepo[]>([]);
	let selectedRepos = $state<Set<string>>(new Set());
	let error = $state<string | null>(null);

	// Filter out already tracked repos
	let repos = $derived(() => {
		const trackedUrls = new Set(releasesStore.repos.map((r) => r.url.toLowerCase()));
		return fetchedRepos.filter((r) => !trackedUrls.has(r.url.toLowerCase()));
	});

	// Track how many were filtered
	let filteredCount = $derived(() => fetchedRepos.length - repos().length);

	async function handleScan() {
		if (!url.trim()) {
			error = 'Please enter a URL';
			return;
		}

		// Basic URL validation
		try {
			new URL(url.trim());
		} catch {
			error = 'Please enter a valid URL';
			return;
		}

		loading = true;
		error = null;
		fetchedRepos = [];
		selectedRepos = new Set();

		try {
			fetchedRepos = await window.electronAPI.fetchReposFromUrl(url.trim());
			// Select all non-tracked repos by default
			const available = repos();
			if (available.length > 0) {
				selectedRepos = new Set(available.map((r) => r.url));
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch URL';
		} finally {
			loading = false;
		}
	}

	async function handleAddSelected() {
		addingRepos = true;
		error = null;

		try {
			const reposToAdd = repos().filter((repo) => selectedRepos.has(repo.url));
			for (const repo of reposToAdd) {
				try {
					await window.electronAPI.addRepo(repo.owner, repo.name, 'manual');
				} catch (err) {
					// Skip duplicates silently
					if (err instanceof Error && !err.message.includes('already tracked')) {
						throw err;
					}
				}
			}
			await releasesStore.loadRepos();
			handleClearResults();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add repositories';
		} finally {
			addingRepos = false;
		}
	}

	function handleClearResults() {
		fetchedRepos = [];
		selectedRepos = new Set();
		error = null;
	}

	function toggleRepo(repoUrl: string) {
		const newSet = new Set(selectedRepos);
		if (newSet.has(repoUrl)) {
			newSet.delete(repoUrl);
		} else {
			newSet.add(repoUrl);
		}
		selectedRepos = newSet;
	}

	function toggleSelectAll() {
		const available = repos();
		if (selectedRepos.size === available.length) {
			selectedRepos = new Set();
		} else {
			selectedRepos = new Set(available.map((r) => r.url));
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleScan();
		}
	}

	let allSelected = $derived(repos().length > 0 && selectedRepos.size === repos().length);
	let someSelected = $derived(selectedRepos.size > 0 && !allSelected);
</script>

<section aria-labelledby="url-heading">
	<h2 id="url-heading">Add from URL</h2>
	<p>Enter a URL to scan for GitHub repository links.</p>

	<div class="search-controls">
		<div class="input-group">
			<label for="url-input" class="visually-hidden">URL to scan</label>
			<input
				id="url-input"
				type="url"
				bind:value={url}
				placeholder="e.g. https://gist.github.com/user/..."
				disabled={loading}
				onkeydown={handleKeydown}
				aria-describedby={error ? 'url-error' : undefined}
			/>
			<button type="button" onclick={handleScan} disabled={loading || !url.trim()}>
				{loading ? 'Scanning...' : 'Scan URL'}
			</button>
		</div>
	</div>

	{#if error}
		<p id="url-error" class="error-message" role="alert">{error}</p>
	{/if}

	{#if loading}
		<div role="status" aria-live="polite" class="loading-container">
			<span class="loading"></span>
			<span>Scanning URL for GitHub links...</span>
		</div>
	{/if}

	{#if repos().length > 0}
		<div role="region" aria-labelledby="url-results-heading" aria-live="polite" class="scan-results">
			<div class="results-header">
				<h3 id="url-results-heading">
					Found {repos().length} new
					{repos().length === 1 ? 'repository' : 'repositories'}
					{#if filteredCount() > 0}
						<span class="filtered-note">({filteredCount()} already tracked)</span>
					{/if}
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
				{#each repos() as repo (repo.url)}
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
							</div>
						</label>
					</li>
				{/each}
			</ul>

			<div class="selection-summary">
				<p>
					{selectedRepos.size} of {repos().length}
					{selectedRepos.size === 1 ? 'repository' : 'repositories'} selected
				</p>
			</div>

			<div class="result-actions">
				<button
					type="button"
					class="primary"
					onclick={handleAddSelected}
					disabled={addingRepos || selectedRepos.size === 0}
					aria-label="Add {selectedRepos.size} selected {selectedRepos.size === 1
						? 'repository'
						: 'repositories'}"
				>
					{addingRepos ? 'Adding...' : `Add Selected (${selectedRepos.size})`}
				</button>
				<button type="button" onclick={handleClearResults} disabled={addingRepos}>
					Clear Results
				</button>
			</div>
		</div>
	{:else if fetchedRepos.length > 0 && repos().length === 0}
		<p class="empty-state">All {fetchedRepos.length} repositories from this URL are already tracked.</p>
	{:else if url && !loading && !error}
		<p class="empty-state">No GitHub repository links found at this URL.</p>
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

	.search-controls {
		margin-top: var(--spacing-md);
	}

	.input-group {
		display: flex;
		gap: var(--spacing-sm);
	}

	.input-group input {
		flex: 1;
	}

	.visually-hidden {
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

	.error-message {
		margin-top: var(--spacing-sm);
		padding: var(--spacing-sm);
		background-color: var(--color-error-bg, #fef2f2);
		border: 1px solid var(--color-error, #dc2626);
		border-radius: var(--border-radius);
		color: var(--color-error, #dc2626);
		font-size: var(--font-size-sm);
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

	.filtered-note {
		font-size: var(--font-size-sm);
		font-weight: normal;
		color: var(--color-text-secondary);
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
		max-height: 300px;
		overflow-y: auto;
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
