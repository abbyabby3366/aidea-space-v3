<script lang="ts">
	import { toasts, removeToast, clearToasts } from '$lib/utils';
	import { fly, fade } from 'svelte/transition';

	function getToastClasses(type: string) {
		switch (type) {
			case 'success':
				return 'bg-green-50 border-green-200 text-green-800';
			case 'error':
				return 'bg-red-50 border-red-200 text-red-800';
			case 'warning':
				return 'bg-yellow-50 border-yellow-200 text-yellow-800';
			case 'info':
			default:
				return 'bg-blue-50 border-blue-200 text-blue-800';
		}
	}

	function getIcon(type: string) {
		switch (type) {
			case 'success':
				return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'error':
				return 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z';
			case 'warning':
				return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z';
			case 'info':
			default:
				return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
		}
	}
</script>

<!-- Toast Container -->
<div class="fixed top-4 right-4 z-50 space-y-2">
	{#if $toasts.length > 0}
		<!-- Clear All Button -->
		<div class="mb-2 flex justify-end">
			<button
				onclick={clearToasts}
				class="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
			>
				Clear All ({$toasts.length})
			</button>
		</div>
	{/if}

	{#each $toasts as toast (toast.id)}
		<div
			class="max-w-sm rounded-lg border p-4 shadow-lg {getToastClasses(toast.type)}"
			transition:fly={{ y: -50, duration: 300 }}
		>
			<div class="flex items-start">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d={getIcon(toast.type)} clip-rule="evenodd" />
					</svg>
				</div>
				<div class="ml-3 flex-1">
					<p class="text-sm font-medium whitespace-pre-line">{toast.message}</p>
				</div>
				<div class="ml-4 flex-shrink-0">
					<button
						onclick={() => removeToast(toast.id)}
						class="hover:bg-opacity-10 inline-flex rounded-md p-1.5 hover:bg-black focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
					>
						<span class="sr-only">Dismiss</span>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	{/each}
</div>
