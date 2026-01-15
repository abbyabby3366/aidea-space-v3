<script lang="ts">
	export let content: string;

	// Simple markdown to HTML conversion
	function renderMarkdown(markdown: string): string {
		if (!markdown) return '';

		return (
			markdown
				// Headers
				.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
				.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
				.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')

				// Bold and italic
				.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
				.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')

				// Links
				.replace(
					/\[([^\]]+)\]\(([^)]+)\)/g,
					'<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">$1</a>'
				)

				// Lists
				.replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
				.replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
				.replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4">$2</li>')

				// Code blocks
				.replace(
					/```([\s\S]*?)```/g,
					'<pre class="bg-white/10 p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm">$1</code></pre>'
				)
				.replace(
					/`([^`]+)`/g,
					'<code class="bg-white/10 px-2 py-1 rounded text-sm font-mono">$1</code>'
				)

				// Line breaks
				.replace(/\n\n/g, '</p><p class="mb-3">')
				.replace(/\n/g, '<br>')

				// Wrap in paragraph tags
				.replace(/^(.+)$/gm, '<p class="mb-3">$1</p>')

				// Clean up empty paragraphs
				.replace(/<p class="mb-3"><\/p>/g, '')
				.replace(/<p class="mb-3"><br><\/p>/g, '')

				// Clean up list items
				.replace(/<p class="mb-3"><li class="ml-4">/g, '<li class="ml-4">')
				.replace(/<\/li><br><\/p>/g, '</li>')

				// Wrap lists in ul/ol tags
				.replace(/(<li class="ml-4">.*?<\/li>)/gs, '<ul class="list-disc ml-6 mb-3">$1</ul>')

				// Clean up
				.replace(
					/<p class="mb-3"><ul class="list-disc ml-6 mb-3">/g,
					'<ul class="list-disc ml-6 mb-3">'
				)
				.replace(/<\/ul><\/p>/g, '</ul>')
		);
	}

	$: htmlContent = renderMarkdown(content);
</script>

<div class="prose prose-sm max-w-none">
	{@html htmlContent}
</div>

<style>
	:global(.prose h1) {
		font-size: 1.5rem;
		font-weight: 700;
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	:global(.prose h2) {
		font-size: 1.25rem;
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
	}

	:global(.prose h3) {
		font-size: 1.125rem;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	:global(.prose p) {
		margin-bottom: 0.75rem;
		line-height: 1.625;
	}

	:global(.prose ul) {
		list-style-type: disc;
		margin-left: 1.5rem;
		margin-bottom: 0.75rem;
	}

	:global(.prose li) {
		margin-bottom: 0.25rem;
	}

	:global(.prose code) {
		background-color: rgba(255, 255, 255, 0.1);
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-family:
			ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
	}

	:global(.prose pre) {
		background-color: rgba(255, 255, 255, 0.1);
		padding: 1rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin: 1rem 0;
	}

	:global(.prose pre code) {
		background-color: transparent;
		padding: 0;
	}

	:global(.prose a) {
		color: #60a5fa;
		text-decoration: underline;
	}

	:global(.prose a:hover) {
		color: #93c5fd;
	}

	:global(.prose strong) {
		font-weight: 600;
	}

	:global(.prose em) {
		font-style: italic;
	}
</style>
