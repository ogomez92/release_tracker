<script lang="ts">
	import { releasesStore } from '$lib/stores/releases.svelte';
	import AddFolder from '$lib/components/AddFolder.svelte';
	import AddManual from '$lib/components/AddManual.svelte';
	import AddByUsername from '$lib/components/AddByUsername.svelte';
	import AddByUrl from '$lib/components/AddByUrl.svelte';
	import { onMount } from 'svelte';

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
	<title>Add Repositories - Release Tracker</title>
</svelte:head>

<h2>Add Repositories</h2>
<p>Track GitHub releases by adding repositories using one of the methods below.</p>

{#if releasesStore.error}
	<div role="alert" class="error" aria-live="assertive">
		{releasesStore.error}
		<button type="button" onclick={() => releasesStore.clearError()} aria-label="Dismiss error">
			Dismiss
		</button>
	</div>
{/if}

{#if releasesStore.repos.length > 0}
	<section aria-labelledby="tracked-heading" class="tracked-repos">
		<h3 id="tracked-heading">Currently Tracking {releasesStore.repos.length} Repositories</h3>
		<ul role="list">
			{#each releasesStore.repos as repo (repo.id)}
				<li>
					<div class="repo-info">
						<a
							href={repo.url}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Open {repo.owner}/{repo.name} on GitHub in new window"
						>
							{repo.owner}/{repo.name}
						</a>
						<span class="repo-source">({repo.source})</span>
					</div>
					<button
						type="button"
						onclick={() => releasesStore.removeRepo(repo.id)}
						disabled={releasesStore.loading}
						aria-label="Remove {repo.owner}/{repo.name} from tracking"
						class="remove-btn"
					>
						Remove
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<div class="add-methods">
	<AddFolder />
	<AddManual />
	<AddByUsername />
	<AddByUrl />
</div>

<style>
	h2 {
		outline: none;
	}

	.tracked-repos {
		margin: var(--spacing-xl) 0;
		padding: var(--spacing-lg);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.tracked-repos h3 {
		margin-bottom: var(--spacing-md);
	}

	.tracked-repos ul {
		list-style: none;
	}

	.tracked-repos li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-sm);
		border-bottom: 1px solid var(--color-border);
	}

	.tracked-repos li:last-child {
		border-bottom: none;
	}

	.repo-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.repo-source {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.remove-btn {
		background-color: transparent;
		color: var(--color-error);
		border: 1px solid var(--color-error);
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-sm);
	}

	.remove-btn:hover:not(:disabled) {
		background-color: var(--color-error);
		color: white;
	}

	.add-methods {
		display: grid;
		gap: var(--spacing-xl);
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

	@media (min-width: 768px) {
		.add-methods {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
