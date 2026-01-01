<script lang="ts">
	import type { Release } from '$lib/types';

	let { release }: { release: Release } = $props();

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(date);
	}

	function getRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) return 'just now';
		if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
		if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
		if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
		if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
		return `${Math.floor(diffInSeconds / 31536000)} years ago`;
	}
</script>

<article>
	<h3>
		<a href={release.htmlUrl} target="_blank" rel="noopener noreferrer">
			{release.repoOwner}/{release.repoName} - {release.tagName}
			<span class="sr-only">(opens in new window)</span>
		</a>
	</h3>

	<div class="meta">
		<time datetime={release.publishedAt}>
			{formatDate(release.publishedAt)}
			<span class="relative-time">({getRelativeTime(release.publishedAt)})</span>
		</time>
	</div>

	{#if release.name && release.name !== release.tagName}
		<h4 class="release-name">{release.name}</h4>
	{/if}

	{#if release.body}
		<div class="release-body">
			{release.body}
		</div>
	{/if}
</article>

<style>
	article {
		padding: var(--spacing-lg);
		background-color: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		margin-bottom: var(--spacing-md);
	}

	article:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	h3 {
		margin-bottom: var(--spacing-sm);
		font-size: var(--font-size-lg);
	}

	h3 a {
		color: var(--color-primary);
		text-decoration: none;
	}

	h3 a:hover {
		text-decoration: underline;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.relative-time {
		font-style: italic;
	}

	.release-name {
		font-size: var(--font-size-base);
		font-weight: 600;
		margin-bottom: var(--spacing-sm);
	}

	.release-body {
		margin-top: var(--spacing-md);
		padding: var(--spacing-md);
		background-color: var(--color-bg-secondary);
		border-left: 3px solid var(--color-primary);
		border-radius: var(--border-radius);
		white-space: pre-wrap;
		word-wrap: break-word;
		max-height: 300px;
		overflow-y: auto;
	}
</style>
