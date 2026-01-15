<script lang="ts">
	import { onMount } from 'svelte';
	import Toast from '$lib/components/Toast.svelte';

	let testResults: any[] = [];
	let isLoading = false;
	let connectionStatus = 'Unknown';
	let testData = {
		name: 'Test User',
		email: 'test@example.com',
		message: 'This is a test document'
	};

	onMount(() => {
		testConnection();
	});

	async function testConnection() {
		isLoading = true;
		try {
			const response = await fetch('/api/test/mongodb/connection');
			const result = await response.json();

			if (result.success) {
				connectionStatus = 'Connected';
				addTestResult('Connection Test', 'success', 'MongoDB connection successful');
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

	async function testInsert() {
		isLoading = true;
		try {
			const response = await fetch('/api/test/mongodb/insert', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(testData)
			});
			const result = await response.json();

			if (result.success) {
				addTestResult('Insert Test', 'success', `Document inserted with ID: ${result.insertedId}`);
			} else {
				addTestResult('Insert Test', 'error', result.error || 'Insert failed');
			}
		} catch (error) {
			addTestResult('Insert Test', 'error', `Error: ${error}`);
		}
		isLoading = false;
	}

	async function testFind() {
		isLoading = true;
		try {
			const response = await fetch('/api/test/mongodb/find');
			const result = await response.json();

			if (result.success) {
				addTestResult('Find Test', 'success', `Found ${result.documents.length} documents`);
				console.log('Found documents:', result.documents);
			} else {
				addTestResult('Find Test', 'error', result.error || 'Find failed');
			}
		} catch (error) {
			addTestResult('Find Test', 'error', `Error: ${error}`);
		}
		isLoading = false;
	}

	async function testUpdate() {
		isLoading = true;
		try {
			const response = await fetch('/api/test/mongodb/update', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					filter: { email: testData.email },
					update: { $set: { message: 'Updated message', updatedAt: new Date() } }
				})
			});
			const result = await response.json();

			if (result.success) {
				addTestResult('Update Test', 'success', `Updated ${result.modifiedCount} document(s)`);
			} else {
				addTestResult('Update Test', 'error', result.error || 'Update failed');
			}
		} catch (error) {
			addTestResult('Update Test', 'error', `Error: ${error}`);
		}
		isLoading = false;
	}

	async function testDelete() {
		isLoading = true;
		try {
			const response = await fetch('/api/test/mongodb/delete', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ filter: { email: testData.email } })
			});
			const result = await response.json();

			if (result.success) {
				addTestResult('Delete Test', 'success', `Deleted ${result.deletedCount} document(s)`);
			} else {
				addTestResult('Delete Test', 'error', result.error || 'Delete failed');
			}
		} catch (error) {
			addTestResult('Delete Test', 'error', `Error: ${error}`);
		}
		isLoading = false;
	}

	async function runAllTests() {
		testResults = [];
		await testConnection();
		await testInsert();
		await testFind();
		await testUpdate();
		await testFind();
		await testDelete();
		await testFind();
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
</script>

<svelte:head>
	<title>MongoDB Test Page</title>
</svelte:head>

<div class="container mx-auto min-h-screen max-w-4xl bg-gray-50 p-6">
	<h1 class="mb-6 text-3xl font-bold text-gray-900">MongoDB Test Page</h1>

	<!-- Connection Status -->
	<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Connection Status</h2>
		<div class="flex items-center gap-3">
			<div
				class="h-3 w-3 rounded-full {connectionStatus === 'Connected'
					? 'bg-green-500'
					: connectionStatus === 'Failed'
						? 'bg-red-500'
						: 'bg-yellow-500'}"
			></div>
			<span class="text-lg font-medium text-gray-900">{connectionStatus}</span>
		</div>
	</div>

	<!-- Test Data Input -->
	<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Test Data</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div>
				<label for="name" class="mb-1 block text-sm font-medium text-gray-700">Name</label>
				<input
					id="name"
					type="text"
					bind:value={testData.name}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</div>
			<div>
				<label for="email" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
				<input
					id="email"
					type="email"
					bind:value={testData.email}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</div>
			<div class="md:col-span-2">
				<label for="message" class="mb-1 block text-sm font-medium text-gray-700">Message</label>
				<textarea
					id="message"
					bind:value={testData.message}
					rows="3"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				></textarea>
			</div>
		</div>
	</div>

	<!-- Test Buttons -->
	<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">Test Operations</h2>
		<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
			<button
				on:click={testConnection}
				disabled={isLoading}
				class="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Test Connection
			</button>
			<button
				on:click={testInsert}
				disabled={isLoading}
				class="rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Test Insert
			</button>
			<button
				on:click={testFind}
				disabled={isLoading}
				class="rounded-md bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Test Find
			</button>
			<button
				on:click={testUpdate}
				disabled={isLoading}
				class="rounded-md bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Test Update
			</button>
			<button
				on:click={testDelete}
				disabled={isLoading}
				class="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Test Delete
			</button>
			<button
				on:click={runAllTests}
				disabled={isLoading}
				class="rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-3"
			>
				Run All Tests
			</button>
		</div>
	</div>

	<!-- Test Results -->
	<div class="rounded-lg bg-white p-6 shadow-md">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-900">Test Results</h2>
			<button
				on:click={clearResults}
				class="rounded-md bg-gray-500 px-3 py-1 text-sm text-white hover:bg-gray-600"
			>
				Clear Results
			</button>
		</div>

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
