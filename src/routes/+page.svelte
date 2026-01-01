<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		// Redirect to add page on load
		goto('/add', { replaceState: true });
	});
</script>

<svelte:head>
	<title>Release Tracker</title>
</svelte:head>

<div class="loading-container">
	<span class="loading"></span>
	<p>Loading...</p>
</div>

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		min-height: 50vh;
	}
</style>
