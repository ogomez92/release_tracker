<script lang="ts">
	import type { RepoUpdateState } from '$lib/types';

	let {
		repoState,
		onStateChange
	}: { repoState: RepoUpdateState; onStateChange?: (newState: RepoUpdateState) => void } = $props();

	let recovering = $state(false);

	async function handleDiscardAndPull() {
		if (!onStateChange) return;

		recovering = true;

		try {
			// Discard uncommitted changes
			await window.electronAPI.discardChanges(repoState.repoPath);

			// Get default branch
			const defaultBranch = await window.electronAPI.getDefaultBranch(repoState.repoPath);

			// Checkout to default branch
			await window.electronAPI.checkoutBranch(repoState.repoPath, defaultBranch);

			// Pull updates
			const pullResult = await window.electronAPI.pullUpdates(repoState.repoPath);

			// Update state to done
			onStateChange({
				...repoState,
				status: 'done',
				hasUncommittedChanges: false,
				upToDate: pullResult.upToDate,
				message: pullResult.upToDate ? 'Already up to date' : 'Updated successfully'
			});
		} catch (err) {
			onStateChange({
				...repoState,
				status: 'error',
				error: err instanceof Error ? err.message : 'Failed to recover'
			});
		} finally {
			recovering = false;
		}
	}

	let statusLabel = $derived(() => {
		switch (repoState.status) {
			case 'pending':
				return 'Waiting...';
			case 'checking':
				return 'Checking...';
			case 'cloning':
				return 'Cloning repository...';
			case 'pulling':
				return 'Pulling updates...';
			case 'done':
				return repoState.upToDate ? 'Already up to date' : 'Updated successfully';
			case 'error':
				return 'Error';
			case 'skipped':
				return 'Skipped - uncommitted changes';
			default:
				return '';
		}
	});

	let statusClass = $derived(() => {
		switch (repoState.status) {
			case 'pending':
				return 'status-pending';
			case 'checking':
				return 'status-checking';
			case 'cloning':
				return 'status-cloning';
			case 'pulling':
				return 'status-pulling';
			case 'done':
				return 'status-done';
			case 'error':
				return 'status-error';
			case 'skipped':
				return 'status-skipped';
			default:
				return '';
		}
	});

	let isActive = $derived(
		repoState.status === 'checking' || repoState.status === 'cloning' || repoState.status === 'pulling'
	);
</script>

<article
	class="update-card {statusClass()}"
	aria-live={repoState.status === 'error' ? 'assertive' : 'polite'}
	aria-atomic="true"
>
	<div class="card-header">
		<h3 class="repo-name">{repoState.repoName}</h3>
		<span class="status-badge" class:active={isActive}>
			{#if isActive}
				<span class="spinner"></span>
			{/if}
			{statusLabel()}
		</span>
	</div>

	<p class="repo-path">{repoState.repoPath}</p>

	{#if repoState.message}
		<p class="message">{repoState.message}</p>
	{/if}

	{#if repoState.error}
		<p class="error-message" role="alert">{repoState.error}</p>
	{/if}

	{#if repoState.status === 'skipped' && repoState.hasUncommittedChanges}
		<button class="discard-btn" onclick={handleDiscardAndPull} disabled={recovering}>
			{#if recovering}
				<span class="spinner"></span>
				Updating...
			{:else}
				Discard changes & pull
			{/if}
		</button>
	{/if}
</article>

<style>
	.update-card {
		padding: var(--spacing-md);
		background-color: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		transition: border-color 0.2s;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.repo-name {
		margin: 0;
		font-size: var(--font-size-base);
		font-weight: 600;
		word-break: break-word;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-sm);
		font-weight: 500;
		border-radius: var(--border-radius);
		white-space: nowrap;
	}

	.status-badge.active {
		background-color: var(--color-primary);
		color: white;
	}

	.spinner {
		display: inline-block;
		width: 12px;
		height: 12px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.repo-path {
		margin: var(--spacing-xs) 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		word-break: break-all;
	}

	.message {
		margin: var(--spacing-sm) 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.error-message {
		margin: var(--spacing-sm) 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-error);
		font-weight: 500;
	}

	/* Status-specific styles */
	.status-pending {
		border-color: var(--color-border);
	}

	.status-pending .status-badge {
		background-color: var(--color-bg-secondary);
		color: var(--color-text-secondary);
	}

	.status-checking,
	.status-cloning,
	.status-pulling {
		border-color: var(--color-primary);
	}

	.status-done {
		border-color: var(--color-success);
	}

	.status-done .status-badge {
		background-color: var(--color-success);
		color: white;
	}

	.status-error {
		border-color: var(--color-error);
	}

	.status-error .status-badge {
		background-color: var(--color-error);
		color: white;
	}

	.status-skipped {
		border-color: var(--color-warning, #d97706);
	}

	.status-skipped .status-badge {
		background-color: var(--color-warning, #d97706);
		color: white;
	}

	.discard-btn {
		margin-top: var(--spacing-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: white;
		background-color: var(--color-warning, #d97706);
		border: none;
		border-radius: var(--border-radius);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		transition: background-color 0.2s;
	}

	.discard-btn:hover:not(:disabled) {
		background-color: var(--color-warning-hover, #b45309);
	}

	.discard-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
</style>
