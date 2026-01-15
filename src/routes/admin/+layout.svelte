<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { Toast } from '$lib/components';

	let isAdmin = false;
	let loading = true;
	let adminName = '';
	let isMenuOpen = false;

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
						adminName = data.user?.name || 'Admin';
					}
				} catch (error) {
					console.error('Error verifying admin status:', error);
				}
			}
			loading = false;
		}
	});

	$: currentPath = $page.url.pathname;
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
					href="/auth"
					class="mt-4 inline-flex items-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
				>
					Return to Home
				</a>
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<header class="border-b border-gray-200 bg-white shadow-sm">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between py-1">
					<!-- Mobile menu button and title -->
					<div class="flex items-center">
						<button
							class="mr-4 text-gray-500 hover:text-gray-700 md:hidden"
							onclick={() => (isMenuOpen = !isMenuOpen)}
							aria-label="Toggle menu"
						>
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
								/>
							</svg>
						</button>
						<h1 class="text-lg font-bold text-gray-900 sm:text-2xl">Template-App Panel</h1>
						<span
							class="ml-3 inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800"
						>
							Administrator
						</span>
						{#if adminName}
							<span class="ml-4 text-sm text-gray-600">
								Welcome, {adminName}
							</span>
						{/if}
					</div>
					<!-- Desktop home and logout buttons -->
					<div class="hidden items-center space-x-4 md:flex">
						<a href="/" class="text-gray-500 hover:text-gray-700" aria-label="Go to home page">
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
								/>
							</svg>
						</a>
						<button
							onclick={() => {
								localStorage.removeItem('authToken');
								window.location.href = '/';
							}}
							class="text-gray-500 hover:text-gray-700"
							aria-label="Logout"
						>
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</header>

		<!-- Navigation -->
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<!-- Mobile Navigation Menu -->
			{#if isMenuOpen}
				<div class="fixed inset-0 z-50 md:hidden">
					<div
						class="bg-opacity-25 fixed inset-0 bg-black"
						onclick={() => (isMenuOpen = false)}
						onkeydown={(e) => {
							if (e.key === 'Escape') isMenuOpen = false;
						}}
						role="button"
						tabindex="-1"
						aria-label="Close menu"
					></div>
					<div class="fixed top-0 left-0 h-full w-64 bg-white shadow-lg">
						<div class="flex h-full flex-col">
							<!-- Mobile Menu Header -->
							<div class="flex items-center justify-between border-b border-gray-200 p-4">
								<h2 class="text-lg font-semibold text-gray-900">Menu</h2>
								<button
									onclick={() => (isMenuOpen = false)}
									class="text-gray-500 hover:text-gray-700"
									aria-label="Close menu"
								>
									<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>

							<!-- Mobile Navigation Links -->
							<nav class="flex-1 space-y-2 px-4 py-4">
								<a
									href="/admin/administrators"
									class="block rounded-md px-3 py-2 text-base font-medium {currentPath ===
									'/admin/administrators'
										? 'bg-purple-100 text-purple-700'
										: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
									onclick={() => (isMenuOpen = false)}
								>
									Administrators
								</a>
								<a
									href="/admin/staff"
									class="block rounded-md px-3 py-2 text-base font-medium {currentPath ===
									'/admin/staff'
										? 'bg-purple-100 text-purple-700'
										: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
									onclick={() => (isMenuOpen = false)}
								>
									Staff
								</a>
								<a
									href="/admin/whatsapp"
									class="block rounded-md px-3 py-2 text-base font-medium {currentPath ===
									'/admin/whatsapp'
										? 'bg-purple-100 text-purple-700'
										: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
									onclick={() => (isMenuOpen = false)}
								>
									WhatsApp
								</a>
								<a
									href="/admin/google-sheets"
									class="block rounded-md px-3 py-2 text-base font-medium {currentPath ===
									'/admin/google-sheets'
										? 'bg-purple-100 text-purple-700'
										: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
									onclick={() => (isMenuOpen = false)}
								>
									Google Sheets
								</a>
							</nav>

							<!-- Mobile Home and Logout -->
							<div class="space-y-2 border-t border-gray-200 p-4">
								<a
									href="/"
									class="flex items-center rounded-md px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
									onclick={() => (isMenuOpen = false)}
								>
									<svg class="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
										/>
									</svg>
									Home
								</a>
								<button
									onclick={() => {
										localStorage.removeItem('authToken');
										window.location.href = '/';
										isMenuOpen = false;
									}}
									class="flex w-full items-center rounded-md px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
								>
									<svg class="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
										/>
									</svg>
									Logout
								</button>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Desktop Navigation Tabs -->
			<div class="hidden border-b border-gray-200 md:block">
				<nav class="-mb-px flex space-x-8">
					<a
						href="/admin/administrators"
						class="border-b-2 px-1 py-2 text-sm font-medium {currentPath === '/admin/administrators'
							? 'border-purple-500 text-purple-600'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					>
						Administrators
					</a>
					<a
						href="/admin/staff"
						class="border-b-2 px-1 py-2 text-sm font-medium {currentPath === '/admin/staff'
							? 'border-purple-500 text-purple-600'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					>
						Staff
					</a>
					<a
						href="/admin/whatsapp"
						class="border-b-2 px-1 py-2 text-sm font-medium {currentPath === '/admin/whatsapp'
							? 'border-purple-500 text-purple-600'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					>
						WhatsApp
					</a>
					<a
						href="/admin/google-sheets"
						class="border-b-2 px-1 py-2 text-sm font-medium {currentPath === '/admin/google-sheets'
							? 'border-purple-500 text-purple-600'
							: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					>
						Google Sheets
					</a>
				</nav>
			</div>
		</div>

		<!-- Page Content -->
		<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<slot />
		</main>

		<!-- Toast Notifications -->
		<Toast />
	</div>
{/if}

<style>
	/* Override global white text for admin panel */
	:global(.min-h-screen.bg-gray-50) {
		background: white;
		color: #1f2937; /* text-gray-800 */
	}

	:global(.min-h-screen.bg-gray-50 h1),
	:global(.min-h-screen.bg-gray-50 h2),
	:global(.min-h-screen.bg-gray-50 h3),
	:global(.min-h-screen.bg-gray-50 h4),
	:global(.min-h-screen.bg-gray-50 h5),
	:global(.min-h-screen.bg-gray-50 h6) {
		color: #111827; /* text-gray-900 */
	}

	:global(.min-h-screen.bg-gray-50 p) {
		color: #6b7280; /* text-gray-500 */
	}

	:global(.min-h-screen.bg-gray-50 label) {
		color: #374151; /* text-gray-700 */
	}

	:global(.min-h-screen.bg-gray-50 input:not([type='checkbox'])),
	:global(.min-h-screen.bg-gray-50 select),
	:global(.min-h-screen.bg-gray-50 textarea) {
		color: #1f2937; /* text-gray-800 */
		background-color: white;
	}

	:global(.min-h-screen.bg-gray-50 .text-gray-900) {
		color: #111827;
	}

	:global(.min-h-screen.bg-gray-50 .text-gray-700) {
		color: #374151;
	}

	:global(.min-h-screen.bg-gray-50 .text-gray-500) {
		color: #6b7280;
	}

	:global(.min-h-screen.bg-gray-50 .text-gray-400) {
		color: #9ca3af;
	}

	:global(.min-h-screen.bg-gray-50 .bg-white) {
		background-color: white;
	}

	:global(.min-h-screen.bg-gray-50 .bg-gray-50) {
		background-color: #f9fafb;
	}

	:global(.min-h-screen.bg-gray-50 .bg-gray-100) {
		background-color: #f3f4f6;
	}

	/* Override global background for admin panel */
	:global(.min-h-screen.bg-gray-50) {
		background: white;
	}

	/* Ensure admin panel has proper contrast but preserve text-white classes */
	:global(.min-h-screen.bg-gray-50 *:not(.text-white)) {
	}

	/* Ensure text-white classes work properly in admin panel */
	:global(.min-h-screen.bg-gray-50 .text-white) {
		color: var(--color-white);
	}
</style>
