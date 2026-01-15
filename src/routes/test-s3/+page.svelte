<script lang="ts">
	import { onMount } from 'svelte';
	import Toast from '$lib/components/Toast.svelte';

	let testResults: any[] = [];
	let isLoading = false;
	let connectionStatus = 'Unknown';
	let uploadedFiles: any[] = [];
	let fileInput: HTMLInputElement;
	let testText = 'This is a test file content for S3 storage testing.';
	let selectedFileName = '';

	onMount(() => {
		testConnection();
		loadUploadedFiles();
	});

	async function testConnection() {
		isLoading = true;
		try {
			const response = await fetch('/api/test/s3/connection');
			const result = await response.json();

			if (result.success) {
				connectionStatus = 'Connected';
				addTestResult('Connection Test', 'success', 'S3 connection successful');
			} else {
				connectionStatus = 'Failed';
				addTestResult('Connection Test', 'error', result.error || 'Connection failed');
			}
		} catch (error) {
			connectionStatus = 'Error';
			addTestResult('Connection Test', 'error', `Error: ${error}`);
		}
		isLoading = false;
	}

	async function uploadTextFile() {
		isLoading = true;
		try {
			const response = await fetch('/api/test/s3/upload-text', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					content: testText,
					filename: `test-text-${Date.now()}.txt`
				})
			});
			const result = await response.json();

			if (result.success) {
				addTestResult('Text Upload', 'success', `File uploaded: ${result.filename}`);
				loadUploadedFiles();
			} else {
				addTestResult('Text Upload', 'error', result.error || 'Upload failed');
			}
		} catch (error) {
			addTestResult('Text Upload', 'error', `Error: ${error}`);
		}
		isLoading = false;
	}

	async function uploadFile() {
		if (!fileInput.files || fileInput.files.length === 0) {
			addTestResult('File Upload', 'error', 'Please select a file');
			return;
		}

		isLoading = true;
		const file = fileInput.files[0];
		const formData = new FormData();
		formData.append('file', file);
		formData.append('filename', `test-${Date.now()}-${file.name}`);

		try {
			const response = await fetch('/api/test/s3/upload-file', {
				method: 'POST',
				body: formData
			});
			const result = await response.json();

			if (result.success) {
				addTestResult('File Upload', 'success', `File uploaded: ${result.filename}`);
				loadUploadedFiles();
			} else {
				addTestResult('File Upload', 'error', result.error || 'Upload failed');
			}
		} catch (error) {
			addTestResult('File Upload', 'error', `Error: ${error}`);
		}
		isLoading = false;
	}

	async function loadUploadedFiles() {
		try {
			const response = await fetch('/api/test/s3/files');
			const result = await response.json();

			if (result.success) {
				uploadedFiles = result.files || [];
				addTestResult('List Files', 'success', `Found ${uploadedFiles.length} files`);
			} else {
				addTestResult('List Files', 'error', result.error || 'Failed to list files');
			}
		} catch (error) {
			addTestResult('List Files', 'error', `Error: ${error}`);
		}
	}

	async function downloadFile(filename: string) {
		try {
			const response = await fetch(`/api/test/s3/download/${encodeURIComponent(filename)}`);

			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);

				addTestResult('File Download', 'success', `Downloaded: ${filename}`);
			} else {
				const result = await response.json();
				addTestResult('File Download', 'error', result.error || 'Download failed');
			}
		} catch (error) {
			addTestResult('File Download', 'error', `Error: ${error}`);
		}
	}

	async function deleteFile(filename: string) {
		isLoading = true;
		try {
			const response = await fetch(`/api/test/s3/delete/${encodeURIComponent(filename)}`, {
				method: 'DELETE'
			});
			const result = await response.json();

			if (result.success) {
				addTestResult('File Delete', 'success', `Deleted: ${filename}`);
				loadUploadedFiles();
			} else {
				addTestResult('File Delete', 'error', result.error || 'Delete failed');
			}
		} catch (error) {
			addTestResult('File Delete', 'error', `Error: ${error}`);
		}
		isLoading = false;
	}

	async function runAllTests() {
		testResults = [];
		await testConnection();
		await uploadTextFile();
		await loadUploadedFiles();
	}

	function addTestResult(test: string, status: 'success' | 'error' | 'info', message: string) {
		testResults = [
			...testResults,
			{
				test,
				status,
				message,
				timestamp: new Date().toLocaleTimeString()
			}
		];
	}

	function clearResults() {
		testResults = [];
	}

	function handleFileSelection() {
		if (fileInput.files && fileInput.files.length > 0) {
			selectedFileName = fileInput.files[0].name;
		} else {
			selectedFileName = '';
		}
	}
</script>

<svelte:head>
	<title>S3 Storage Test Page</title>
</svelte:head>

<div class="container mx-auto min-h-screen max-w-6xl bg-gray-50 p-6">
	<h1 class="mb-6 text-3xl font-bold text-gray-900">S3 Storage Test Page</h1>

	<!-- Connection Status -->
	<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold text-black">Connection Status</h2>
		<div class="flex items-center gap-3">
			<div
				class="h-3 w-3 rounded-full {connectionStatus === 'Connected'
					? 'bg-green-500'
					: connectionStatus === 'Failed'
						? 'bg-red-500'
						: 'bg-yellow-500'}"
			></div>
			<span class="text-lg font-medium text-black">{connectionStatus}</span>
		</div>
	</div>

	<!-- Upload Section -->
	<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Text Upload -->
		<div class="rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-4 text-xl font-semibold text-gray-900">Upload Text File</h2>
			<div class="space-y-4">
				<div>
					<label for="testText" class="mb-1 block text-sm font-medium text-gray-700"
						>Text Content</label
					>
					<textarea
						id="testText"
						bind:value={testText}
						rows="4"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					></textarea>
				</div>
				<button
					on:click={uploadTextFile}
					disabled={isLoading}
					class="w-full rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Upload Text File
				</button>
			</div>
		</div>

		<!-- File Upload -->
		<div class="rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-4 text-xl font-semibold text-gray-900">Upload File</h2>
			<div class="space-y-4">
				<div>
					<label for="fileInput" class="mb-1 block text-sm font-medium text-gray-700"
						>Select File</label
					>
					<input
						id="fileInput"
						bind:this={fileInput}
						type="file"
						on:change={handleFileSelection}
						class="hidden"
					/>
					<button
						type="button"
						on:click={() => fileInput.click()}
						class="w-full rounded-md border-2 border-dashed border-gray-300 px-3 py-8 text-center hover:border-gray-400 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						{#if selectedFileName}
							<div class="text-sm text-gray-600">
								<span class="font-medium">Selected:</span>
								{selectedFileName}
							</div>
						{:else}
							<div class="text-gray-500">
								<svg
									class="mx-auto mb-2 h-8 w-8"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									></path>
								</svg>
								<p class="text-sm font-medium">Click to select a file</p>
								<p class="mt-1 text-xs text-gray-400">or drag and drop files here</p>
							</div>
						{/if}
					</button>
				</div>
				<button
					on:click={uploadFile}
					disabled={isLoading}
					class="w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Upload File
				</button>
			</div>
		</div>
	</div>

	<!-- Test Buttons -->
	<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Test Operations</h2>
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			<button
				on:click={testConnection}
				disabled={isLoading}
				class="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Test Connection
			</button>
			<button
				on:click={loadUploadedFiles}
				disabled={isLoading}
				class="rounded-md bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Refresh Files
			</button>
			<button
				on:click={runAllTests}
				disabled={isLoading}
				class="rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Run All Tests
			</button>
			<button
				on:click={clearResults}
				disabled={isLoading}
				class="rounded-md bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Clear Results
			</button>
		</div>
	</div>

	<!-- Uploaded Files -->
	<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-900">Uploaded Files ({uploadedFiles.length})</h2>
			<button
				on:click={loadUploadedFiles}
				disabled={isLoading}
				class="rounded-md bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
			>
				Refresh
			</button>
		</div>

		{#if uploadedFiles.length === 0}
			<p class="text-gray-500 italic">No files uploaded yet.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Filename</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Size</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Uploaded</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each uploadedFiles as file}
							<tr>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900"
									>{file.filename}</td
								>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500"
									>{file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Unknown'}</td
								>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500"
									>{file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : 'Unknown'}</td
								>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<div class="flex gap-2">
										<button
											on:click={() => downloadFile(file.filename)}
											class="text-blue-600 hover:text-blue-900"
										>
											Download
										</button>
										<button
											on:click={() => deleteFile(file.filename)}
											disabled={isLoading}
											class="text-red-600 hover:text-red-900 disabled:opacity-50"
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Test Results -->
	<div class="rounded-lg bg-white p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Test Results</h2>

		{#if testResults.length === 0}
			<p class="text-gray-500 italic">No test results yet. Run some tests to see results here.</p>
		{:else}
			<div class="space-y-3">
				{#each testResults as result}
					<div
						class="flex items-start gap-3 rounded-md p-3 {result.status === 'success'
							? 'border border-green-200 bg-green-50'
							: result.status === 'error'
								? 'border border-red-200 bg-red-50'
								: 'border border-blue-200 bg-blue-50'}"
					>
						<div
							class="mt-2 h-2 w-2 rounded-full {result.status === 'success'
								? 'bg-green-500'
								: result.status === 'error'
									? 'bg-red-500'
									: 'bg-blue-500'}"
						></div>
						<div class="flex-1">
							<div class="flex items-start justify-between">
								<span class="text-sm font-medium">{result.test}</span>
								<span class="text-xs text-gray-500">{result.timestamp}</span>
							</div>
							<p class="mt-1 text-sm text-gray-700">{result.message}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if isLoading}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
			<div class="flex items-center gap-3 rounded-lg bg-white p-6">
				<div class="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
				<span class="text-gray-900">Running test...</span>
			</div>
		</div>
	{/if}
</div>

<Toast />
