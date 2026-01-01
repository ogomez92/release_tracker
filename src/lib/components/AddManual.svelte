<script lang="ts">
	import { releasesStore } from '$lib/stores/releases.svelte';

	let repoInput = $state('');
	let formError = $state('');
	let successMessage = $state('');

	async function handleSubmit(event: Event) {
		event.preventDefault();
		formError = '';
		successMessage = '';

		const input = repoInput.trim();

		// Validation
		if (!input) {
			formError = 'Please enter a repository in the format username/reponame.';
			return;
		}

		// Check for slash separator
		if (!input.includes('/')) {
			formError = 'Please use the format username/reponame (e.g., sveltejs/kit).';
			return;
		}

		// Split by slash
		const parts = input.split('/');
		if (parts.length !== 2) {
			formError = 'Invalid format. Use username/reponame with exactly one slash.';
			return;
		}

		const [owner, repoName] = parts;

		// Check both parts are not empty
		if (!owner || !repoName) {
			formError = 'Both username and repository name are required.';
			return;
		}

		// Basic validation for valid GitHub usernames/repos
		const validPattern = /^[a-zA-Z0-9-_.]+$/;
		if (!validPattern.test(owner)) {
			formError = 'Invalid username format. Use only letters, numbers, hyphens, and underscores.';
			return;
		}

		if (!validPattern.test(repoName)) {
			formError = 'Invalid repository name format.';
			return;
		}

		try {
			await releasesStore.addRepoManual(owner, repoName);
			successMessage = `Successfully added ${owner}/${repoName}!`;
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
	<p>Enter a repository in the format username/reponame (e.g., sveltejs/kit).</p>

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
				placeholder="e.g., sveltejs/kit"
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
</style>
