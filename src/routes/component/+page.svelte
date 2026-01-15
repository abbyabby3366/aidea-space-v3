<script>
	import {
		BackgroundGradient,
		ButtonRotateBorder,
		EvervaultCard,
		EvervaultCardPractical,
		Icon,
		StarBorder,
		SignupForm,
		HeroParallax,
		SvgMaskEffect
	} from '$lib/components';

	const products = [
		{
			title: 'Moonbeam',
			link: 'https://gomoonbeam.com',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/moonbeam.png'
		},
		{
			title: 'Cursor',
			link: 'https://cursor.so',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/cursor.png'
		},
		{
			title: 'Rogue',
			link: 'https://userogue.com',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/rogue.png'
		},

		{
			title: 'Editorially',
			link: 'https://editorially.org',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/editorially.png'
		},
		{
			title: 'Editrix AI',
			link: 'https://editrix.ai',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/editrix.png'
		},
		{
			title: 'Pixel Perfect',
			link: 'https://app.pixelperfect.quest',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/pixelperfect.png'
		},

		{
			title: 'Algochurn',
			link: 'https://algochurn.com',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/algochurn.png'
		},
		{
			title: 'Aceternity UI',
			link: 'https://ui.aceternity.com',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/aceternityui.png'
		},
		{
			title: 'Tailwind Master Kit',
			link: 'https://tailwindmasterkit.com',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/tailwindmasterkit.png'
		},
		{
			title: 'SmartBridge',
			link: 'https://smartbridgetech.com',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/smartbridge.png'
		},
		{
			title: 'Renderwork Studio',
			link: 'https://renderwork.studio',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/renderwork.png'
		},

		{
			title: 'Creme Digital',
			link: 'https://cremedigital.com',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/cremedigital.png'
		},
		{
			title: 'Golden Bells Academy',
			link: 'https://goldenbellsacademy.com',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/goldenbellsacademy.png'
		},
		{
			title: 'Invoker Labs',
			link: 'https://invoker.lol',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/invoker.png'
		},
		{
			title: 'E Free Invoice',
			link: 'https://efreeinvoice.com',
			thumbnail: 'https://aceternity.com/images/products/thumbnails/new/efreeinvoice.png'
		}
	];
</script>

<svelte:head>
	<title>Components</title>
</svelte:head>

<!-- Hero Parallax Section -->
<div class="container mx-auto w-[80vw] lg:w-[60vw]">
	<HeroParallax {products} />
</div>

<div class="container mx-auto px-4 py-8">
	<h1 class="mb-6 text-3xl font-bold">Component Showcase</h1>
	<p class="mb-8 text-gray-600">Testing UI components from the component library</p>

	<div class="space-y-12">
		<!-- BackgroundGradient Component -->
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold">BackgroundGradient</h2>
			<BackgroundGradient className="p-6">
				<div class="text-center text-white">
					<h3 class="mb-2 text-xl font-bold">Animated Gradient Border</h3>
					<p>This component adds an animated gradient border effect</p>
				</div>
			</BackgroundGradient>
		</div>

		<!-- EvervaultCard Components -->
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold">EvervaultCard</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<EvervaultCard text="Hover me!" className="h-64" />
				<EvervaultCardPractical
					title="Practical Card"
					subtitle="Interactive Example"
					description="This is a practical card variant with more content and functionality. It includes hover effects and action buttons."
					actions={[
						{ label: 'View Details', variant: 'primary' },
						{ label: 'Learn More', variant: 'secondary' }
					]}
				/>
			</div>
		</div>

		<!-- StarBorder Component -->
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold">StarBorder</h2>
			<div class="flex justify-center">
				<StarBorder className="px-8 py-4">
					<span class="text-lg font-medium">Animated Star Border Button</span>
				</StarBorder>
			</div>
		</div>

		<!-- ButtonRotateBorder Component -->
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold">ButtonRotateBorder</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				A rotating border button with animated gradient effect from Magic UI
			</p>
			<div class="flex justify-center">
				<ButtonRotateBorder>Rotating Border Button</ButtonRotateBorder>
			</div>
		</div>

		<!-- Icon Component -->
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold">Icon</h2>
			<div class="flex items-center gap-4">
				<Icon className="h-8 w-8 text-blue-500" />
				<span>Custom SVG Icon Component</span>
			</div>
		</div>

		<!-- SignupForm Component -->
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold">SignupForm</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				A customizable signup form with animated inputs and social login buttons
			</p>
			<div class="flex justify-center">
				<SignupForm />
			</div>
		</div>

		<!-- SvgMaskEffect Component -->
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold">SvgMaskEffect</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				A mask reveal effect - hover the cursor over the container to reveal what's underneath
			</p>
			<div class="flex h-[20rem] w-full items-center justify-center overflow-hidden">
				<SvgMaskEffect size={10} revealSize={300} className="h-[20rem] border rounded-md">
					<p
						slot="revealText"
						class="mx-auto max-w-4xl text-center text-4xl font-bold text-slate-800"
					>
						The first rule of MRR Club is you do not talk about MRR Club. The second rule of MRR
						Club is you DO NOT talk about MRR Club.
					</p>
					The first rule of{' '}<span class="text-red-500">MRR Club</span> is you do not talk about
					MRR Club. The second rule of MRR Club is you DO NOT talk about{' '}<span
						class="text-red-500">MRR Club</span
					>.
				</SvgMaskEffect>
			</div>
		</div>
	</div>
</div>
