<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Toast } from '$lib/components';

	let isStaff = false;
	let loading = true;
	let staffName = '';
	let isSidebarOpen = false;

	onMount(async () => {
		if (browser) {
			const token = localStorage.getItem('authToken');
			if (!token) {
				goto('/auth');
				return;
			}

			try {
				const response = await fetch('/api/admin/verify', {
					headers: {
						Authorization: `Bearer ${token}`
					}
				});

				if (response.ok) {
					const data = await response.json();
					// Allow both staff and admin to access staff pages
					isStaff = data.user?.role === 'staff' || data.isAdmin;
					staffName = data.user?.name || 'Staff';
					
					if (!isStaff) {
						goto('/auth');
					}
				} else {
					localStorage.removeItem('authToken');
					goto('/auth');
				}
			} catch (error) {
				console.error('Error verifying staff status:', error);
				localStorage.removeItem('authToken');
				goto('/auth');
			} finally {
				loading = false;
			}
		}
	});

	function handleLogout() {
		localStorage.removeItem('authToken');
		window.location.href = '/auth';
	}

	$: currentPath = $page.url.pathname;
</script>

<svelte:head>
	<title>Staff Portal - Confetti Circle Club</title>
</svelte:head>

{#if loading}
	<div class="flex min-h-screen items-center justify-center bg-white">
		<div class="h-16 w-16 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
	</div>
{:else if isStaff}
	<div class="min-h-screen bg-gray-50 flex">
		<!-- Mobile Sidebar Overlay -->
		{#if isSidebarOpen}
			<div 
				class="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity lg:hidden"
				onclick={() => (isSidebarOpen = false)}
			></div>
		{/if}

		<!-- Sidebar -->
		<aside 
			class="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 {isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
		>
			<div class="h-full flex flex-col">
				<!-- Sidebar Header -->
				<div class="p-6 border-b border-gray-100 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="h-10 w-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-purple-200">
							S
						</div>
						<div>
							<h2 class="font-black text-gray-900 tracking-tight text-sm">Staff Portal</h2>
						</div>
					</div>
					<button 
						class="lg:hidden p-2 text-gray-400 hover:text-gray-600"
						onclick={() => (isSidebarOpen = false)}
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Navigation -->
				<nav class="flex-1 p-4 space-y-1">
					<a 
						href="/staff/jobs"
						class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm {currentPath === '/staff/jobs' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}"
						onclick={() => (isSidebarOpen = false)}
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" />
						</svg>
						Job Panel
					</a>
				</nav>

				<!-- User & Logout -->
				<div class="p-4 border-t border-gray-100 bg-gray-50">
					<div class="flex items-center gap-3 px-4 py-2 border-b border-gray-100 mb-4 pb-4">
						<div class="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">
							{staffName.charAt(0)}
						</div>
						<div class="truncate">
							<p class="text-xs font-black text-gray-900 truncate">{staffName}</p>
							<p class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Active Session</p>
						</div>
					</div>
					<button 
						onclick={handleLogout}
						class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 font-bold text-sm hover:bg-red-50 transition-all active:scale-95"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
						Sign Out
					</button>
				</div>
			</div>
		</aside>

		<!-- Main Content -->
		<div class="flex-1 flex flex-col min-w-0">
			<!-- Mobile Top Bar -->
			<header class="bg-white border-b border-gray-200 lg:hidden px-4 py-3 flex items-center justify-between sticky top-0 z-30">
				<button 
					class="p-2 -ml-2 text-gray-500"
					onclick={() => (isSidebarOpen = true)}
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<div class="font-black text-gray-900 tracking-tight">Staff Portal</div>
				<div class="w-10"></div> <!-- Spacer -->
			</header>

			<main class="flex-1 overflow-y-auto">
				<slot />
			</main>
		</div>

		<!-- Global Toast -->
		<Toast />
	</div>
{/if}

<style>
	:global(body) {
		background-color: #f9fafb;
	}
</style>
