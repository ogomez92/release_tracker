<script lang="ts">
	import type { RepoUpdateState } from '$lib/types';

	let { state }: { state: RepoUpdateState } = $props();

	let statusLabel = $derived(() => {
		switch (state.status) {
			case 'pending':
				return 'Waiting...';
			case 'checking':
				return 'Checking...';
			case 'cloning':
				return 'Cloning repository...';
			case 'pulling':
				return 'Pulling updates...';
			case 'done':
				return state.upToDate ? 'Already up to date' : 'Updated successfully';
			case 'error':
				return 'Error';
			case 'skipped':
				return 'Skipped - uncommitted changes';
			default:
				return '';
		}
	});

	let statusClass = $derived(() => {
		switch (state.status) {
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
		state.status === 'checking' || state.status === 'cloning' || state.status === 'pulling'
	);
</script>

<article
	class="update-card {statusClass()}"
	aria-live={state.status === 'error' ? 'assertive' : 'polite'}
	aria-atomic="true"
>
	<div class="card-header">
		<h3 class="repo-name">{state.repoName}</h3>
		<span class="status-badge" class:active={isActive}>
			{#if isActive}
				<span class="spinner"></span>
			{/if}
			{statusLabel()}
		</span>
	</div>

	<p class="repo-path">{state.repoPath}</p>

	{#if state.message}
		<p class="message">{state.message}</p>
	{/if}

	{#if state.error}
		<p class="error-message" role="alert">{state.error}</p>
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
</style>
