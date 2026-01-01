<script lang="ts">
	import { releasesStore } from '$lib/stores/releases.svelte';
	import ReleaseList from '$lib/components/ReleaseList.svelte';
	import { onMount } from 'svelte';
	import type { LastCommit, TrackedRepo } from '$lib/types';

	let refreshing = $state(false);
	let commitData = $state<Map<string, { commit: LastCommit | null; loading: boolean; error: string | null }>>(new Map());
	let liveMessage = $state('');

	// Compute repos without releases, sorted by commit date if available
	let reposWithoutReleases = $derived.by(() => {
		const repoIdsWithReleases = new Set(releasesStore.releases.map(r => r.repoId));
		const filtered = releasesStore.repos.filter(repo => !repoIdsWithReleases.has(repo.id));

		// Create a map of stored commits by repoId
		const storedCommitsMap = new Map(releasesStore.commits.map(c => [c.repoId, c]));

		// Sort by commit date (newest first), repos without commit data go last
		return filtered.sort((a, b) => {
			// First check stored commits
			const aStoredCommit = storedCommitsMap.get(a.id);
			const bStoredCommit = storedCommitsMap.get(b.id);

			// If both have stored commits, sort by date (newest first)
			if (aStoredCommit && bStoredCommit) {
				return new Date(bStoredCommit.date).getTime() - new Date(aStoredCommit.date).getTime();
			}

			// Repos with commits come before repos without
			if (aStoredCommit && !bStoredCommit) return -1;
			if (!aStoredCommit && bStoredCommit) return 1;

			// If neither has commits, maintain original order (by repo id)
			return a.id.localeCompare(b.id);
		});
	});

	async function handleRefresh() {
		refreshing = true;
		liveMessage = 'Refreshing releases from GitHub...';

		try {
			await releasesStore.refreshReleases();

			const releaseCount = releasesStore.releases.length;
			const repoCount = releasesStore.repos.length;
			const reposWithoutReleasesCount = reposWithoutReleases.length;

			if (releaseCount === 0 && reposWithoutReleasesCount === 0) {
				liveMessage = 'Refresh complete. No repositories tracked.';
			} else if (releaseCount === 0) {
				liveMessage = `Refresh complete. No releases found for ${repoCount} ${repoCount === 1 ? 'repository' : 'repositories'}.`;
			} else if (reposWithoutReleasesCount > 0) {
				liveMessage = `Refresh complete. Found ${releaseCount} ${releaseCount === 1 ? 'release' : 'releases'} from ${repoCount - reposWithoutReleasesCount} ${repoCount - reposWithoutReleasesCount === 1 ? 'repository' : 'repositories'}. ${reposWithoutReleasesCount} ${reposWithoutReleasesCount === 1 ? 'repository has' : 'repositories have'} no releases.`;
			} else {
				liveMessage = `Refresh complete. Found ${releaseCount} ${releaseCount === 1 ? 'release' : 'releases'} from ${repoCount} ${repoCount === 1 ? 'repository' : 'repositories'}.`;
			}
		} catch (error) {
			liveMessage = 'Refresh failed. Please try again.';
		} finally {
			refreshing = false;
		}
	}

	async function handleFetchCommit(repo: TrackedRepo) {
		// Initialize state for this repo
		commitData.set(repo.id, { commit: null, loading: true, error: null });
		commitData = commitData; // Trigger reactivity

		liveMessage = `Fetching last commit for ${repo.owner}/${repo.name}...`;

		try {
			const commit = await window.electronAPI.fetchLastCommit(repo.owner, repo.name);
			commitData.set(repo.id, { commit, loading: false, error: null });
			commitData = commitData; // Trigger reactivity
			liveMessage = `Last commit for ${repo.owner}/${repo.name} retrieved successfully`;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to fetch commit';
			commitData.set(repo.id, { commit: null, loading: false, error: errorMessage });
			commitData = commitData; // Trigger reactivity
			liveMessage = `Error fetching commit for ${repo.owner}/${repo.name}: ${errorMessage}`;
		}
	}

	onMount(() => {
		// Focus the h2 heading when page loads for screen readers
		const heading = document.querySelector('h2');
		if (heading) {
			heading.setAttribute('tabindex', '-1');
			heading.focus();
		}
	});
</script>

<svelte:head>
	<title>Release History - Release Tracker</title>
</svelte:head>

<div class="page-header">
	<h2>Release History</h2>
	<button
		type="button"
		class="primary"
		onclick={handleRefresh}
		disabled={refreshing || releasesStore.loading}
		aria-label="Refresh releases from GitHub"
	>
		{refreshing ? 'Refreshing...' : 'Refresh Releases'}
	</button>
</div>

<p>Latest releases from your tracked repositories.</p>

{#if releasesStore.error}
	<div role="alert" class="error" aria-live="assertive">
		{releasesStore.error}
		<button type="button" onclick={() => releasesStore.clearError()} aria-label="Dismiss error">
			Dismiss
		</button>
	</div>
{/if}

{#if releasesStore.loading}
	<div role="status" aria-live="polite" class="loading-container">
		<span class="loading"></span>
		<span>Loading releases...</span>
	</div>
{/if}

<!-- Live region for screen reader announcements -->
<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
	{liveMessage}
</div>

{#if releasesStore.repos.length === 0}
	<div class="empty-state">
		<p>You haven't added any repositories yet.</p>
		<p>
			<a href="/add">Go to Add Repositories</a> to start tracking releases.
		</p>
	</div>
{:else}
	<ReleaseList releases={releasesStore.releases} />

	{#if reposWithoutReleases.length > 0}
		<section class="repos-without-releases">
			<h2>Repositories Without Releases</h2>
			<p class="section-description">
				These repositories don't have any published releases. You can check their latest commit instead.
			</p>

			<div class="repos-list">
				{#each reposWithoutReleases as repo (repo.id)}
					{@const storedCommit = releasesStore.commits.find(c => c.repoId === repo.id)}
					{@const repoData = commitData.get(repo.id)}
					<article class="repo-item">
						<div class="repo-header">
							<h3>
								<a href={repo.url} target="_blank" rel="noopener noreferrer">
									{repo.owner}/{repo.name}
								</a>
							</h3>
						</div>

						{#if storedCommit}
							<!-- Show stored commit from refresh -->
							<div class="commit-info">
								<div class="commit-meta">
									<time datetime={storedCommit.date}>
										{new Date(storedCommit.date).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'short',
											day: 'numeric',
											hour: '2-digit',
											minute: '2-digit'
										})}
									</time>
									<span class="commit-author">by {storedCommit.author}</span>
								</div>
								<p class="commit-message">{storedCommit.message}</p>
								<a
									href={storedCommit.htmlUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="commit-link"
								>
									View commit on GitHub
								</a>
							</div>
						{:else}
							<!-- Fallback to manual fetch if no stored commit -->
							{#if !repoData || (!repoData.commit && !repoData.loading && !repoData.error)}
								<button
									type="button"
									class="secondary"
									onclick={() => handleFetchCommit(repo)}
									aria-label={`Retrieve last commit for ${repo.owner}/${repo.name}`}
								>
									Retrieve Last Commit
								</button>
							{/if}

							{#if repoData?.loading}
								<div class="commit-loading">
									<span class="loading"></span>
									<span>Fetching commit...</span>
								</div>
							{/if}

							{#if repoData?.error}
								<div class="commit-error" role="alert">
									<p>{repoData.error}</p>
									<button
										type="button"
										class="secondary"
										onclick={() => handleFetchCommit(repo)}
										aria-label={`Retry fetching commit for ${repo.owner}/${repo.name}`}
									>
										Retry
									</button>
								</div>
							{/if}

							{#if repoData?.commit}
								<div class="commit-info">
									<div class="commit-meta">
										<time datetime={repoData.commit.date}>
											{new Date(repoData.commit.date).toLocaleDateString('en-US', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</time>
										<span class="commit-author">by {repoData.commit.author}</span>
									</div>
									<p class="commit-message">{repoData.commit.message}</p>
									<a
										href={repoData.commit.htmlUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="commit-link"
									>
										View commit on GitHub
									</a>
								</div>
							{/if}
						{/if}
					</article>
				{/each}
			</div>
		</section>
	{/if}
{/if}

<style>
	h2 {
		outline: none;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-md);
		flex-wrap: wrap;
		gap: var(--spacing-md);
	}

	.loading-container {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		margin: var(--spacing-xl) 0;
		padding: var(--spacing-lg);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-2xl);
		color: var(--color-text-secondary);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		margin: var(--spacing-xl) 0;
	}

	.empty-state p {
		margin-bottom: var(--spacing-md);
	}

	.empty-state a {
		font-weight: 600;
	}

	.error {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-md);
	}

	.error button {
		flex-shrink: 0;
	}

	/* Screen reader only - hidden visually but accessible to assistive tech */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	/* Repos without releases section */
	.repos-without-releases {
		margin-top: var(--spacing-2xl);
		padding-top: var(--spacing-2xl);
		border-top: 2px solid var(--color-border);
	}

	.repos-without-releases h2 {
		font-size: var(--font-size-xl);
		margin-bottom: var(--spacing-sm);
		color: var(--color-text-primary);
	}

	.section-description {
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-lg);
		font-size: var(--font-size-sm);
	}

	.repos-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.repo-item {
		padding: var(--spacing-lg);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.repo-header h3 {
		font-size: var(--font-size-lg);
		margin: 0 0 var(--spacing-md) 0;
	}

	.repo-header a {
		color: var(--color-text-primary);
		text-decoration: none;
		font-weight: 600;
	}

	.repo-header a:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.commit-loading {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background-color: var(--color-bg-primary);
		border-radius: var(--border-radius);
	}

	.commit-error {
		padding: var(--spacing-md);
		background-color: var(--color-bg-primary);
		border: 1px solid #f44336;
		border-radius: var(--border-radius);
		color: #f44336;
	}

	.commit-error p {
		margin: 0 0 var(--spacing-sm) 0;
	}

	.commit-info {
		padding: var(--spacing-md);
		background-color: var(--color-bg-primary);
		border-radius: var(--border-radius);
		margin-top: var(--spacing-sm);
	}

	.commit-meta {
		display: flex;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-sm);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		flex-wrap: wrap;
	}

	.commit-author {
		font-style: italic;
	}

	.commit-message {
		margin: var(--spacing-sm) 0;
		color: var(--color-text-primary);
		font-family: 'Courier New', monospace;
		font-size: var(--font-size-sm);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.commit-link {
		display: inline-block;
		margin-top: var(--spacing-sm);
		color: var(--color-primary);
		text-decoration: none;
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.commit-link:hover {
		text-decoration: underline;
	}
</style>
