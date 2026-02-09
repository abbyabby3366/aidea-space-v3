<script lang="ts">
  import { onMount } from 'svelte';
  import { showToast } from '$lib/utils';
  import { fly, slide } from 'svelte/transition';
  import { uploadFileToS3, getS3Url } from '$lib/s3';

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
  let expandedJobs: Set<string> = new Set();

  const HEADERS = [
    'Printing Done', 'Finishing Done', 
    '1st Size Check', '1st Qty Check', '1st Quality Check',
    '2nd Size Check', '2nd Qty Check', '2nd Quality Check',
    '3rd Qty Check', 'Picture Upload'
  ];

  const BOOLEAN_INDEXES = [0, 1, 2, 4, 5, 7];
  const NUMBER_INDEXES = [3, 6, 8];
  const PICTURE_INDEX = 9;

  onMount(async () => {
    await loadSettings();
    await loadData();
  });

  async function loadSettings() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/google-sheets/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (res.success && res.scriptUrl) {
        scriptUrl = res.scriptUrl;
        spreadsheetId = res.spreadsheetId;
      } else {
        // Fallback to local storage if DB is empty
        scriptUrl = localStorage.getItem(SCRIPT_URL_KEY) || '';
        spreadsheetId = localStorage.getItem(SPREADSHEET_ID_KEY) || '';
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  async function loadData(silent = false) {
    if (!silent) {
      loading = true;
      error = '';
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams();
      if (scriptUrl) params.set('scriptUrl', scriptUrl);
      if (spreadsheetId) params.set('spreadsheetId', spreadsheetId);
      
      const response = await fetch(`/api/admin/google-sheets?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const newData = await response.json();
        if (silent) {
          // Merge ONLY sync status/meta to avoid overwriting user edits
          data = data.map(sheet => {
            const fresh = newData.find((s: any) => s.sheetName === sheet.sheetName);
            if (fresh) {
              return {
                ...sheet,
                syncStatus: fresh.syncStatus,
                syncError: fresh.syncError,
                lastSyncAt: fresh.lastSyncAt
              };
            }
            return sheet;
          });
        } else {
          data = newData;
        }
      } else {
        const err = await response.json();
        if (!silent) error = err.message || 'Failed to load data';
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      if (!silent) error = 'Failed to connect to server';
    } finally {
      if (!silent) loading = false;
    }
  }

  async function syncJob(sheet: any) {
    sheet.syncing = true;
    sheet.syncStatus = 'syncing'; // Optimistic status
    data = [...data];
    
    // Use the sheet's own source info if available
    const effectiveScriptUrl = sheet.scriptUrl || scriptUrl;
    const effectiveSpreadsheetId = sheet.spreadsheetId || spreadsheetId;

    if (!effectiveScriptUrl) {
      showToast('Script URL is missing for this job', 'error');
      sheet.syncing = false;
      sheet.syncStatus = 'error';
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scriptUrl: effectiveScriptUrl,
          action: 'update',
          sheetName: sheet.sheetName,
          updates: sheet.items,
          spreadsheetId: effectiveSpreadsheetId || undefined
        })
      });

      const result = await response.json();
      if (result.success) {
        showToast(result.message || 'Saved to database. Syncing...', 'success');
        startPolling();
      } else {
        throw new Error(result.message || 'Failed to update');
      }
    } catch (err: any) {
      console.error(err);
      sheet.syncStatus = 'error';
      sheet.syncError = err.message;
      showToast('Save failed: ' + err.message, 'error');
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
      await loadData(true);
    }, 3000);
  }

  onMount(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  });

  async function handleFileUpload(sheetIdx: number, itemIdx: number, event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const sheet = data[sheetIdx];
    const item = sheet.items[itemIdx];

    sheet.syncing = true;
    data = [...data];

    try {
      const timestamp = Date.now();
      const filename = `jobs/${sheet.sheetName}/${item.name}_${timestamp}_${file.name}`;
      
      const res = await uploadFileToS3(file, filename);
      const url = getS3Url(filename);
      
      item.values[PICTURE_INDEX] = url;
      showToast('Photo uploaded successfully', 'success');
      await syncJob(sheet);
    } catch (err: any) {
      console.error(err);
      showToast('Photo upload failed: ' + err.message, 'error');
    } finally {
      sheet.syncing = false;
      data = [...data];
    }
  }

  async function clearPhoto(sheetIdx: number, itemIdx: number) {
    const sheet = data[sheetIdx];
    const item = sheet.items[itemIdx];
    
    if (!confirm(`Are you sure you want to clear the photo for "${item.name}"?`)) {
      return;
    }

    sheet.syncing = true;
    data = [...data];

    try {
      item.values[PICTURE_INDEX] = '';
      showToast('Photo link cleared', 'success');
      await syncJob(sheet);
    } catch (err: any) {
      console.error(err);
      showToast('Clear failed: ' + err.message, 'error');
    } finally {
      sheet.syncing = false;
      data = [...data];
    }
  }

  function toggleExpand(sheetName: string) {
    if (expandedJobs.has(sheetName)) {
      expandedJobs.delete(sheetName);
    } else {
      expandedJobs.add(sheetName);
    }
    expandedJobs = expandedJobs; // trigger reactivity
  }

  $: filteredData = data.filter(sheet => {
    const searchLow = searchTerm.toLowerCase();
    const nameMatch = sheet.sheetName.toLowerCase().includes(searchLow);
    const searchMatch = !searchTerm || nameMatch;
    const hiddenMatch = showHidden || !sheet.hidden;
    return searchMatch && hiddenMatch;
  });

  function getBooleanValue(val: any) {
    if (val === undefined || val === null) return false;
    return String(val).toLowerCase() === 'yes';
  }

  function handleBooleanChange(sheetIdx: number, itemIdx: number, valIdx: number, checked: boolean) {
    data[sheetIdx].items[itemIdx].values[valIdx] = checked ? 'yes' : 'no';
    data = [...data];
    syncJob(data[sheetIdx]);
  }

  function handleNumberChange(sheetIdx: number, itemIdx: number, valIdx: number, event: any) {
    const val = event.target.value;
    // Strictly numbers
    const cleanVal = val.replace(/[^0-9]/g, '');
    data[sheetIdx].items[itemIdx].values[valIdx] = cleanVal;
    data = [...data];
  }

  async function handleNumberBlur(sheetIdx: number) {
     await syncJob(data[sheetIdx]);
  }

  async function forceFetch() {
    if (!scriptUrl) {
      showToast('Please set a Script URL in settings to fetch fresh data', 'error');
      return;
    }
    fetching = true;
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
          spreadsheetId,
          action: 'fetch'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        data = result;
        showToast('Fresh data fetched from Google Sheets', 'success');
      } else {
        const err = await response.json();
        showToast(err.message || 'Fetch failed', 'error');
      }
    } catch (err) {
      showToast('Failed to connect for fetch', 'error');
    } finally {
      fetching = false;
    }
  }
</script>

<div class="p-4 md:p-8 max-w-4xl mx-auto min-h-screen bg-white text-gray-900 pb-24">
  <div class="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
    <div>
      <h1 class="text-3xl font-black text-gray-900 tracking-tight mb-2">Staff Job Panel</h1>
      <p class="text-sm text-gray-500 font-medium">Update job progress and check status</p>
    </div>
    
    <button
      onclick={forceFetch}
      disabled={fetching || !scriptUrl}
      class="inline-flex items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50 disabled:bg-gray-200 disabled:shadow-none min-w-[140px]"
    >
      {#if fetching}
        <div class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        FETCHING...
      {:else}
        <svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        FETCH FRESH DATA
      {/if}
    </button>
  </div>

  <!-- Controls -->
  <div class="flex flex-row gap-2 mb-8 items-stretch">
    <div class="relative flex-1">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input 
        type="text" 
        bind:value={searchTerm}
        placeholder="Search jobs..."
        class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-sm"
      />
    </div>
    <label class="flex items-center gap-2 cursor-pointer select-none bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors whitespace-nowrap">
      <input type="checkbox" bind:checked={showHidden} class="w-4 h-4 accent-blue-600 rounded cursor-pointer" />
      <span class="text-xs font-bold text-gray-700">HIDDEN</span>
    </label>
  </div>

  {#if loading}
    <div class="flex flex-col justify-center items-center p-20 gap-4">
      <div class="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm font-bold text-blue-600 uppercase tracking-widest">Loading Jobs...</p>
    </div>
  {:else if error}
    <div class="bg-red-50 border-2 border-red-100 text-red-700 p-6 rounded-2xl flex items-center gap-4">
      <div class="bg-red-100 p-3 rounded-full">
        <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div>
        <p class="font-black text-lg">Failed to load jobs</p>
        <p class="text-sm opacity-80">{error}</p>
      </div>
    </div>
  {:else if filteredData.length > 0}
    <div class="space-y-4">
      {#each filteredData as sheet, sIdx}
        <div class="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden {sheet.hidden ? 'opacity-60' : ''} transition-all {expandedJobs.has(sheet.sheetName) ? 'ring-2 ring-blue-500 border-transparent shadow-xl' : 'hover:border-blue-200 shadow-sm'}">
          <!-- Accordion Header -->
          <button 
            class="w-full px-6 py-5 flex items-center justify-between text-left group"
            onclick={() => toggleExpand(sheet.sheetName)}
          >
            <div class="flex items-center gap-4">
              <div class="h-10 w-10 rounded-xl {sheet.hidden ? 'bg-gray-100 text-gray-400' : 'bg-green-600 text-white'} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-black text-gray-900 flex items-center gap-2">
                  {sheet.sheetName}
                </h3>
                <div class="flex items-center gap-2">
                  <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{sheet.items.length} Tasks</p>
                  {#if sheet.syncStatus === 'syncing'}
                    <div class="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-pulse">
                      <div class="h-2 w-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span class="text-[8px] font-black uppercase tracking-tight">Syncing...</span>
                    </div>
                  {:else if sheet.syncStatus === 'success'}
                    <div class="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100">
                      <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span class="text-[8px] font-black uppercase tracking-tight">Sync Completed</span>
                    </div>
                  {:else if sheet.syncStatus === 'error'}
                    <div class="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100" title={sheet.syncError}>
                      <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span class="text-[8px] font-black uppercase tracking-tight">Sync Failed</span>
                    </div>
                  {:else}
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded {sheet.syncing ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-green-100 text-green-700'} uppercase tracking-tight">
                      {sheet.syncing ? 'Saving...' : 'Ready'}
                    </span>
                  {/if}
                </div>
              </div>
            </div>
            <svg 
              class="h-6 w-6 text-gray-400 group-hover:text-blue-600 transition-all {expandedJobs.has(sheet.sheetName) ? 'rotate-180 text-blue-600' : ''}" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Accordion Content -->
          {#if expandedJobs.has(sheet.sheetName)}
            <div transition:slide={{ duration: 300 }}>
              <div class="px-6 pb-6 space-y-6">
                {#each sheet.items as item, iIdx}
                  <div class="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <div class="flex items-center justify-between border-b border-gray-200 pb-3 mb-2">
                      <div class="flex items-center gap-3">
                        {#if item.thumb}
                          <div class="h-12 w-12 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-white flex-shrink-0">
                            <img src={item.thumb} alt="Job Preview" class="h-full w-full object-cover" />
                          </div>
                        {/if}
                        <h4 class="font-black text-gray-900">{item.name}</h4>
                      </div>
                      <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg shadow-sm border border-gray-100">Row {item.rowIndex}</span>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {#each item.values as val, vIdx}
                        <div class="space-y-1.5 {vIdx === PICTURE_INDEX ? 'col-span-2 sm:col-span-1' : ''}">
                          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{HEADERS[vIdx]}</label>
                          
                          {#if BOOLEAN_INDEXES.includes(vIdx)}
                            <button 
                              onclick={() => handleBooleanChange(sIdx, iIdx, vIdx, !getBooleanValue(val))}
                              class="w-full py-2 px-3 rounded-xl border-2 transition-all font-bold text-xs flex items-center justify-center gap-2 {getBooleanValue(val) ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-400'}"
                              disabled={sheet.syncing}
                            >
                              {#if getBooleanValue(val)}
                                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                                YES
                              {:else}
                                NO
                              {/if}
                            </button>
                          {:else if NUMBER_INDEXES.includes(vIdx)}
                            <input 
                              type="text" 
                              value={val}
                              oninput={(e) => handleNumberChange(sIdx, iIdx, vIdx, e)}
                              onblur={() => handleNumberBlur(sIdx)}
                              class="w-full py-2 px-3 bg-white border-2 {val ? 'border-green-500' : 'border-gray-200'} rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-xs font-bold text-center transition-all"
                              placeholder="Qty..."
                              disabled={sheet.syncing}
                            />
                          {:else if vIdx === PICTURE_INDEX}
                            {#if val && val.startsWith('http')}
                              <div class="flex items-center gap-2">
                                <a 
                                  href={val} 
                                  target="_blank" 
                                  class="flex-1 py-2 px-3 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-600 font-bold text-[10px] flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
                                >
                                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                  VIEW PHOTO
                                </a>
                                <button 
                                  onclick={() => clearPhoto(sIdx, iIdx)}
                                  class="p-2 rounded-xl bg-red-50 border-2 border-red-100 text-red-500 hover:bg-red-100 hover:border-red-200 transition-all flex-shrink-0"
                                  title="Clear Photo Link"
                                  disabled={sheet.syncing}
                                >
                                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            {:else}
                              <div class="relative">
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onchange={(e) => handleFileUpload(sIdx, iIdx, e)}
                                  class="hidden"
                                  id="file-{sIdx}-{iIdx}"
                                  disabled={sheet.syncing}
                                />
                                <label 
                                  for="file-{sIdx}-{iIdx}"
                                  class="w-full py-2 px-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 font-bold text-[10px] flex items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-all bg-white"
                                >
                                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  UPLOAD
                                </label>
                              </div>
                            {/if}
                          {/if}
                        </div>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="bg-gray-50 border-2 border-dashed border-gray-200 p-16 rounded-3xl text-center">
      <div class="bg-white h-16 w-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100">
        <svg class="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" />
        </svg>
      </div>
      <h3 class="text-lg font-black text-gray-900">No jobs found</h3>
      <p class="text-sm font-medium text-gray-500 mt-1">Try adjusting your filters or contact admin.</p>
    </div>
  {/if}
</div>

<style>
  :global(body) {
    background-color: white;
  }
</style>
