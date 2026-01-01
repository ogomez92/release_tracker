<script lang="ts">
	import { onMount } from 'svelte';

	let token = $state('');
	let savedToken = $state(false);
	let saving = $state(false);
	let loading = $state(true);
	let rateLimit = $state<{
		limit: number;
		remaining: number;
		reset: string;
		used: number;
	} | null>(null);
	let loadingRateLimit = $state(false);
	let exporting = $state(false);
	let importing = $state(false);
	let exportMessage = $state('');
	let importMessage = $state('');

	onMount(async () => {
		await loadToken();
		await checkRateLimit();
	});

	async function loadToken() {
		loading = true;
		try {
			const stored = await window.electronAPI.getGitHubToken();
			if (stored) {
				token = stored;
				savedToken = true;
			}
		} catch (err) {
			console.error('Error loading token:', err);
		} finally {
			loading = false;
		}
	}

	async function saveToken() {
		saving = true;
		try {
			await window.electronAPI.saveGitHubToken(token);
			savedToken = true;
			await checkRateLimit();
		} catch (err) {
			console.error('Error saving token:', err);
			alert('Failed to save token. Please try again.');
		} finally {
			saving = false;
		}
	}

	async function removeToken() {
		if (!confirm('Are you sure you want to remove your GitHub token?')) {
			return;
		}

		saving = true;
		try {
			await window.electronAPI.removeGitHubToken();
			token = '';
			savedToken = false;
			rateLimit = null;
		} catch (err) {
			console.error('Error removing token:', err);
			alert('Failed to remove token. Please try again.');
		} finally {
			saving = false;
		}
	}

	async function checkRateLimit() {
		loadingRateLimit = true;
		try {
			rateLimit = await window.electronAPI.getRateLimit();
		} catch (err) {
			console.error('Error checking rate limit:', err);
		} finally {
			loadingRateLimit = false;
		}
	}

	async function handleExport() {
		exporting = true;
		exportMessage = '';
		try {
			const result = await window.electronAPI.exportData();
			exportMessage = result.success
				? `Data exported successfully to: ${result.path}`
				: 'Export failed';
		} catch (err) {
			exportMessage = 'Export failed: ' + (err instanceof Error ? err.message : 'Unknown error');
		} finally {
			exporting = false;
		}
	}

	async function handleImport() {
		importing = true;
		importMessage = '';
		try {
			const result = await window.electronAPI.importData();
			if (result.success) {
				importMessage = `Successfully imported ${result.repoCount} repositories and ${result.releaseCount} releases`;
				// Reload the page to reflect imported data
				setTimeout(() => window.location.reload(), 2000);
			} else {
				importMessage = result.message || 'Import cancelled';
			}
		} catch (err) {
			importMessage = 'Import failed: ' + (err instanceof Error ? err.message : 'Unknown error');
		} finally {
			importing = false;
		}
	}

	function formatResetTime(resetTime: string): string {
		const date = new Date(parseInt(resetTime) * 1000);
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getRateLimitPercentage(): number {
		if (!rateLimit) return 0;
		return (rateLimit.remaining / rateLimit.limit) * 100;
	}

	function getRateLimitColor(): string {
		const percentage = getRateLimitPercentage();
		if (percentage > 50) return '#4caf50';
		if (percentage > 25) return '#ff9800';
		return '#f44336';
	}
</script>

<svelte:head>
	<title>Settings - Release Tracker</title>
</svelte:head>

<div class="settings-container">
	<h2>Settings</h2>

	<!-- GitHub Token Section -->
	<section class="settings-section">
		<h3>GitHub Authentication</h3>
		<p class="section-description">
			Add a GitHub Personal Access Token to increase API rate limits from 60 to 5,000 requests per
			hour.
		</p>

		{#if loading}
			<div class="loading-inline">
				<span class="loading"></span>
				<span>Loading...</span>
			</div>
		{:else}
			<div class="token-form">
				<label for="github-token">
					Personal Access Token
					<a
						href="https://github.com/settings/tokens/new?description=Release%20Tracker&scopes=repo"
						target="_blank"
						rel="noopener noreferrer"
						class="help-link"
					>
						(Create token)
					</a>
				</label>
				<input
					id="github-token"
					type="password"
					bind:value={token}
					placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
					disabled={saving}
				/>

				<div class="button-group">
					<button type="button" onclick={saveToken} disabled={saving || !token} class="primary">
						{saving ? 'Saving...' : savedToken ? 'Update Token' : 'Save Token'}
					</button>

					{#if savedToken}
						<button type="button" onclick={removeToken} disabled={saving} class="secondary">
							Remove Token
						</button>
					{/if}
				</div>
			</div>

			<!-- Rate Limit Status -->
			{#if rateLimit}
				<div class="rate-limit-status">
					<h4>API Rate Limit Status</h4>
					<div class="rate-limit-info">
						<div class="rate-limit-bar">
							<div
								class="rate-limit-fill"
								style="width: {getRateLimitPercentage()}%; background-color: {getRateLimitColor()};"
							></div>
						</div>
						<div class="rate-limit-details">
							<span><strong>{rateLimit.remaining}</strong> / {rateLimit.limit} requests remaining</span>
							<span>Resets at {formatResetTime(rateLimit.reset)}</span>
						</div>
					</div>
					<button
						type="button"
						onclick={checkRateLimit}
						disabled={loadingRateLimit}
						class="secondary small"
					>
						{loadingRateLimit ? 'Checking...' : 'Refresh Status'}
					</button>
				</div>
			{/if}
		{/if}
	</section>

	<!-- Data Management Section -->
	<section class="settings-section">
		<h3>Data Management</h3>
		<p class="section-description">
			Export your tracked repositories and releases to back them up, or import previously exported
			data.
		</p>

		<div class="data-actions">
			<div class="action-item">
				<button type="button" onclick={handleExport} disabled={exporting} class="secondary">
					{exporting ? 'Exporting...' : 'Export Data'}
				</button>
				{#if exportMessage}
					<p class="action-message" role="status">{exportMessage}</p>
				{/if}
			</div>

			<div class="action-item">
				<button type="button" onclick={handleImport} disabled={importing} class="secondary">
					{importing ? 'Importing...' : 'Import Data'}
				</button>
				{#if importMessage}
					<p class="action-message" role="status">{importMessage}</p>
				{/if}
			</div>
		</div>
	</section>
</div>

<style>
	.settings-container {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--spacing-lg);
	}

	h2 {
		margin-bottom: var(--spacing-xl);
		color: var(--color-text-primary);
	}

	.settings-section {
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-lg);
		margin-bottom: var(--spacing-lg);
	}

	.settings-section h3 {
		margin: 0 0 var(--spacing-sm) 0;
		color: var(--color-text-primary);
		font-size: var(--font-size-lg);
	}

	.section-description {
		margin-bottom: var(--spacing-md);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.loading-inline {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.token-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.token-form label {
		font-weight: 600;
		color: var(--color-text-primary);
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.help-link {
		font-weight: 400;
		font-size: var(--font-size-sm);
		color: var(--color-primary);
	}

	.token-form input {
		padding: var(--spacing-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		font-size: var(--font-size-base);
		font-family: 'Courier New', monospace;
	}

	.button-group {
		display: flex;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.rate-limit-status {
		margin-top: var(--spacing-lg);
		padding-top: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
	}

	.rate-limit-status h4 {
		margin: 0 0 var(--spacing-md) 0;
		font-size: var(--font-size-base);
		color: var(--color-text-primary);
	}

	.rate-limit-info {
		margin-bottom: var(--spacing-md);
	}

	.rate-limit-bar {
		height: 24px;
		background-color: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		overflow: hidden;
		margin-bottom: var(--spacing-sm);
	}

	.rate-limit-fill {
		height: 100%;
		transition: width 0.3s ease, background-color 0.3s ease;
	}

	.rate-limit-details {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}

	button.small {
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-sm);
	}

	.data-actions {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.action-item {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.action-message {
		margin: 0;
		padding: var(--spacing-sm);
		background-color: var(--color-bg-primary);
		border-radius: var(--border-radius);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
</style>
