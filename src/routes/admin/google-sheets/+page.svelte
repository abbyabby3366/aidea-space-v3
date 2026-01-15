<script lang="ts">
  import { onMount } from 'svelte';
  import { showToast } from '$lib/utils';

  // Persistence keys
  const SCRIPT_URL_KEY = 'google_sheets_script_url';
  const SPREADSHEET_ID_KEY = 'google_sheets_spreadsheet_id';

  let scriptUrl = '';
  let spreadsheetId = '';
  let loading = false;
  let fetching = false;
  let data: any[] = [];
  let error = '';

  onMount(() => {
    scriptUrl = localStorage.getItem(SCRIPT_URL_KEY) || '';
    spreadsheetId = localStorage.getItem(SPREADSHEET_ID_KEY) || '';
  });

  function saveConfig() {
    localStorage.setItem(SCRIPT_URL_KEY, scriptUrl);
    localStorage.setItem(SPREADSHEET_ID_KEY, spreadsheetId);
    showToast('Configuration saved locally', 'success');
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

      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      if (result.success === false) {
        throw new Error(result.error || 'Unknown script error');
      }

      data = result;
      showToast(`Fetched ${data.length} sheets successfully`, 'success');
    } catch (err: any) {
      console.error(err);
      error = err.message;
      showToast('Error fetching data: ' + err.message, 'error');
    } finally {
      fetching = false;
    }
  }

  async function updateItem(sheetName: string, item: any) {
    if (!scriptUrl) return;
    
    item.updating = true;
    
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
          sheetName,
          rowIndex: item.rowIndex,
          values: item.values,
          spreadsheetId: spreadsheetId || undefined
        })
      });

      const result = await response.json();
      if (result.success) {
        showToast('Updated successfully', 'success');
      } else {
        throw new Error(result.error || 'Failed to update');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Update failed: ' + err.message, 'error');
    } finally {
      item.updating = false;
      data = [...data]; // Trigger reactivity
    }
  }

  function handleValueChange(sheetIdx: number, itemIdx: number, valIdx: number, event: any) {
    const val = event.target.value;
    data[sheetIdx].items[itemIdx].values[valIdx] = val;
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">Google Sheets Integration</h1>
    <div class="flex space-x-2">
      <button 
        on:click={fetchData}
        disabled={fetching}
        class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium flex items-center disabled:opacity-50"
      >
        {#if fetching}
          <div class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          Fetching...
        {:else}
          Fetch Data
        {/if}
      </button>
    </div>
  </div>

  <!-- Configuration Card -->
  <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h2 class="text-lg font-semibold mb-4 text-gray-800">Configuration</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="scriptUrl" class="block text-sm font-medium text-gray-700 mb-1">Apps Script Web App URL</label>
        <input 
          id="scriptUrl"
          type="text" 
          bind:value={scriptUrl} 
          on:blur={saveConfig}
          placeholder="https://script.google.com/macros/s/.../exec"
          class="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
        />
      </div>
      <div>
        <label for="spreadsheetId" class="block text-sm font-medium text-gray-700 mb-1">Spreadsheet ID (Optional)</label>
        <input 
          id="spreadsheetId"
          type="text" 
          bind:value={spreadsheetId} 
          on:blur={saveConfig}
          placeholder="Enter Spreadsheet ID if not bound script"
          class="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
        />
      </div>
    </div>
    {#if error}
      <p class="mt-2 text-sm text-red-600">{error}</p>
    {/if}
  </div>

  <!-- Data Display -->
  {#if data.length > 0}
    {#each data as sheet, sIdx}
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-bold text-purple-800">{sheet.sheetName}</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name (B + D)</th>
                {#each Array(10) as _, i}
                  <th class="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Val {i+1}</th>
                {/each}
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each sheet.items as item, iIdx}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  {#each item.values as val, vIdx}
                    <td class="px-1 py-4 text-center">
                      <input 
                        type="text" 
                        value={val}
                        on:input={(e) => handleValueChange(sIdx, iIdx, vIdx, e)}
                        class="w-14 text-center text-xs p-1 border border-gray-200 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white text-gray-900"
                      />
                    </td>
                  {/each}
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      on:click={() => updateItem(sheet.sheetName, item)}
                      disabled={item.updating}
                      class="text-purple-600 hover:text-purple-900 disabled:opacity-50"
                    >
                      {item.updating ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/each}
  {:else if !fetching}
    <div class="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No data loaded</h3>
      <p class="mt-1 text-sm text-gray-500">Configure your script URL and click "Fetch Data" to start.</p>
    </div>
  {/if}
</div>

<style>
  /* Ensure inputs have enough contrast */
  input {
    transition: all 0.2s;
  }
</style>
