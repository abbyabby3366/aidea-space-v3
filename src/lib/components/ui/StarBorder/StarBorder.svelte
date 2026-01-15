<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface StarBorderProps {
		as?: string;
		color?: string;
		speed?: string;
		className?: string;
		children?: import('svelte').Snippet;
	}

	export let as: string = 'button';
	export let color: string = 'hsl(var(--foreground))';
	export let speed: string = '6s';
	export let className: string | undefined = undefined;
	export let children: any;
</script>

<svelte:element
	this={as}
	class={cn('relative inline-block overflow-hidden rounded-[20px] py-[1px]', className)}
	{...$$restProps}
>
	<div
		class={cn(
			'animate-star-movement-bottom absolute right-[-250%] bottom-[-11px] z-0 h-[50%] w-[300%] rounded-full',
			'opacity-20 dark:opacity-70'
		)}
		style="background: radial-gradient(circle, {color}, transparent 10%); animation-duration: {speed};"
	></div>
	<div
		class={cn(
			'animate-star-movement-top absolute top-[-10px] left-[-250%] z-0 h-[50%] w-[300%] rounded-full',
			'opacity-20 dark:opacity-70'
		)}
		style="background: radial-gradient(circle, {color}, transparent 10%); animation-duration: {speed};"
	></div>
	<div
		class={cn(
			'text-foreground relative z-1 rounded-[20px] border px-6 py-4 text-center text-base',
			'from-background/90 to-muted/90 border-border/40 bg-gradient-to-b',
			'dark:from-background dark:to-muted dark:border-border'
		)}
	>
		{@render children?.()}
	</div>
</svelte:element>
