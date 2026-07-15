<script lang="ts">
	import { releasesStore } from '$lib/stores/releases.svelte';
	import { parseRepoInput } from '$lib/utils/github';

	let repoInput = $state('');
	let formError = $state('');
	let successMessage = $state('');

	async function handleSubmit(event: Event) {
		event.preventDefault();
		formError = '';
		successMessage = '';

		const input = repoInput.trim();

		if (!input) {
			formError = 'Please enter a repository or paste a GitHub URL.';
			return;
		}

		// Accept owner/repo or any GitHub URL (with or without /releases, /tree, .git, etc.)
		const parsed = parseRepoInput(input);
		if (!parsed) {
			formError =
				'Could not recognize a GitHub repository. Paste a github.com link or use owner/repo.';
			return;
		}

		const { owner, name } = parsed;

		try {
			await releasesStore.addRepoManual(owner, name);
			successMessage = `Successfully added ${owner}/${name}!`;
			repoInput = '';

			// Clear success message after 3 seconds
			setTimeout(() => {
				successMessage = '';
			}, 3000);
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Failed to add repository';
		}
	}

	function clearError() {
		formError = '';
	}
</script>

<section aria-labelledby="manual-heading">
	<h2 id="manual-heading">Add Manually</h2>
	<p>
		Enter <code>owner/repo</code> or paste any GitHub link &mdash; e.g.
		<code>sveltejs/kit</code> or <code>https://github.com/sveltejs/kit/releases</code>. The
		owner and repository are detected automatically.
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

		<div class="form-group">
			<label for="repo-input">
				Repository
				<span aria-label="required">*</span>
			</label>
			<input
				type="text"
				id="repo-input"
				bind:value={repoInput}
				oninput={clearError}
				placeholder="e.g. sveltejs/kit or https://github.com/sveltejs/kit/releases"
				required
				aria-required="true"
				aria-describedby={formError ? 'form-error' : undefined}
				aria-invalid={formError ? 'true' : 'false'}
			/>
		</div>

		<button type="submit" class="primary" disabled={releasesStore.loading}>
			{releasesStore.loading ? 'Adding...' : 'Add Repository'}
		</button>
	</form>
</section>

<style>
	section {
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
	}

	.form-group {
		margin-bottom: var(--spacing-md);
	}

	input[aria-invalid='true'] {
		border-color: var(--color-error);
	}

	code {
		font-family: 'Courier New', monospace;
		font-size: 0.9em;
		padding: 0 var(--spacing-xs);
		background-color: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
	}
</style>
