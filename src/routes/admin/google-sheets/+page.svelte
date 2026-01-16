<script lang="ts">
  import { onMount } from 'svelte';
  import { showToast } from '$lib/utils';
  import { fly } from 'svelte/transition';

  // Persistence keys
  const SCRIPT_URL_KEY = 'google_sheets_script_url';
  const SPREADSHEET_ID_KEY = 'google_sheets_spreadsheet_id';

  let scriptUrl = '';
  let spreadsheetId = '';
  let loading = true;
  let fetching = false;
  let data: any[] = [];
  let error = '';
  let searchTerm = '';
  let showHidden = false;

  onMount(async () => {
    await loadSettings();
    await loadCache();
  });

  async function loadSettings() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/google-sheets/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (res.success) {
        scriptUrl = res.scriptUrl || localStorage.getItem(SCRIPT_URL_KEY) || '';
        spreadsheetId = res.spreadsheetId || localStorage.getItem(SPREADSHEET_ID_KEY) || '';
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  async function loadCache() {
    if (!scriptUrl) {
      data = [];
      loading = false;
      return;
    }

    loading = true;
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        scriptUrl: scriptUrl,
        spreadsheetId: spreadsheetId || ''
      });
      
      const response = await fetch(`/api/admin/google-sheets?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        data = await response.json();
      }
    } catch (err) {
      console.error('Failed to load cache:', err);
    } finally {
      loading = false;
    }
  }

  async function saveConfig() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/google-sheets/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ scriptUrl, spreadsheetId })
      });
      const res = await response.json();
      if (res.success) {
        localStorage.setItem(SCRIPT_URL_KEY, scriptUrl);
        localStorage.setItem(SPREADSHEET_ID_KEY, spreadsheetId);
        showToast('Settings saved to database', 'success');
        loadCache();
      } else {
        showToast(res.message || 'Save failed', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    }
  }

  async function fetchData() {
    if (!scriptUrl) {
      error = 'Please provide the Apps Script Web App URL';
      return;
    }
    
    fetching = true;
    error = '';
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scriptUrl,
          action: 'fetch',
          spreadsheetId: spreadsheetId || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch data');
      }
      
      const result = await response.json();
      data = result;
      showToast(`Fetched ${data.length} sheets and saved to DB`, 'success');
    } catch (err: any) {
      console.error(err);
      error = err.message;
      showToast('Error fetching data: ' + err.message, 'error');
    } finally {
      fetching = false;
    }
  }

  async function toggleHide(sheet: any) {
    const newHiddenStatus = !sheet.hidden;
    sheet.hidden = newHiddenStatus;
    data = [...data]; // Trigger reactivity

    try {
      const token = localStorage.getItem('authToken');
      await fetch('/api/admin/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scriptUrl,
          action: 'toggleHide',
          sheetName: sheet.sheetName,
          hidden: newHiddenStatus,
          spreadsheetId: spreadsheetId || undefined
        })
      });
    } catch (err) {
      console.error('Failed to toggle hide:', err);
    }
  }

  async function updateSheet(sheet: any) {
    if (!scriptUrl) {
       showToast('Script URL is missing', 'error');
       return;
    }
    
    sheet.syncing = true;
    sheet.syncStatus = 'syncing'; // Optimistic local status
    data = [...data];
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scriptUrl,
          action: 'update',
          sheetName: sheet.sheetName,
          updates: sheet.items,
          spreadsheetId: spreadsheetId || undefined
        })
      });

      const result = await response.json();
      if (result.success) {
        showToast(result.message || 'Saved to database. Syncing...', 'success');
        // Start polling if not already started
        startPolling();
      } else {
        throw new Error(result.message || 'Failed to update');
      }
    } catch (err: any) {
      console.error(err);
      sheet.syncStatus = 'error';
      sheet.syncError = err.message;
      showToast('Update failed: ' + err.message, 'error');
    } finally {
      sheet.syncing = false;
      data = [...data]; 
    }
  }

  let pollInterval: any = null;
  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      const isAnySyncing = data.some(s => s.syncStatus === 'syncing');
      if (!isAnySyncing) {
        clearInterval(pollInterval);
        pollInterval = null;
        return;
      }
      await loadCache();
    }, 3000);
  }

  onMount(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  });

  function handleValueChange(sheetIdx: number, itemIdx: number, valIdx: number, event: any) {
    const val = event.target.value;
    data[sheetIdx].items[itemIdx].values[valIdx] = val;
  }

  $: filteredData = data.filter(sheet => {
    // 1. Search filter
    const searchLow = searchTerm.toLowerCase();
    const nameMatch = sheet.sheetName.toLowerCase().includes(searchLow);
    const itemsMatch = sheet.items.some((item: any) => item.name.toLowerCase().includes(searchLow));
    const searchMatch = !searchTerm || nameMatch || itemsMatch;

    // 2. Hidden filter
    const hiddenMatch = showHidden || !sheet.hidden;

    return searchMatch && hiddenMatch;
  });
</script>

<div class="p-3 md:p-5 max-w-7xl mx-auto min-h-screen bg-gray-50 text-gray-900 pb-20">
  <!-- Connection & Action Card -->
  <div class="bg-white rounded-xl shadow-md mb-4 border border-purple-100 overflow-hidden relative">
    <div class="absolute top-0 left-0 w-1.5 h-full bg-purple-600"></div>
    <div class="p-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 class="text-xl font-black text-purple-900 tracking-tight">Google Sheets Settings</h1>
          <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Configure sync source & fetch latest data</p>
        </div>
        <button 
          on:click={fetchData}
          disabled={fetching}
          class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold shadow transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 group text-sm"
        >
          {#if fetching}
            <div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Syncing...
          {:else}
            <svg class="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2m15.357 2H15" />
            </svg>
            Fetch Data
          {/if}
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div class="space-y-1">
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest" for="script-url">Apps Script URL</label>
          <input 
            id="script-url"
            type="text" 
            bind:value={scriptUrl} 
            placeholder="Web App URL..."
            class="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all text-xs font-medium"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest" for="sheet-id">Spreadsheet ID</label>
          <input 
            id="sheet-id"
            type="text" 
            bind:value={spreadsheetId} 
            placeholder="Optional ID..."
            class="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all text-xs font-medium"
          />
        </div>
      </div>
      
      <div class="mt-3 flex justify-between items-center">
        <div class="flex items-center gap-1.5">
          <div class="h-1.5 w-1.5 rounded-full {scriptUrl ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}"></div>
          <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            {scriptUrl ? 'Connected' : 'Not Configured'}
          </span>
        </div>
        <button on:click={saveConfig} class="text-[10px] font-black text-purple-600 hover:text-purple-800 transition-colors uppercase tracking-widest flex items-center gap-1">
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Config
        </button>
      </div>
    </div>
  </div>

  <!-- Dashboard Controls -->
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
    <!-- Search & Filters -->
    <div class="lg:col-span-3 bg-white rounded-xl shadow-sm p-3 border border-purple-100 flex flex-col md:flex-row items-center gap-3">
      <div class="relative flex-1 w-full">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          bind:value={searchTerm}
          placeholder="Search job numbers or items..."
          class="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all text-sm"
        />
      </div>
      <label class="flex items-center gap-2 cursor-pointer select-none bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 whitespace-nowrap">
        <input type="checkbox" bind:checked={showHidden} class="w-4 h-4 accent-purple-600 rounded cursor-pointer" />
        <span class="text-xs font-bold text-purple-900">Show Hidden</span>
      </label>
    </div>

    <!-- Stats Card -->
    <div class="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-xl shadow-sm p-3 text-white flex items-center justify-between">
      <div>
        <p class="text-purple-100 text-[9px] font-bold uppercase tracking-wider">Active Jobs</p>
        <h4 class="text-xl font-black">{data.filter(s => !s.hidden).length}</h4>
      </div>
      <div class="bg-white/20 p-2 rounded-lg">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" />
        </svg>
      </div>
    </div>
  </div>

  {#if error}
    <div class="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded-r-xl shadow-md flex items-center gap-3 animate-pulse" in:fly={{ x: -20 }}>
      <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <p class="font-bold">Execution Error</p>
        <p class="text-sm">{error}</p>
      </div>
    </div>
  {/if}

  <!-- Data Display -->
  {#if loading}
    <div class="flex justify-center items-center p-12">
      <div class="h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  {:else if filteredData.length > 0}
    <div class="space-y-6">
      {#each filteredData as sheet, sIdx}
        <div class="group relative" in:fly={{ y: 20, duration: 400 }}>
          <div class="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden {sheet.hidden ? 'opacity-60 grayscale' : ''}">
            <!-- Header -->
            <div class="px-5 py-3 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r {sheet.hidden ? 'from-gray-100 to-gray-50' : 'from-purple-50 to-white'}">
              <div class="flex items-center gap-3">
                <div class="h-9 w-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-sm">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-black text-purple-900 flex items-center gap-2">
                    {sheet.sheetName}
                    {#if sheet.hidden}
                      <span class="text-[8px] uppercase bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-black">Hidden</span>
                    {/if}
                  </h3>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 rounded border border-gray-100">B14-B38</span>
                    <span class="text-gray-300">|</span>
                    <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 rounded border border-gray-100">K14-T38</span>
                  </div>
                </div>
              </div>
              
                <div class="flex flex-col items-end gap-1">
                  {#if sheet.syncStatus === 'syncing'}
                    <div class="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-pulse">
                      <div class="h-2 w-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span class="text-[10px] font-black uppercase tracking-widest">Syncing to Google...</span>
                    </div>
                  {:else if sheet.syncStatus === 'success'}
                    <div class="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100">
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span class="text-[10px] font-black uppercase tracking-widest">Sync Completed</span>
                    </div>
                  {:else if sheet.syncStatus === 'error'}
                    <div class="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100" title={sheet.syncError}>
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span class="text-[10px] font-black uppercase tracking-widest">Sync Failed</span>
                    </div>
                  {/if}

                  <div class="flex items-center gap-2">
                    <button 
                      on:click={() => toggleHide(sheet)}
                      class="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                      title={sheet.hidden ? 'Show' : 'Hide'}
                    >
                      {#if sheet.hidden}
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      {:else}
                        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.076m1.402-1.42A4.028 4.028 0 0110 5.518a4.91 4.91 0 01.996.06m2.185.734a9.914 9.914 0 011.663.955M12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                        </svg>
                      {/if}
                    </button>

                    <button 
                      on:click={() => updateSheet(sheet)}
                      disabled={sheet.syncStatus === 'syncing'}
                      class="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 text-xs"
                    >
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save Changes
                    </button>
                  </div>
                </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-50">
                <thead>
                  <tr class="bg-gray-50/30">
                    <th class="px-4 py-2 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Item / Task Name</th>
                    {#each Array(10) as _, i}
                      <th class="px-1 py-2 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">V{i+1}</th>
                    {/each}
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  {#each sheet.items as item, iIdx}
                    <tr class="hover:bg-purple-50/20 transition-colors group/row">
                      <td class="px-4 py-1.5 whitespace-nowrap">
                        <span class="text-xs font-bold text-gray-700 group-hover/row:text-purple-700 transition-colors">
                          {item.name}
                        </span>
                      </td>
                      {#each item.values as val, vIdx}
                        <td class="px-0.5 py-1.5 text-center">
                          <input 
                            type="text" 
                            value={val}
                            on:input={(e) => handleValueChange(data.indexOf(sheet), iIdx, vIdx, e)}
                            class="w-10 md:w-14 text-center text-[11px] p-1.5 border border-transparent hover:border-gray-200 focus:border-purple-300 rounded focus:bg-white transition-all outline-none font-semibold text-gray-700 bg-gray-50/30"
                            disabled={sheet.syncing}
                          />
                        </td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center" in:fly={{ y: 20, duration: 400 }}>
      <svg class="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="mt-2 text-xs font-medium text-gray-900">No data found</h3>
      <p class="mt-1 text-[10px] text-gray-500">Adjust filters or click "Fetch Data".</p>
    </div>
  {/if}
</div>

<style>
  /* Ensure inputs have enough contrast */
  input {
    transition: all 0.2s;
  }
</style>
