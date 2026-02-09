<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(async () => {
		// Check if admin is already logged in
		const token = localStorage.getItem('authToken');
		if (token) {
			try {
				const adminResponse = await fetch('/api/admin/verify', {
					headers: {
						Authorization: `Bearer ${token}`
					}
				});

				if (adminResponse.ok) {
					const adminData = await adminResponse.json();
					if (adminData.isAdmin) {
						goto('/admin');
						return;
					}
				} else if (adminResponse.status === 401) {
					// Token is invalid or expired, clear it
					localStorage.removeItem('authToken');
				}
			} catch (error) {
				console.error('Error checking admin status:', error);
			}
		}

		// Not logged in or not admin, redirect to auth page
		goto('/auth');
	});
</script>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black"
>
	<div class="text-center">
		<div class="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-[#0162F6]"></div>
		<p class="text-gray-400">Redirecting...</p>
	</div>
</div>
