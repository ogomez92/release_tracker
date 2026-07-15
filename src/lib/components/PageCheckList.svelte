<script lang="ts">
	import type { TrackedPage } from '$lib/types';

	let { pages }: { pages: TrackedPage[] } = $props();

	function formatDate(iso: string | null): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Changed pages first, then errors, then unchanged.
	let sortedPages = $derived(
		[...pages].sort((a, b) => {
			const rank = (p: TrackedPage) => (p.changed ? 0 : p.status === 'error' ? 1 : 2);
			return rank(a) - rank(b);
		})
	);

	let changedCount = $derived(pages.filter((p) => p.changed).length);
</script>

<section class="pages-to-check" aria-labelledby="pages-check-heading">
	<h2 id="pages-check-heading">Pages to Check</h2>
	<p class="section-description">
		Non-GitHub pages watched for changes.
		{#if changedCount > 0}
			<strong class="changed-summary"
				>{changedCount} changed since the last refresh.</strong
			>
		{:else}
			Compared against the previous snapshot on each refresh.
		{/if}
	</p>

	<div class="pages-list">
		{#each sortedPages as page (page.id)}
			<article class="page-item" class:is-changed={page.changed} class:is-error={page.status === 'error'}>
				<div class="page-header">
					<h3>
						<a href={page.url} target="_blank" rel="noopener noreferrer">
							{page.title}
						</a>
					</h3>

					{#if page.changed}
						<span class="badge badge-changed">Modified</span>
					{:else if page.status === 'error'}
						<span class="badge badge-error">Check failed</span>
					{:else if !page.lastChecked}
						<span class="badge badge-pending">Not checked yet</span>
					{:else}
						<span class="badge badge-ok">No changes</span>
					{/if}
				</div>

				<p class="page-url">{page.url}</p>

				<div class="page-status">
					{#if page.status === 'error'}
						<p class="status-error">{page.error ?? 'Could not fetch this page.'}</p>
						{#if page.lastChecked}
							<p class="status-meta">Last attempt: {formatDate(page.lastChecked)}</p>
						{/if}
					{:else if page.changed}
						<p class="status-meta">
							Changed {formatDate(page.lastChanged)}
						</p>
					{:else if !page.lastChecked}
						<p class="status-meta">Press “Refresh Releases” to take the first snapshot.</p>
					{:else}
						<p class="status-meta">Last checked: {formatDate(page.lastChecked)}</p>
					{/if}
				</div>
			</article>
		{/each}
	</div>
</section>

<style>
	.pages-to-check {
		margin-top: var(--spacing-2xl);
		padding-top: var(--spacing-2xl);
		border-top: 2px solid var(--color-border);
	}

	.pages-to-check h2 {
		font-size: var(--font-size-xl);
		margin-bottom: var(--spacing-sm);
		color: var(--color-text);
	}

	.section-description {
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-lg);
		font-size: var(--font-size-sm);
	}

	.changed-summary {
		color: var(--color-warning);
	}

	.pages-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.page-item {
		padding: var(--spacing-lg);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	.page-item.is-changed {
		border-color: var(--color-warning);
		border-left-width: 4px;
	}

	.page-item.is-error {
		border-color: var(--color-error);
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.page-header h3 {
		font-size: var(--font-size-lg);
		margin: 0;
	}

	.page-header a {
		color: var(--color-text);
		text-decoration: none;
		font-weight: 600;
	}

	.page-header a:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.badge {
		flex-shrink: 0;
		padding: 2px 8px;
		font-size: var(--font-size-sm);
		font-weight: 600;
		border-radius: var(--border-radius);
		border: 1px solid transparent;
	}

	.badge-changed {
		background-color: var(--color-warning);
		color: white;
	}

	.badge-error {
		background-color: var(--color-error);
		color: white;
	}

	.badge-ok {
		background-color: transparent;
		color: var(--color-success);
		border-color: var(--color-success);
	}

	.badge-pending {
		background-color: transparent;
		color: var(--color-text-secondary);
		border-color: var(--color-border);
	}

	.page-url {
		margin: var(--spacing-xs) 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		word-break: break-all;
	}

	.page-status {
		margin-top: var(--spacing-sm);
	}

	.page-status p {
		margin: 0;
	}

	.status-error {
		color: var(--color-error);
		font-size: var(--font-size-sm);
	}

	.status-meta {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
</style>
