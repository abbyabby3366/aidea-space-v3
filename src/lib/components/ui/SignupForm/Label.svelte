<script lang="ts">
	import { cn } from '$lib/utils/cn';

	export let className: string | undefined = undefined;
</script>

<label
	class={cn(
		'text-sm leading-none font-medium text-black peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-white',
		className
	)}
	{...$$restProps}
>
	<slot />
</label>
