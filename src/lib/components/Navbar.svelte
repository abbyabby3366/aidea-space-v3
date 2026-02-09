<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Get current path for active navigation highlighting
	$: currentPath = $page.url.pathname;

	let userTier = 'lite';
	let loading = true;
	let mobileMenuOpen = false;

	onMount(() => {
		// Load user tier asynchronously
		loadUserTier();

		// Add keyboard event listener for Escape key
		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && mobileMenuOpen) {
				closeMobileMenu();
			}
		};

		document.addEventListener('keydown', handleKeydown);

		// Cleanup function
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	async function loadUserTier() {
		try {
			const token = localStorage.getItem('authToken');
			if (!token) {
				loading = false;
				return;
			}

			const response = await fetch('/api/user/profile', {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				const userData = await response.json();
				userTier = userData.user?.effectiveMemberTier || userData.user?.memberTier || 'lite';
			} else if (response.status === 401) {
				localStorage.removeItem('authToken');
			}
		} catch (error) {
			console.error('Error loading user tier:', error);
		} finally {
			loading = false;
		}
	}

	// Logout function
	function logout() {
		localStorage.removeItem('authToken');
		goto('/auth');
	}

	// Toggle mobile menu
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
		updateBodyScroll();
	}

	// Close mobile menu when clicking outside or on a link
	function closeMobileMenu() {
		mobileMenuOpen = false;
		updateBodyScroll();
	}

	// Update body scroll lock based on mobile menu state
	function updateBodyScroll() {
		if (mobileMenuOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	// Close mobile menu when clicking on a navigation link
	function handleNavClick() {
		mobileMenuOpen = false;
		updateBodyScroll();
	}

	// Template navigation items
	$: navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: '🏠' },
		{ href: '/profile', label: 'Profile', icon: '👤' }
	];
</script>

<nav class="navbar {loading ? 'loading' : ''}">
	<div class="navbar-container">
		<!-- Mobile Menu Button -->
		<button class="mobile-menu-btn" onclick={toggleMobileMenu} aria-label="Toggle mobile menu">
			<div class="hamburger {mobileMenuOpen ? 'open' : ''}">
				<span></span>
				<span></span>
				<span></span>
			</div>
		</button>

		<!-- Logo/Brand -->
		<div class="navbar-brand">
			<a href="/dashboard" class="brand-link">
				<span class="brand-icon">📋</span>
				<span class="brand-text">Template</span>
			</a>
		</div>

		<!-- Desktop Navigation Links -->
		<div class="navbar-nav desktop-nav">
			{#if !loading}
				{#each navItems as item}
					<a
						href={item.href}
						class="nav-link {currentPath === item.href ? 'active' : ''}"
						title={item.label}
					>
						<span class="nav-label">{item.label}</span>
					</a>
				{/each}
			{:else}
				<!-- Loading skeleton for nav items -->
				<div class="nav-skeleton">
					<div class="skeleton-item"></div>
					<div class="skeleton-item"></div>
					<div class="skeleton-item"></div>
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="navbar-actions">
			<a
				href="/announcements"
				class="action-btn announcements-btn"
				title="Announcements"
				aria-label="Announcements"
			>
				<svg
					class="action-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M3 11l18-5v12L3 13v-2z" />
					<path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
				</svg>
			</a>
			<button onclick={logout} class="action-btn logout-btn" title="Logout" aria-label="Logout">
				<svg
					class="action-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
					<polyline points="16,17 21,12 16,7" />
					<line x1="21" y1="12" x2="9" y2="12" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Mobile Menu Overlay -->
	{#if mobileMenuOpen}
		<div
			class="mobile-menu-overlay"
			onclick={closeMobileMenu}
			onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}
			role="button"
			tabindex="0"
			aria-label="Close mobile menu"
		></div>
	{/if}

	<!-- Mobile Slide-out Menu -->
	<div class="mobile-menu {mobileMenuOpen ? 'open' : ''}">
		<div class="mobile-menu-header">
			<div class="mobile-brand">
				<span class="brand-icon">📋</span>
				<span class="brand-text">Template</span>
			</div>
			<button class="close-btn" onclick={closeMobileMenu} aria-label="Close menu">
				<span>✕</span>
			</button>
		</div>

		<div class="mobile-menu-content">
			{#if !loading}
				{#each navItems as item}
					<a
						href={item.href}
						class="mobile-nav-link {currentPath === item.href ? 'active' : ''}"
						onclick={handleNavClick}
					>
						<span class="mobile-nav-icon">{item.icon}</span>
						<span class="mobile-nav-label">{item.label}</span>
					</a>
				{/each}
			{/if}

			<div class="mobile-menu-actions">
				<a href="/announcements" class="mobile-action-btn" onclick={handleNavClick}>
					<svg
						class="mobile-action-icon"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M3 11l18-5v12L3 13v-2z" />
						<path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
					</svg>
					<span class="mobile-action-label">Announcements</span>
				</a>
				<button onclick={logout} class="mobile-action-btn logout">
					<svg
						class="mobile-action-icon"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
						<polyline points="16,17 21,12 16,7" />
						<line x1="21" y1="12" x2="9" y2="12" />
					</svg>
					<span class="mobile-action-label">Logout</span>
				</button>
			</div>
		</div>
	</div>
</nav>

<style>
	.navbar {
		background: linear-gradient(135deg, rgba(15, 15, 35, 0.95), rgba(26, 26, 46, 0.95));
		backdrop-filter: blur(16px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		position: sticky;
		top: 0;
		z-index: 1000;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		/* Ensure navbar is always visible and doesn't flash */
		will-change: auto;
		transform: translateZ(0);
		backface-visibility: hidden;
	}

	.navbar-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 64px;
	}

	/* Mobile Menu Button */
	.mobile-menu-btn {
		display: none;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 8px;
		transition: background-color 0.2s ease;
	}

	.mobile-menu-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.hamburger {
		display: flex;
		flex-direction: column;
		width: 24px;
		height: 18px;
		justify-content: space-between;
	}

	.hamburger span {
		display: block;
		height: 2px;
		width: 100%;
		background: white;
		border-radius: 1px;
		transition: all 0.3s ease;
		transform-origin: center;
	}

	.hamburger.open span:nth-child(1) {
		transform: rotate(45deg) translate(6px, 6px);
	}

	.hamburger.open span:nth-child(2) {
		opacity: 0;
	}

	.hamburger.open span:nth-child(3) {
		transform: rotate(-45deg) translate(6px, -6px);
	}

	.navbar-brand {
		display: flex;
		align-items: center;
	}

	.brand-link {
		display: flex;
		align-items: center;
		text-decoration: none;
		color: white;
		font-weight: 700;
		font-size: 1.5rem;
		transition: transform 0.2s ease;
	}

	.brand-link:hover {
		transform: scale(1.05);
	}

	.brand-icon {
		font-size: 2rem;
		margin-right: 0.5rem;
	}

	.brand-text {
		background: linear-gradient(135deg, #0162f6, #8000cb);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.navbar-nav {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.75rem;
		text-decoration: none;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 500;
		border-radius: 8px;
		transition: all 0.2s ease;
		position: relative;
	}

	.nav-link:hover {
		color: white;
		background: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}

	.nav-link.active {
		color: white;
		background: rgba(255, 255, 255, 0.2);
	}

	.nav-link.active::after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 50%;
		transform: translateX(-50%);
		width: 20px;
		height: 3px;
		background: white;
		border-radius: 2px;
	}

	.nav-label {
		font-size: 0.9rem;
	}

	.navbar-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
		min-width: 40px;
		height: 40px;
	}

	.announcements-btn {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.announcements-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		transform: translateY(-1px);
	}

	.logout-btn {
		background: linear-gradient(135deg, #ff6b6b, #ee5a24);
		color: white;
	}

	.logout-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(238, 90, 36, 0.3);
	}

	.logout-btn:active {
		transform: translateY(0);
	}

	.action-icon {
		width: 1.2rem;
		height: 1.2rem;
	}

	/* Mobile Menu Overlay */
	.mobile-menu-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
		backdrop-filter: blur(4px);
	}

	/* Mobile Slide-out Menu */
	.mobile-menu {
		position: fixed;
		top: 0;
		left: -320px;
		width: 320px;
		height: 100vh;
		background: linear-gradient(135deg, rgba(15, 15, 35, 0.98), rgba(26, 26, 46, 0.98));
		backdrop-filter: blur(20px);
		border-right: 1px solid rgba(255, 255, 255, 0.2);
		z-index: 1001;
		transition: left 0.3s ease;
		box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
		overflow-y: auto;
	}

	.mobile-menu.open {
		left: 0;
	}

	.mobile-menu-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
	}

	.mobile-brand {
		display: flex;
		align-items: center;
		color: white;
		font-weight: 700;
		font-size: 1.5rem;
	}

	.mobile-brand .brand-icon {
		font-size: 2rem;
		margin-right: 0.5rem;
	}

	.mobile-brand .brand-text {
		background: linear-gradient(135deg, #0162f6, #8000cb);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.close-btn {
		background: none;
		border: none;
		color: white;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 8px;
		transition: background-color 0.2s ease;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.mobile-menu-content {
		padding: 1rem 0;
	}

	.mobile-nav-link {
		display: flex;
		align-items: center;
		padding: 1rem 1.5rem;
		text-decoration: none;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 500;
		transition: all 0.2s ease;
		border-left: 4px solid transparent;
	}

	.mobile-nav-link:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border-left-color: #0162f6;
	}

	.mobile-nav-link.active {
		background: rgba(255, 255, 255, 0.15);
		color: white;
		border-left-color: white;
	}

	.mobile-nav-icon {
		font-size: 1.2rem;
		margin-right: 1rem;
		width: 24px;
		text-align: center;
	}

	.mobile-nav-label {
		font-size: 1rem;
	}

	.mobile-menu-actions {
		margin-top: 2rem;
		padding: 1rem 0;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}

	.mobile-action-btn {
		display: flex;
		align-items: center;
		padding: 1rem 1.5rem;
		text-decoration: none;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 500;
		transition: all 0.2s ease;
		border: none;
		background: none;
		width: 100%;
		cursor: pointer;
		border-left: 4px solid transparent;
	}

	.mobile-action-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border-left-color: #0162f6;
	}

	.mobile-action-btn.logout {
		color: rgba(255, 107, 107, 0.8);
	}

	.mobile-action-btn.logout:hover {
		background: rgba(255, 107, 107, 0.1);
		color: #ff6b6b;
		border-left-color: #ff6b6b;
	}

	.mobile-action-icon {
		width: 1.2rem;
		height: 1.2rem;
		margin-right: 1rem;
	}

	.mobile-action-label {
		font-size: 1rem;
	}

	/* Loading skeleton styles */
	.nav-skeleton {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.skeleton-item {
		width: 80px;
		height: 32px;
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.1) 25%,
			rgba(255, 255, 255, 0.2) 50%,
			rgba(255, 255, 255, 0.1) 75%
		);
		border-radius: 8px;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: -200px 0;
		}
		100% {
			background-position: calc(200px + 100%) 0;
		}
	}

	.navbar.loading {
		opacity: 0.8;
	}

	/* Mobile Responsiveness */
	@media (max-width: 768px) {
		.mobile-menu-btn {
			display: block;
		}

		.desktop-nav {
			display: none;
		}

		.navbar-container {
			padding: 0 0.5rem;
		}

		.brand-text {
			display: none;
		}

		.brand-icon {
			margin-right: 0;
		}

		.skeleton-item {
			width: 40px;
			height: 28px;
		}
	}

	@media (max-width: 480px) {
		.navbar-container {
			height: 56px;
		}

		.mobile-menu {
			width: 280px;
			left: -280px;
		}

		.action-btn {
			padding: 0.4rem;
			min-width: 36px;
			height: 36px;
		}
	}
</style>
