<script lang="ts">
	import { onMount } from 'svelte';
	import { getImageUrl } from '$lib/utils';

	interface BannerAnnouncement {
		id: string;
		title: string;
		content: string;
		coverPhoto: string;
		author: string;
		memberTier: 'all' | 'lite' | 'VIP';
		publishedAt: string;
	}

	let announcements: BannerAnnouncement[] = [];
	let loading = true;
	let currentIndex = 0;
	let userTier = 'lite';

	let intervalId: NodeJS.Timeout | null = null;

	onMount(() => {
		loadBannerAnnouncements().then(() => {
			// Auto-rotate banners every 5 seconds
			if (announcements.length > 1) {
				intervalId = setInterval(() => {
					currentIndex = (currentIndex + 1) % announcements.length;
				}, 5000);
			}
		});

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});

	async function loadBannerAnnouncements() {
		try {
			const token = localStorage.getItem('authToken');
			if (!token) {
				loading = false;
				return;
			}

			// Get user tier from profile
			const profileResponse = await fetch('/api/user/profile', {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (profileResponse.ok) {
				const profileData = await profileResponse.json();
				userTier = profileData.user?.effectiveMemberTier || profileData.user?.memberTier || 'lite';
			} else if (profileResponse.status === 401) {
				localStorage.removeItem('authToken');
				loading = false;
				return;
			}

			// Fetch banner announcements
			const response = await fetch(`/api/banner-announcements?memberTier=${userTier}`, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				announcements = data.announcements.map((announcement: any) => ({
					...announcement,
					id: announcement._id
				}));
			} else if (response.status === 401) {
				localStorage.removeItem('authToken');
			}
		} catch (error) {
			console.error('Error loading banner announcements:', error);
		} finally {
			loading = false;
		}
	}

	function goToSlide(index: number) {
		currentIndex = index;
	}

	function nextSlide() {
		currentIndex = (currentIndex + 1) % announcements.length;
	}

	function prevSlide() {
		currentIndex = currentIndex === 0 ? announcements.length - 1 : currentIndex - 1;
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function navigateToAnnouncement(announcementId: string) {
		window.location.href = `/announcements/${announcementId}`;
	}
</script>

{#if !loading && announcements.length > 0}
	<div class="banner-wrapper">
		<div class="banner-container">
			<div class="banner-slider">
				{#each announcements as announcement, index}
					<div class="banner-slide" class:active={index === currentIndex}>
						<div
							class="banner-content"
							role="button"
							tabindex="0"
							onclick={() => navigateToAnnouncement(announcement.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									navigateToAnnouncement(announcement.id);
								}
							}}
						>
							{#if announcement.coverPhoto}
								<div class="banner-image">
									<img src={getImageUrl(announcement.coverPhoto)} alt={announcement.title} />
								</div>
							{/if}
							<div class="banner-text">
								<h3 class="banner-title">{announcement.title}</h3>
								<p class="banner-content-preview">{announcement.content}</p>
								<span class="banner-date">{formatDate(announcement.publishedAt)}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>

			{#if announcements.length > 1}
				<!-- Navigation dots -->
				<div class="banner-dots">
					{#each announcements as _, index}
						<button
							class="banner-dot"
							class:active={index === currentIndex}
							onclick={(e) => {
								e.stopPropagation();
								goToSlide(index);
							}}
							aria-label="Go to slide {index + 1}"
						></button>
					{/each}
				</div>

				<!-- Navigation arrows -->
				<button
					class="banner-nav banner-prev"
					onclick={(e) => {
						e.stopPropagation();
						prevSlide();
					}}
					aria-label="Previous slide"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M15 18l-6-6 6-6" />
					</svg>
				</button>
				<button
					class="banner-nav banner-next"
					onclick={(e) => {
						e.stopPropagation();
						nextSlide();
					}}
					aria-label="Next slide"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M9 18l6-6-6-6" />
					</svg>
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Override parent container styles that might interfere */
	:global(.announcement-banner-section) {
		display: flex !important;
		justify-content: center !important;
		align-items: center !important;
		padding: 0 !important;
		margin: 0 !important;
		width: 100% !important;
		max-width: none !important;
	}

	:global(.dashboard-main) {
		align-items: center !important;
	}

	/* Banner wrapper for absolute centering */
	.banner-wrapper {
		width: 100% !important;
		display: flex !important;
		justify-content: center !important;
		align-items: center !important;
		margin: 0 !important;
		padding: 0 !important;
	}

	/* Reset any inherited styles and ensure proper centering */
	.banner-container {
		position: relative;
		width: 100%;
		max-width: 600px;
		margin: 0 auto !important;
		background: linear-gradient(135deg, rgba(1, 98, 246, 0.1) 0%, rgba(128, 0, 203, 0.1) 100%);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 16px;
		overflow: hidden;
		backdrop-filter: blur(10px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		display: flex !important;
		flex-direction: column !important;
		align-items: center !important;
		justify-content: center !important;
	}

	.banner-slider {
		position: relative;
		width: 100%;
		height: 180px;
		overflow: hidden;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
	}

	.banner-slide {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		transform: translateX(100%);
		transition: all 0.5s ease-in-out;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
	}

	.banner-slide.active {
		opacity: 1;
		transform: translateX(0);
	}

	.banner-content {
		display: flex !important;
		height: 100%;
		width: 100%;
		align-items: center !important;
		justify-content: flex-start !important;
		padding: 1rem;
		padding-left: 3rem;
		padding-right: 3rem;
		gap: 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
		text-align: left !important;
	}

	.banner-content:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.banner-image {
		flex-shrink: 0;
		width: 140px;
		height: 160px;
		border-radius: 12px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.1);
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
		margin: 0 auto;
	}

	.banner-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.banner-text {
		flex: 1;
		color: white;
		min-width: 0;
		display: flex !important;
		flex-direction: column !important;
		justify-content: center !important;
		align-items: flex-start !important;
		text-align: left !important;
		gap: 0.5rem;
		margin: 0;
	}

	.banner-title {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 0;
		color: white;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: left !important;
	}

	.banner-content-preview {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.9);
		margin: 0.25rem 0;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: left !important;
	}

	.banner-date {
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.8);
		font-weight: 500;
		text-align: left !important;
	}

	.banner-dots {
		position: absolute;
		bottom: 0.75rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.banner-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.banner-dot.active {
		background: rgba(255, 255, 255, 0.8);
	}

	.banner-dot:hover {
		background: rgba(255, 255, 255, 0.6);
	}

	.banner-nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		cursor: pointer;
		transition: all 0.2s;
		backdrop-filter: blur(10px);
	}

	.banner-nav:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: translateY(-50%) scale(1.05);
	}

	.banner-prev {
		left: 0.75rem;
	}

	.banner-next {
		right: 0.75rem;
	}

	/* Mobile styles */
	@media (max-width: 768px) {
		:global(.announcement-banner-section) {
			padding: 0 !important;
			margin: 0 !important;
		}

		.banner-container {
			margin: 0 0.5rem !important;
			border-radius: 12px;
		}

		.banner-slider {
			height: 160px;
		}

		.banner-content {
			padding: 0.75rem;
			padding-left: 2.5rem;
			padding-right: 2.5rem;
			gap: 0.75rem;
		}

		.banner-image {
			width: 120px;
			height: 140px;
			border-radius: 10px;
		}

		.banner-title {
			font-size: 1rem;
			line-height: 1.2;
		}

		.banner-content-preview {
			font-size: 0.85rem;
			line-height: 1.3;
		}

		.banner-date {
			font-size: 0.8rem;
		}

		.banner-nav {
			width: 32px;
			height: 32px;
		}

		.banner-prev {
			left: 0.5rem;
		}

		.banner-next {
			right: 0.5rem;
		}

		.banner-dots {
			bottom: 0.5rem;
		}

		.banner-dot {
			width: 6px;
			height: 6px;
		}
	}

	/* Extra small mobile devices */
	@media (max-width: 480px) {
		.banner-slider {
			height: 140px;
		}

		.banner-content {
			padding: 0.5rem;
			padding-left: 2rem;
			padding-right: 2rem;
			gap: 0.5rem;
		}

		.banner-image {
			width: 100px;
			height: 120px;
			border-radius: 8px;
		}

		.banner-title {
			font-size: 0.9rem;
			line-height: 1.1;
		}

		.banner-content-preview {
			font-size: 0.8rem;
			line-height: 1.2;
		}

		.banner-date {
			font-size: 0.75rem;
		}

		.banner-nav {
			width: 28px;
			height: 28px;
		}

		.banner-prev {
			left: 0.25rem;
		}

		.banner-next {
			right: 0.25rem;
		}
	}
</style>
