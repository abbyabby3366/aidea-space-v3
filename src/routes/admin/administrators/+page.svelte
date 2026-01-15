<script lang="ts">
	import { onMount } from 'svelte';

	interface Admin {
		id: string;
		email?: string;
		phone?: string;
		createdAt: string;
		role: 'admin' | 'user';
		isAdmin: boolean;
		fullname?: string;
	}

	let admins: Admin[] = [];
	let loading = true;
	let searchTerm = '';
	let statusFilter = 'all';
	let filteredAdmins: Admin[] = [];

	// CRUD state
	let showAddModal = false;
	let showEditModal = false;
	let showDeleteModal = false;
	let selectedAdmin: Admin | null = null;
	let newAdmin = {
		email: '',
		phone: '',
		fullname: '',
		password: '',
		isAdmin: true
	};
	let editAdmin = {
		email: '',
		phone: '',
		fullname: '',
		password: '',
		isAdmin: true
	};

	onMount(async () => {
		await loadAdmins();
	});

	async function loadAdmins() {
		try {
			const token = localStorage.getItem('authToken');
			console.log('Loading admins...');
			const response = await fetch('/api/admin/admins', {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				console.log('Admins response:', data);
				admins = data.admins;
				console.log('Admins loaded:', admins);
				filterAdmins();
			} else {
				console.error('Failed to load admins:', response.status);
				const errorData = await response.json();
				console.error('Error details:', errorData);
			}
		} catch (error) {
			console.error('Error loading admins:', error);
		} finally {
			loading = false;
		}
	}

	function filterAdmins() {
		filteredAdmins = admins.filter((admin) => {
			const matchesSearch =
				!searchTerm ||
				(admin.email && admin.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
				(admin.phone && admin.phone.includes(searchTerm)) ||
				(admin.fullname && admin.fullname.toLowerCase().includes(searchTerm.toLowerCase()));

			return matchesSearch;
		});
	}

	// Search function
	function handleSearch() {
		filterAdmins();
	}

	// Handle Enter key press in search input
	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSearch();
		}
	}

	$: {
		filterAdmins();
	}

	// Add new admin
	async function addAdmin() {
		try {
			const token = localStorage.getItem('authToken');
			const response = await fetch('/api/admin/admins', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newAdmin)
			});

			if (response.ok) {
				await loadAdmins();
				showAddModal = false;
				newAdmin = { email: '', phone: '', fullname: '', password: '', isAdmin: true };
			} else {
				const error = await response.json();
				alert(`Error: ${error.message}`);
			}
		} catch (error) {
			console.error('Error adding admin:', error);
			alert('Error adding admin');
		}
	}

	// Edit admin
	function openEditModal(admin: Admin) {
		selectedAdmin = admin;
		editAdmin = {
			email: admin.email || '',
			phone: admin.phone || '',
			fullname: admin.fullname || '',
			password: '',
			isAdmin: admin.isAdmin || true
		};
		showEditModal = true;
	}

	async function updateAdmin() {
		if (!selectedAdmin) return;

		try {
			const token = localStorage.getItem('authToken');
			const response = await fetch(`/api/admin/admins/${selectedAdmin.id}`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(editAdmin)
			});

			if (response.ok) {
				await loadAdmins();
				showEditModal = false;
				selectedAdmin = null;
			} else {
				const error = await response.json();
				alert(`Error: ${error.message}`);
			}
		} catch (error) {
			console.error('Error updating admin:', error);
			alert('Error updating admin');
		}
	}

	// Delete admin
	function openDeleteModal(admin: Admin) {
		selectedAdmin = admin;
		showDeleteModal = true;
	}

	async function deleteAdmin() {
		if (!selectedAdmin) return;

		try {
			const token = localStorage.getItem('authToken');
			const response = await fetch(`/api/admin/admins/${selectedAdmin.id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				await loadAdmins();
				showDeleteModal = false;
				selectedAdmin = null;
			} else {
				const error = await response.json();
				alert(`Error: ${error.message}`);
			}
		} catch (error) {
			console.error('Error deleting admin:', error);
			alert('Error deleting admin');
		}
	}

	// Toggle admin status
	// Toggle admin status - Removed in schema refactor
	// async function toggleAdminStatus(adminId: string, currentStatus: string) { ... }

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	// Clear database and create new admin
	async function clearDatabase() {
		if (
			!confirm(
				'⚠️ WARNING: This will delete ALL data from the database and create a new admin user. This action cannot be undone. Are you sure you want to continue?'
			)
		) {
			return;
		}

		try {
			const token = localStorage.getItem('authToken');
			const response = await fetch('/api/admin/clear-database', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				alert(
					`✅ Database cleared successfully!\n\nNew admin users created:\n\n1. Phone: ${data.adminPhone}\n   Password: ${data.adminPassword}\n\n2. Email: ${data.adminEmail}\n   Password: ${data.adminPassword}\n\nYou will be logged out. Please log in with either account.`
				);

				// Clear local storage and redirect to login
				localStorage.removeItem('authToken');
				window.location.href = '/auth';
			} else {
				const error = await response.json();
				alert(`Error: ${error.message}`);
			}
		} catch (error) {
			console.error('Error clearing database:', error);
			alert('Error clearing database');
		}
	}
</script>

<svelte:head>
	<title>Administrators - Admin Panel - Confetti Circle Club</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h2 class="text-lg font-medium text-gray-900">Administrators</h2>
		</div>
		<div class="mt-4 flex space-x-3 sm:mt-0">
			<button
				onclick={() => (showAddModal = true)}
				class="inline-flex items-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
			>
				<svg
					class="mr-2 -ml-1 h-4 w-4 text-white"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6v6m0 0v6m0-6h6m-6 0H6"
					/>
				</svg>
				Add Admin
			</button>
			<button
				onclick={loadAdmins}
				class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
			>
				<svg class="mr-2 -ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				Refresh
			</button>
			<button
				onclick={clearDatabase}
				class="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
			>
				<svg class="mr-2 -ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
				Clear Database
			</button>
		</div>
	</div>

	<!-- Filters -->
	<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div>
				<label for="search" class="block text-sm font-medium text-gray-700">Search</label>
				<div class="mt-1 flex rounded-md shadow-sm">
					<input
						type="text"
						id="search"
						bind:value={searchTerm}
						onkeypress={handleKeyPress}
						placeholder="Search by name, email, phone..."
						class="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
					/>
					<button
						type="button"
						onclick={handleSearch}
						aria-label="Search administrators"
						class="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-purple-500 focus:ring-purple-500"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</button>
				</div>
			</div>
			<div>
			</div>
			<div class="flex items-end">
				<button
					onclick={() => {
						searchTerm = '';
						filterAdmins();
					}}
					class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
				>
					Clear Search
				</button>
			</div>
		</div>
	</div>

	<!-- Admins Table -->
	{#if loading}
		<div class="flex justify-center py-12">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
		</div>
	{:else if filteredAdmins.length === 0}
		<div class="py-12 text-center">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">No administrators found</h3>
			<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
		</div>
	{:else}
		<div class="overflow-hidden bg-white shadow sm:rounded-md">
			<ul class="divide-y divide-gray-200">
				{#each filteredAdmins as admin}
					<li>
						<div class="px-4 py-4 sm:px-6">
							<div class="flex items-center justify-between">
								<div class="flex items-center">
									<div class="flex-shrink-0">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100"
										>
											<span class="text-sm font-medium text-purple-800">
												{(admin.fullname || admin.email || admin.phone || 'A')
													.charAt(0)
													.toUpperCase()}
											</span>
										</div>
									</div>
									<div class="ml-4">
										<div class="flex items-center">
											<p class="text-sm font-medium text-gray-900">
												{admin.fullname || admin.email || admin.phone || 'Unknown'}
											</p>
											<span
												class="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800"
											>
												{admin.role.toUpperCase()}
											</span>
										</div>
										<div class="mt-1 flex items-center text-sm text-gray-500">
											{#if admin.fullname && admin.email}
												<span>{admin.email}</span>
											{:else if admin.email}
												<span>{admin.email}</span>
											{:else if admin.phone}
												<span>{admin.phone}</span>
											{/if}
											<span class="mx-2">•</span>
											<span>Joined: {formatDate(admin.createdAt)}</span>
										</div>
									</div>
								</div>
								<div class="flex items-center space-x-3">
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800"
									>
										Active
									</span>
									<button
										onclick={() => openEditModal(admin)}
										class="text-sm text-blue-600 hover:text-blue-800"
									>
										Edit
									</button>
									<button

										onclick={() => openDeleteModal(admin)}
										class="text-sm text-red-600 hover:text-red-800"
									>
										Delete
									</button>
								</div>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Summary -->
		<div class="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
				<div>
					<p class="text-2xl font-bold text-gray-900">{filteredAdmins.length}</p>
					<p class="text-sm text-gray-500">Total Users</p>
				</div>
				<div>
					<p class="text-2xl font-bold text-green-600">
						{filteredAdmins.filter((a) => a.role === 'admin').length}
					</p>
					<p class="text-sm text-gray-500">Admins</p>
				</div>
				<div>
					<p class="text-2xl font-bold text-blue-600">
						{filteredAdmins.filter((a) => a.role === 'user').length}
					</p>
					<p class="text-sm text-gray-500">Users</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Add Admin Modal -->
{#if showAddModal}
	<div class="bg-opacity-50 fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600">
		<div class="relative top-20 mx-auto w-96 rounded-md border bg-white p-5 shadow-lg">
			<div class="mt-3">
				<h3 class="mb-4 text-lg font-medium text-gray-900">Add New Administrator</h3>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						addAdmin();
					}}
					class="space-y-4"
				>
					<div>
						<label for="phone" class="block text-sm font-medium text-gray-700">Phone</label>
						<input
							type="tel"
							id="phone"
							bind:value={newAdmin.phone}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
							required
							placeholder="Enter phone number"
						/>
					</div>
					<div>
						<label for="fullname" class="block text-sm font-medium text-gray-700">Full Name</label>
						<input
							type="text"
							id="fullname"
							bind:value={newAdmin.fullname}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
							placeholder="Enter full name"
						/>
					</div>
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700"
							>Email (Optional)</label
						>
						<input
							type="email"
							id="email"
							bind:value={newAdmin.email}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
							placeholder="Enter email address"
						/>
					</div>
					<div>
						<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
						<input
							type="password"
							id="password"
							bind:value={newAdmin.password}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
							required
							placeholder="Enter password"
						/>
					</div>
					<div class="flex justify-end space-x-3">
						<button
							type="button"
							onclick={() => (showAddModal = false)}
							class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
						>
							Add Administrator
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Admin Modal -->
{#if showEditModal && selectedAdmin}
	<div class="bg-opacity-50 fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600">
		<div class="relative top-20 mx-auto w-96 rounded-md border bg-white p-5 shadow-lg">
			<div class="mt-3">
				<h3 class="mb-4 text-lg font-medium text-gray-900">Edit Administrator</h3>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						updateAdmin();
					}}
					class="space-y-4"
				>
					<div>
						<label for="edit-phone" class="block text-sm font-medium text-gray-700">Phone</label>
						<input
							type="tel"
							id="edit-phone"
							bind:value={editAdmin.phone}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
							required
							placeholder="Enter phone number"
						/>
					</div>
					<div>
						<label for="edit-fullname" class="block text-sm font-medium text-gray-700"
							>Full Name</label
						>
						<input
							type="text"
							id="edit-fullname"
							bind:value={editAdmin.fullname}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
							placeholder="Enter full name"
						/>
					</div>
					<div>
						<label for="edit-email" class="block text-sm font-medium text-gray-700"
							>Email (Optional)</label
						>
						<input
							type="email"
							id="edit-email"
							bind:value={editAdmin.email}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
							placeholder="Enter email address"
						/>
					</div>
					<div>
						<label for="edit-password" class="block text-sm font-medium text-gray-700"
							>New Password (Optional)</label
						>
						<input
							type="password"
							id="edit-password"
							bind:value={editAdmin.password}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
							placeholder="Enter new password (leave blank to keep current)"
						/>
						<p class="mt-1 text-xs text-gray-500">Leave blank to keep current password.</p>
					</div>
					<div class="flex justify-end space-x-3">
						<button
							type="button"
							onclick={() => (showEditModal = false)}
							class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
						>
							Update Administrator
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && selectedAdmin}
	<div class="bg-opacity-50 fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600">
		<div class="relative top-20 mx-auto w-96 rounded-md border bg-white p-5 shadow-lg">
			<div class="mt-3 text-center">
				<h3 class="mb-4 text-lg font-medium text-gray-900">Delete Administrator</h3>
				<p class="mb-6 text-sm text-gray-500">
					Are you sure you want to delete <strong
						>{selectedAdmin.email || selectedAdmin.phone || 'this administrator'}</strong
					>? This action cannot be undone.
				</p>
				<div class="flex justify-center space-x-3">
					<button
						onclick={() => (showDeleteModal = false)}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						onclick={deleteAdmin}
						class="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
