<script lang="ts">
	import Navbar from './Navbar.svelte';

	// Props for customizing the layout
	let { showNavbar = true, children } = $props();
</script>

{#if showNavbar}
	<Navbar />
{/if}

<main class="main-content">
	{@render children()}
</main>

<style>
	.main-content {
		min-height: calc(100vh - 64px); /* Account for navbar height */
	}
</style>
