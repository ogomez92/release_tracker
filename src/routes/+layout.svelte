<script lang="ts">
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/styles/global.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Release Tracker</title>
</svelte:head>

<a href="#main-content" class="skip-link">Skip to main content</a>

<div class="app-container">
	<header>
		<h1>Release Tracker</h1>
		<nav aria-label="Main navigation">
			<ul role="list">
				<li>
					<a
						href="/add"
						aria-current={$page.url.pathname === '/add' ? 'page' : undefined}
						class:active={$page.url.pathname === '/add'}
					>
						Add Repositories
					</a>
				</li>
				<li>
					<a
						href="/releases"
						aria-current={$page.url.pathname === '/releases' ? 'page' : undefined}
						class:active={$page.url.pathname === '/releases'}
					>
						Release History
					</a>
				</li>
				<li>
					<a
						href="/settings"
						aria-current={$page.url.pathname === '/settings' ? 'page' : undefined}
						class:active={$page.url.pathname === '/settings'}
					>
						Settings
					</a>
				</li>
				<li>
					<a
						href="/update"
						aria-current={$page.url.pathname === '/update' ? 'page' : undefined}
						class:active={$page.url.pathname === '/update'}
					>
						Update Repos
					</a>
				</li>
			</ul>
		</nav>
	</header>

	<main id="main-content">
		{@render children()}
	</main>
</div>

<style>
	.app-container {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--spacing-md);
	}

	header {
		margin-bottom: var(--spacing-xl);
	}

	header h1 {
		margin-bottom: var(--spacing-md);
		color: var(--color-text);
	}

	nav ul {
		list-style: none;
		display: flex;
		gap: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0;
	}

	nav a {
		display: block;
		padding: var(--spacing-sm) var(--spacing-md);
		color: var(--color-text-secondary);
		text-decoration: none;
		border-bottom: 2px solid transparent;
		transition:
			color 0.2s,
			border-color 0.2s;
		margin-bottom: -1px;
	}

	nav a:hover {
		color: var(--color-text);
		text-decoration: none;
	}

	nav a.active,
	nav a[aria-current='page'] {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
		font-weight: 600;
	}

	nav a:focus {
		outline: var(--focus-outline-width) solid var(--color-focus);
		outline-offset: var(--focus-outline-offset);
	}

	main {
		min-height: 60vh;
	}
</style>
