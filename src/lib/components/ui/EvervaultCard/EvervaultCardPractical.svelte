<script lang="ts">
	import { useMotionTemplate, useMotionValue, Motion } from 'svelte-motion';
	import { cn } from '$lib/utils/cn';
	import { onMount } from 'svelte';

	export let title: string = 'Card Title';
	export let subtitle: string | undefined = undefined;
	export let description: string =
		'This is a practical card variant with more content and functionality.';
	export let avatar: string | undefined = undefined;
	export let actions: Array<{
		label: string;
		onClick?: () => void;
		variant?: 'primary' | 'secondary';
	}> = [
		{ label: 'View Details', variant: 'primary' },
		{ label: 'Learn More', variant: 'secondary' }
	];
	export let className: string | undefined = undefined;

	let mouseX = useMotionValue(0);
	let mouseY = useMotionValue(0);

	let randomString = '';

	onMount(() => {
		let str = generateRandomString(1500);
		randomString = str;
	});

	function onMouseMove({ currentTarget, clientX, clientY }: any) {
		let { left, top } = currentTarget.getBoundingClientRect();
		mouseX.set(clientX - left);
		mouseY.set(clientY - top);

		const str = generateRandomString(1500);
		randomString = str;
	}

	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const generateRandomString = (length: number) => {
		let result = '';
		for (let i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		return result;
	};

	let maskImage = useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`;
	let style = { maskImage, WebkitMaskImage: maskImage };
</script>

<div
	class={cn(
		'relative flex h-full w-full items-center justify-center bg-transparent p-0.5',
		className
	)}
>
	<div
		role="presentation"
		on:mousemove={onMouseMove}
		class="group/card relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-black/[0.1] bg-white shadow-lg dark:border-white/[0.1] dark:bg-zinc-900"
	>
		<!-- Hover effects - background only, avoiding text areas -->
		<div class="pointer-events-none absolute inset-0 rounded-2xl">
			<!-- Subtle background gradient effect -->
			<Motion let:motion {style}>
				<div
					use:motion
					class="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/10 to-blue-700/10 opacity-0 transition duration-500 group-hover/card:opacity-100"
				></div>
			</Motion>

			<!-- Random characters effect in corners and edges only -->
			<Motion let:motion {style}>
				<div
					use:motion
					class="absolute inset-0 rounded-2xl opacity-0 group-hover/card:opacity-100"
					style="mask-image: radial-gradient(circle at 20% 20% 30px, black 0%, transparent 70%), radial-gradient(circle at 80% 20% 30px, black 0%, transparent 70%), radial-gradient(circle at 20% 80% 30px, black 0%, transparent 70%), radial-gradient(circle at 80% 80% 30px, black 0%, transparent 70%), linear-gradient(to bottom, transparent 30%, black 40%, black 60%, transparent 70%); -webkit-mask-composite: xor; mask-composite: exclude;"
				>
					<div class="absolute inset-0 mix-blend-overlay">
						<p
							class="absolute inset-x-0 h-full font-mono text-xs font-bold break-words whitespace-pre-wrap text-green-400/30 transition duration-500"
						>
							{randomString}
						</p>
					</div>
				</div>
			</Motion>
		</div>

		<!-- Main content with higher z-index -->
		<div class="relative z-10 flex h-full flex-col">
			<!-- Header with avatar/icon -->
			<div class="flex items-center justify-between p-6 pb-4">
				<div class="flex items-center space-x-3">
					{#if avatar}
						<img
							src={avatar}
							alt="Avatar"
							class="h-12 w-12 rounded-full object-cover ring-2 ring-black/[0.1] dark:ring-white/[0.1]"
						/>
					{:else}
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-semibold text-white"
						>
							{title.charAt(0).toUpperCase()}
						</div>
					{/if}
					<div>
						<h3 class="text-lg font-semibold text-black dark:text-white">{title}</h3>
						{#if subtitle}
							<p class="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
						{/if}
					</div>
				</div>
				<div class="text-gray-400 dark:text-gray-500">
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width={2}
							d="M12 5v.01M12 12v.01M12 19v.01"
						/>
					</svg>
				</div>
			</div>

			<!-- Description -->
			<div class="px-6 pb-4">
				<p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{description}</p>
			</div>

			<!-- Actions -->
			<div class="mt-auto px-6 pb-6">
				<div class="flex space-x-3">
					{#each actions as action}
						<button
							class={cn(
								'relative z-20 flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
								action.variant === 'primary'
									? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md hover:from-blue-600 hover:to-purple-700 hover:shadow-lg'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700'
							)}
							on:click={action.onClick}
						>
							{action.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
