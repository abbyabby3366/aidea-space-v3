<script lang="ts">
  import { onMount } from 'svelte';
  import { showToast } from '$lib/utils';
  import { fly } from 'svelte/transition';

  interface Staff {
    id: string;
    email?: string;
    phone: string;
    fullname: string;
    createdAt: string;
    role: string;
  }

  let staff: Staff[] = [];
  let loading = true;
  let searchTerm = '';
  let showAddModal = false;
  let showEditModal = false;
  let showDeleteModal = false;
  let selectedStaff: Staff | null = null;

  let newStaff = {
    email: '',
    phone: '',
    fullname: '',
    password: ''
  };

  let editStaffData = {
    email: '',
    phone: '',
    fullname: '',
    password: ''
  };

  onMount(async () => {
    await loadStaff();
  });

  async function loadStaff() {
    loading = true;
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/staff', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        staff = result.staff;
      } else {
        showToast('Failed to load staff list', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to server', 'error');
    } finally {
      loading = false;
    }
  }

  async function addStaff() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newStaff)
      });

      const result = await response.json();
      if (response.ok) {
        showToast('Staff user created successfully', 'success');
        showAddModal = false;
        newStaff = { email: '', phone: '', fullname: '', password: '' };
        await loadStaff();
      } else {
        showToast(result.message || 'Failed to create staff', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating staff', 'error');
    }
  }

  function openEditModal(member: Staff) {
    selectedStaff = member;
    editStaffData = {
      email: member.email || '',
      phone: member.phone,
      fullname: member.fullname || '',
      password: ''
    };
    showEditModal = true;
  }

  async function updateStaff() {
    if (!selectedStaff) return;
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editStaffData)
      });

      const result = await response.json();
      if (response.ok) {
        showToast('Staff user updated successfully', 'success');
        showEditModal = false;
        await loadStaff();
      } else {
        showToast(result.message || 'Failed to update staff', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating staff', 'error');
    }
  }

  function openDeleteModal(member: Staff) {
    selectedStaff = member;
    showDeleteModal = true;
  }

  async function deleteStaff() {
    if (!selectedStaff) return;
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (response.ok) {
        showToast('Staff user deleted successfully', 'success');
        showDeleteModal = false;
        await loadStaff();
      } else {
        showToast(result.message || 'Failed to delete staff', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting staff', 'error');
    }
  }

  $: filteredStaff = staff.filter(member => {
    const search = searchTerm.toLowerCase();
    return (
      member.fullname.toLowerCase().includes(search) ||
      member.phone.includes(search) ||
      member.email?.toLowerCase().includes(search)
    );
  });
</script>

<div class="space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h2 class="text-2xl font-black text-gray-900 tracking-tight">Staff Management</h2>
      <p class="text-sm text-gray-500 font-medium">Manage your production and field staff</p>
    </div>
    <div class="flex gap-3">
      <button
        onclick={() => (showAddModal = true)}
        class="inline-flex items-center rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all active:scale-95"
      >
        <svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
        </svg>
        Add Staff Member
      </button>
      <button
        onclick={loadStaff}
        class="inline-flex items-center rounded-xl border-2 border-gray-100 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
      >
        Refresh
      </button>
    </div>
  </div>

  <!-- Search & Filters -->
  <div class="rounded-2xl border-2 border-gray-100 bg-white p-4">
    <div class="relative max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Search staff by name, phone or email..."
        class="block w-full rounded-xl border-2 border-gray-50 bg-gray-50 pl-10 pr-4 py-2.5 text-sm font-medium focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 outline-none transition-all"
      />
    </div>
  </div>

  <!-- Staff Table -->
  <div class="overflow-hidden bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
    <table class="min-w-full divide-y divide-gray-100">
      <thead class="bg-gray-50/50">
        <tr>
          <th class="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Name / Details</th>
          <th class="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
          <th class="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined</th>
          <th class="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50">
        {#if loading}
          <tr>
            <td colspan="4" class="px-6 py-12 text-center text-gray-500 font-bold">
              <div class="h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading Staff...
            </td>
          </tr>
        {:else if filteredStaff.length === 0}
          <tr>
            <td colspan="4" class="px-6 py-12 text-center text-gray-500 font-bold">
              No staff members found
            </td>
          </tr>
        {:else}
          {#each filteredStaff as member}
            <tr class="hover:bg-purple-50/30 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="h-10 w-10 flex-shrink-0 rounded-xl bg-purple-100 flex items-center justify-center font-black text-purple-700">
                    {member.fullname.charAt(0)}
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-black text-gray-900">{member.fullname || 'Unnamed'}</p>
                    <p class="text-[11px] font-bold text-gray-400">{member.phone} {member.email ? '• ' + member.email : ''}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 uppercase tracking-wider">
                  {member.role}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500 font-medium">
                {new Date(member.createdAt).toLocaleDateString()}
              </td>
              <td class="px-6 py-4 text-right space-x-2">
                <button
                  onclick={() => openEditModal(member)}
                  class="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-widest"
                >
                  Edit
                </button>
                <button
                  onclick={() => openDeleteModal(member)}
                  class="text-red-600 hover:text-red-800 font-bold text-xs uppercase tracking-widest"
                >
                  Delete
                </button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

<!-- Modals (Add/Edit/Delete) -->
{#if showAddModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl" in:fly={{ y: 20 }}>
      <div class="p-6">
        <h3 class="text-xl font-black text-gray-900 mb-4">Add Staff Member</h3>
        <form onsubmit={(e) => { e.preventDefault(); addStaff(); }} class="space-y-4">
          <div class="space-y-1">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
            <input type="text" bind:value={newStaff.fullname} class="w-full p-2.5 bg-gray-50 border-2 border-gray-50 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-all font-medium text-sm" placeholder="John Doe" required />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
            <input type="tel" bind:value={newStaff.phone} class="w-full p-2.5 bg-gray-50 border-2 border-gray-50 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-all font-medium text-sm" placeholder="12345678" required />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email (Optional)</label>
            <input type="email" bind:value={newStaff.email} class="w-full p-2.5 bg-gray-50 border-2 border-gray-50 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-all font-medium text-sm" placeholder="john@example.com" />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Password</label>
            <input type="password" bind:value={newStaff.password} class="w-full p-2.5 bg-gray-50 border-2 border-gray-50 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-all font-medium text-sm" required />
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" onclick={() => (showAddModal = false)} class="flex-1 py-2.5 rounded-xl border-2 border-gray-100 font-bold text-gray-500 hover:bg-gray-50 transition-all text-sm">Cancel</button>
            <button type="submit" class="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all text-sm">Add Member</button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

{#if showEditModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl" in:fly={{ y: 20 }}>
      <div class="p-6">
        <h3 class="text-xl font-black text-gray-900 mb-4">Edit Staff Member</h3>
        <form onsubmit={(e) => { e.preventDefault(); updateStaff(); }} class="space-y-4">
          <div class="space-y-1">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
            <input type="text" bind:value={editStaffData.fullname} class="w-full p-2.5 bg-gray-50 border-2 border-gray-50 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-all font-medium text-sm" required />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
            <input type="tel" bind:value={editStaffData.phone} class="w-full p-2.5 bg-gray-50 border-2 border-gray-50 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-all font-medium text-sm" required />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email (Optional)</label>
            <input type="email" bind:value={editStaffData.email} class="w-full p-2.5 bg-gray-50 border-2 border-gray-50 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-all font-medium text-sm" />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">New Password (Leave blank to keep current)</label>
            <input type="password" bind:value={editStaffData.password} class="w-full p-2.5 bg-gray-50 border-2 border-gray-50 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-all font-medium text-sm" />
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" onclick={() => (showEditModal = false)} class="flex-1 py-2.5 rounded-xl border-2 border-gray-100 font-bold text-gray-500 hover:bg-gray-50 transition-all text-sm">Cancel</button>
            <button type="submit" class="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all text-sm">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

{#if showDeleteModal && selectedStaff}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center" in:fly={{ y: 20 }}>
      <div class="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-red-100">
        <svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <h3 class="text-xl font-black text-gray-900 mb-2">Delete Member?</h3>
      <p class="text-sm font-medium text-gray-500 mb-8">Are you sure you want to delete <span class="text-gray-900 font-black">{selectedStaff.fullname}</span>? This cannot be undone.</p>
      <div class="flex gap-3">
        <button onclick={() => (showDeleteModal = false)} class="flex-1 py-3 rounded-2xl border-2 border-gray-100 font-black text-gray-500 hover:bg-gray-50 transition-all text-xs">NO, KEEP</button>
        <button onclick={deleteStaff} class="flex-1 py-3 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 shadow-lg shadow-red-200 transition-all text-xs">YES, DELETE</button>
      </div>
    </div>
  </div>
{/if}
