<script lang="ts">
	import type { Release } from '$lib/types';
	import ReleaseItem from './ReleaseItem.svelte';

	let { releases }: { releases: Release[] } = $props();

	const ITEMS_PER_PAGE = 10;
	let currentPage = $state(1);

	// Compute paginated releases
	let paginatedReleases = $derived.by(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		const endIndex = startIndex + ITEMS_PER_PAGE;
		return releases.slice(startIndex, endIndex);
	});

	let totalPages = $derived(Math.ceil(releases.length / ITEMS_PER_PAGE));
	let showPagination = $derived(releases.length > ITEMS_PER_PAGE);

	function goToPage(page: number) {
		currentPage = page;
		// Scroll to top of release list
		const feed = document.querySelector('.release-feed');
		if (feed) {
			feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function nextPage() {
		if (currentPage < totalPages) {
			goToPage(currentPage + 1);
		}
	}

	function previousPage() {
		if (currentPage > 1) {
			goToPage(currentPage - 1);
		}
	}

	// Reset to page 1 when releases change
	$effect(() => {
		if (releases.length > 0 && currentPage > totalPages) {
			currentPage = 1;
		}
	});
</script>

{#if releases.length === 0}
	<div class="empty-state">
		<p>No releases found yet.</p>
		<p>Add some repositories and click "Refresh Releases" to fetch the latest releases.</p>
	</div>
{:else}
	<div role="feed" aria-label="Release feed" class="release-feed">
		<div class="feed-header">
			<p class="release-count" role="status">
				Showing {paginatedReleases.length} of {releases.length} {releases.length === 1
					? 'release'
					: 'releases'}
				{#if showPagination}
					(Page {currentPage} of {totalPages})
				{/if}
			</p>
		</div>

		{#each paginatedReleases as release (release.id)}
			<ReleaseItem {release} />
		{/each}

		{#if showPagination}
			<nav class="pagination" aria-label="Pagination">
				<button
					type="button"
					onclick={previousPage}
					disabled={currentPage === 1}
					aria-label="Go to previous page"
					class="secondary"
				>
					← Previous
				</button>

				<div class="page-numbers">
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
						{#if page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
							<button
								type="button"
								onclick={() => goToPage(page)}
								aria-label={`Go to page ${page}`}
								aria-current={page === currentPage ? 'page' : undefined}
								class:active={page === currentPage}
								class="page-btn"
							>
								{page}
							</button>
						{:else if page === currentPage - 2 || page === currentPage + 2}
							<span class="ellipsis">...</span>
						{/if}
					{/each}
				</div>

				<button
					type="button"
					onclick={nextPage}
					disabled={currentPage === totalPages}
					aria-label="Go to next page"
					class="secondary"
				>
					Next →
				</button>
			</nav>
		{/if}
	</div>
{/if}

<style>
	.empty-state {
		text-align: center;
		padding: var(--spacing-2xl);
		color: var(--color-text-secondary);
	}

	.empty-state p {
		margin-bottom: var(--spacing-sm);
	}

	.release-feed {
		margin-top: var(--spacing-md);
	}

	.feed-header {
		margin-bottom: var(--spacing-md);
	}

	.release-count {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--spacing-sm);
		margin-top: var(--spacing-xl);
		padding: var(--spacing-md);
		background-color: var(--color-bg-secondary);
		border-radius: var(--border-radius);
	}

	.page-numbers {
		display: flex;
		gap: var(--spacing-xs);
		align-items: center;
	}

	.page-btn {
		min-width: 40px;
		height: 40px;
		padding: var(--spacing-xs) var(--spacing-sm);
		border: 1px solid var(--color-border);
		background-color: var(--color-bg);
		color: var(--color-text-primary);
		cursor: pointer;
		border-radius: var(--border-radius);
		font-size: var(--font-size-sm);
		transition:
			background-color 0.2s,
			border-color 0.2s,
			color 0.2s;
	}

	.page-btn:hover:not(.active) {
		background-color: var(--color-bg-secondary);
		border-color: var(--color-primary);
	}

	.page-btn.active {
		background-color: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
		font-weight: 600;
		cursor: default;
	}

	.page-btn:focus {
		outline: var(--focus-outline-width) solid var(--color-focus);
		outline-offset: var(--focus-outline-offset);
	}

	.ellipsis {
		color: var(--color-text-secondary);
		padding: 0 var(--spacing-xs);
	}

	.pagination button.secondary {
		padding: var(--spacing-sm) var(--spacing-md);
	}

	@media (max-width: 768px) {
		.pagination {
			flex-wrap: wrap;
		}

		.page-numbers {
			order: 3;
			width: 100%;
			justify-content: center;
			margin-top: var(--spacing-sm);
		}
	}
</style>
