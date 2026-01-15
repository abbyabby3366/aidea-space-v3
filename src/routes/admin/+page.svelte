<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let isAdmin = false;
	let loading = true;

	onMount(async () => {
		if (browser) {
			// Check if user is admin
			const token = localStorage.getItem('authToken');
			if (token) {
				try {
					const response = await fetch('/api/admin/verify', {
						headers: {
							Authorization: `Bearer ${token}`
						}
					});

					if (response.ok) {
						const data = await response.json();
						isAdmin = data.isAdmin;
					}
				} catch (error) {
					console.error('Error verifying admin status:', error);
				}
			}
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Admin Panel - Confetti Circle Club</title>
</svelte:head>

{#if loading}
	<div class="flex min-h-screen items-center justify-center">
		<div class="h-32 w-32 animate-spin rounded-full border-b-2 border-purple-600"></div>
	</div>
{:else if !isAdmin}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
			<div class="text-center">
				<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
					<svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<h2 class="mt-4 text-lg font-medium text-gray-900">Access Denied</h2>
				<p class="mt-2 text-sm text-gray-600">
					You don't have permission to access the admin panel.
				</p>
				<a
					href="/"
					class="mt-4 inline-flex items-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
				>
					Return to Home
				</a>
			</div>
		</div>
	</div>
{:else}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="w-full max-w-4xl rounded-lg bg-white p-8 shadow-md">
			<div class="text-center">
				<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
					<svg
						class="h-8 w-8 text-purple-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h2 class="mt-4 text-2xl font-bold text-gray-900">Admin Panel</h2>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Add any custom styles here */
</style>
