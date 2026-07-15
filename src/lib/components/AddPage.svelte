<script lang="ts">
	import { releasesStore } from '$lib/stores/releases.svelte';

	let pageInput = $state('');
	let formError = $state('');
	let successMessage = $state('');
	let adding = $state(false);

	async function handleSubmit(event: Event) {
		event.preventDefault();
		formError = '';
		successMessage = '';

		const input = pageInput.trim();
		if (!input) {
			formError = 'Please enter a URL to watch.';
			return;
		}

		adding = true;
		try {
			const page = await releasesStore.addPage(input);
			successMessage = `Now watching ${page?.title ?? input}.`;
			pageInput = '';
			setTimeout(() => {
				successMessage = '';
			}, 3000);
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Failed to add page';
		} finally {
			adding = false;
		}
	}

	function clearError() {
		formError = '';
	}
</script>

<section aria-labelledby="pages-heading" class="pages-section">
	<h2 id="pages-heading">Pages to Check</h2>
	<p>
		Watch any non-GitHub page for changes. A snapshot is taken when you add it, and every time you
		press <strong>Refresh Releases</strong> it's compared against the previous snapshot so you can
		see what changed.
	</p>

	<form onsubmit={handleSubmit} novalidate>
		{#if formError}
			<div role="alert" class="error" aria-live="assertive">
				{formError}
			</div>
		{/if}

		{#if successMessage}
			<div role="alert" class="success" aria-live="polite">
				{successMessage}
			</div>
		{/if}

		<div class="input-group">
			<label for="page-input" class="visually-hidden">Page URL to watch</label>
			<input
				type="url"
				id="page-input"
				bind:value={pageInput}
				oninput={clearError}
				placeholder="e.g. https://arctic-labs.com/p/pie-access"
				disabled={adding}
				aria-describedby={formError ? 'page-error' : undefined}
				aria-invalid={formError ? 'true' : 'false'}
			/>
			<button type="submit" class="primary" disabled={adding || !pageInput.trim()}>
				{adding ? 'Adding...' : 'Add Page'}
			</button>
		</div>
	</form>

	{#if releasesStore.pages.length > 0}
		<ul role="list" class="pages-list">
			{#each releasesStore.pages as page (page.id)}
				<li>
					<div class="page-info">
						<a
							href={page.url}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Open {page.title} in new window"
						>
							{page.title}
						</a>
						<span class="page-url">{page.url}</span>
					</div>
					<button
						type="button"
						onclick={() => releasesStore.removePage(page.id)}
						aria-label="Stop watching {page.title}"
						class="remove-btn"
					>
						Remove
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty-state">No pages are being watched yet.</p>
	{/if}
</section>

<style>
	.pages-section {
		margin-top: var(--spacing-xl);
		padding: var(--spacing-lg);
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}

	h2 {
		margin-bottom: var(--spacing-sm);
	}

	form {
		margin-top: var(--spacing-md);
		margin-bottom: var(--spacing-md);
	}

	.input-group {
		display: flex;
		gap: var(--spacing-sm);
	}

	.input-group input {
		flex: 1;
	}

	.input-group button {
		flex-shrink: 0;
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

	input[aria-invalid='true'] {
		border-color: var(--color-error);
	}

	.pages-list {
		list-style: none;
		margin-top: var(--spacing-md);
	}

	.pages-list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-sm);
		border-bottom: 1px solid var(--color-border);
	}

	.pages-list li:last-child {
		border-bottom: none;
	}

	.page-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.page-info a {
		font-weight: 600;
	}

	.page-url {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		word-break: break-all;
	}

	.remove-btn {
		flex-shrink: 0;
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
