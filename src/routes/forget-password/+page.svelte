<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';
	let phone = '';
	let countryCode = '60';
	let otpCode = '';
	let newPassword = '';
	let confirmPassword = '';
	let showNewPassword = false;
	let showConfirmPassword = false;
	let showOtp = false;
	let step = 'phone'; // 'phone', 'otp', 'reset'
	let otpSent = false;
	let otpVerified = false;
	let isSendingOtp = false;
	let isVerifyingOtp = false;
	let otpError = '';
	let otpExpiresAt: Date | null = null;
	let otpCountdown = '';
	let cooldownActive = false;
	let cooldownRemaining = 0;
	let cooldownInterval: NodeJS.Timeout | null = null;

	// Phone validation
	function isPhoneNumberValid(): boolean {
		if (!phone) return false;
		const phoneDigitsOnly = phone.replace(/\D/g, '');
		return phoneDigitsOnly.length >= 8 && phoneDigitsOnly.length <= 11;
	}

	function getMaskedPhoneNumber(): string {
		if (!phone) return '';

		const phoneDigitsOnly = phone.replace(/\D/g, '');
		const fullPhoneNumber = countryCode ? countryCode + phoneDigitsOnly : phoneDigitsOnly;

		return fullPhoneNumber;
	}

	function startOtpCountdown() {
		const updateCountdown = () => {
			if (otpExpiresAt) {
				const now = new Date();
				const timeLeft = otpExpiresAt.getTime() - now.getTime();

				if (timeLeft <= 0) {
					otpCountdown = 'Expired';
					otpSent = false;
					otpVerified = false;
					otpExpiresAt = null;
					return;
				}

				const minutes = Math.floor(timeLeft / 60000);
				const seconds = Math.floor((timeLeft % 60000) / 1000);
				otpCountdown = `${minutes}:${seconds.toString().padStart(2, '0')}`;

				setTimeout(updateCountdown, 1000);
			}
		};

		updateCountdown();
	}

	function startCooldown(initialTime: number = 60) {
		cooldownActive = true;
		cooldownRemaining = initialTime;

		if (cooldownInterval) {
			clearInterval(cooldownInterval);
		}

		cooldownInterval = setInterval(() => {
			cooldownRemaining--;

			if (cooldownRemaining <= 0) {
				cooldownActive = false;
				cooldownRemaining = 0;
				if (cooldownInterval) {
					clearInterval(cooldownInterval);
					cooldownInterval = null;
				}
			}
		}, 1000);
	}

	function resetOtp() {
		otpSent = false;
		otpVerified = false;
		otpCode = '';
		otpError = '';
		otpExpiresAt = null;
		otpCountdown = '';

		cooldownActive = false;
		cooldownRemaining = 0;
		if (cooldownInterval) {
			clearInterval(cooldownInterval);
			cooldownInterval = null;
		}
	}

	// Send WhatsApp OTP for password reset
	async function sendResetOtp() {
		if (!phone) {
			errorMessage = 'Please enter a phone number first';
			return;
		}

		if (!isPhoneNumberValid()) {
			errorMessage = 'Please enter a valid phone number';
			return;
		}

		isSendingOtp = true;
		errorMessage = '';
		otpError = '';
		otpSent = false;
		otpVerified = false;

		try {
			const phoneDigitsOnly = phone.replace(/\D/g, '');
			const fullPhoneNumber = countryCode ? countryCode + phoneDigitsOnly : phoneDigitsOnly;

			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phoneNumber: fullPhoneNumber })
			});

			const data = await response.json();

			if (data.success) {
				otpSent = true;
				successMessage = data.message;
				otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
				startOtpCountdown();
				startCooldown();
				step = 'otp';
			} else {
				errorMessage = data.message || 'Failed to send reset OTP';
			}
		} catch (err) {
			console.error('Error sending reset OTP:', err);
			errorMessage = 'Failed to send reset OTP. Please try again later.';
		} finally {
			isSendingOtp = false;
		}
	}

	// Verify OTP
	async function verifyOtp() {
		if (!phone || !otpCode) {
			otpError = 'Please enter the OTP code';
			return;
		}

		isVerifyingOtp = true;
		otpError = '';

		try {
			const phoneDigitsOnly = phone.replace(/\D/g, '');
			const fullPhoneNumber = countryCode ? countryCode + phoneDigitsOnly : phoneDigitsOnly;

			const response = await fetch('/api/auth/verify-reset-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					phoneNumber: fullPhoneNumber,
					otp: otpCode
				})
			});

			const data = await response.json();

			if (data.success) {
				otpVerified = true;
				successMessage = 'OTP verified successfully! You can now reset your password.';
				step = 'reset';
			} else {
				otpError = data.message || 'Invalid OTP';
			}
		} catch (err) {
			console.error('Error verifying OTP:', err);
			otpError = 'Failed to verify OTP. Please try again.';
		} finally {
			isVerifyingOtp = false;
		}
	}

	// Cleanup function
	onMount(() => {
		return () => {
			if (cooldownInterval) {
				clearInterval(cooldownInterval);
			}
		};
	});

	// Reset password
	async function resetPassword() {
		if (!newPassword) {
			errorMessage = 'Please enter a new password';
			return;
		}

		if (newPassword !== confirmPassword) {
			errorMessage = 'Passwords do not match';
			return;
		}

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			const phoneDigitsOnly = phone.replace(/\D/g, '');
			const fullPhoneNumber = countryCode ? countryCode + phoneDigitsOnly : phoneDigitsOnly;

			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					phoneNumber: fullPhoneNumber,
					otp: otpCode,
					newPassword
				})
			});

			const data = await response.json();

			if (data.success) {
				successMessage = 'Password reset successfully! Redirecting to login...';
				setTimeout(() => {
					goto('/auth');
				}, 2000);
			} else {
				errorMessage = data.message || 'Failed to reset password';
			}
		} catch (err) {
			console.error('Error resetting password:', err);
			errorMessage = 'Failed to reset password. Please try again later.';
		} finally {
			isLoading = false;
		}
	}

	function goBackToLogin() {
		goto('/auth');
	}

	function goBackToPhone() {
		step = 'phone';
		errorMessage = '';
		successMessage = '';
		resetOtp();
	}
</script>

<svelte:head>
	<title>Reset Password - Template App</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div>
			<div class="mx-auto h-12 w-12">
				<svg
					class="h-12 w-12 text-purple-600"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					/>
				</svg>
			</div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				{#if step === 'phone'}
					Reset Password
				{:else if step === 'otp'}
					Verify Phone
				{:else}
					New Password
				{/if}
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				{#if step === 'phone'}
					Enter your phone number to receive an OTP
				{:else if step === 'otp'}
					Enter the 6-digit code sent to your phone
				{:else}
					Create your new password
				{/if}
			</p>
		</div>

		<div class="rounded-lg bg-white px-6 py-8 text-gray-900 shadow sm:px-10">
			<!-- Messages -->
			{#if errorMessage}
				<div class="mb-4 rounded-md bg-red-50 p-4">
					<div class="text-sm text-red-700">{errorMessage}</div>
				</div>
			{/if}

			{#if successMessage}
				<div class="mb-4 rounded-md bg-green-50 p-4">
					<div class="text-sm text-green-700">{successMessage}</div>
				</div>
			{/if}

			{#if step === 'phone'}
				<!-- Phone Step -->
				<form onsubmit={(e) => e.preventDefault()} class="space-y-6">
					<div>
						<label for="phone" class="block text-sm font-medium text-gray-700">
							Phone Number
						</label>
						<div class="mt-1 flex gap-2">
							<!-- Country Code Dropdown -->
							<select
								id="country-code"
								bind:value={countryCode}
								class="w-24 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:ring-purple-500 focus:outline-none sm:text-sm"
							>
								<option value="">-</option>
								<option value="60">+60</option>
								<option value="65">+65</option>
							</select>

							<!-- Phone Number Input -->
							<input
								type="tel"
								id="phone"
								bind:value={phone}
								placeholder="123456789"
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:outline-none sm:text-sm"
							/>
						</div>
					</div>

					<button
						onclick={sendResetOtp}
						disabled={isSendingOtp || cooldownActive || !phone || !isPhoneNumberValid()}
						class="group relative flex w-full justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
					>
						{#if isSendingOtp}
							<div class="flex items-center">
								<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
								Sending OTP...
							</div>
						{:else if cooldownActive}
							Wait {cooldownRemaining}s
						{:else}
							Send WhatsApp OTP
						{/if}
					</button>

					<div class="text-center">
						<button
							onclick={goBackToLogin}
							class="text-sm text-purple-600 hover:text-purple-500"
						>
							Back to Sign In
						</button>
					</div>
				</form>

				<!-- Instructions -->
				<div class="mt-6 rounded-md bg-blue-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-3 flex-1 md:flex md:justify-between">
							<p class="text-sm text-blue-700">
								Enter your phone number and we'll send you a WhatsApp OTP to verify your identity.
							</p>
						</div>
					</div>
				</div>

			{:else if step === 'otp'}
				<!-- OTP Verification Step -->
				<div class="space-y-6">
					<div class="rounded-md bg-green-50 p-4">
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm font-medium text-green-800">
									OTP sent to {getMaskedPhoneNumber()}
								</p>
							</div>
						</div>
					</div>

					<div>
						<label for="otp" class="block text-sm font-medium text-gray-700">One-Time Password</label>
						<div class="mt-1 flex gap-2">
							<input
								id="otp"
								type="text"
								bind:value={otpCode}
								placeholder="6-digit OTP"
								maxlength="6"
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:outline-none sm:text-sm"
								oninput={() => {
									if (otpCode.length === 6 && !isVerifyingOtp) {
										verifyOtp();
									}
								}}
							/>
							<button
								type="button"
								onclick={verifyOtp}
								disabled={isVerifyingOtp || !otpCode || otpCode.length !== 6}
								class="rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
							>
								{isVerifyingOtp ? 'Verifying...' : 'Verify'}
							</button>
						</div>
					</div>

					{#if otpError}
						<div class="text-sm text-red-600">
							{otpError}
						</div>
					{/if}

					<div class="flex items-center justify-between text-sm">
						{#if otpCountdown}
							<span class="text-gray-500">Expires in: {otpCountdown}</span>
						{/if}
						<button
							type="button"
							onclick={resetOtp}
							class="font-medium text-purple-600 hover:text-purple-500"
						>
							Resend OTP
						</button>
					</div>
					
					<div class="border-t border-gray-200 pt-4 text-center">
						<button
							onclick={goBackToPhone}
							class="text-sm text-gray-500 hover:text-gray-900"
						>
							Change Phone Number
						</button>
					</div>
				</div>

			{:else if step === 'reset'}
				<!-- Reset Password Step -->
				<form onsubmit={(e) => e.preventDefault()} class="space-y-6">
					<div>
						<label for="newPassword" class="block text-sm font-medium text-gray-700">
							New Password
						</label>
						<div class="relative mt-1">
							<input
								type={showNewPassword ? 'text' : 'password'}
								id="newPassword"
								bind:value={newPassword}
								placeholder="Enter your new password"
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 placeholder-gray-400 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:outline-none sm:text-sm"
							/>
							<button
								type="button"
								class="absolute inset-y-0 right-0 flex items-center pr-3"
								onclick={() => (showNewPassword = !showNewPassword)}
							>
								{#if showNewPassword}
									<svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
									</svg>
								{:else}
									<svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								{/if}
							</button>
						</div>
					</div>

					<div>
						<label for="confirmPassword" class="block text-sm font-medium text-gray-700">
							Confirm New Password
						</label>
						<div class="relative mt-1">
							<input
								type={showConfirmPassword ? 'text' : 'password'}
								id="confirmPassword"
								bind:value={confirmPassword}
								placeholder="Confirm your new password"
								class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 placeholder-gray-400 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:outline-none sm:text-sm"
							/>
							<button
								type="button"
								class="absolute inset-y-0 right-0 flex items-center pr-3"
								onclick={() => (showConfirmPassword = !showConfirmPassword)}
							>
								{#if showConfirmPassword}
									<svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
									</svg>
								{:else}
									<svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								{/if}
							</button>
						</div>
					</div>

					<button
						onclick={resetPassword}
						disabled={isLoading}
						class="group relative flex w-full justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
					>
						{#if isLoading}
							<div class="flex items-center">
								<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
								Resetting Password...
							</div>
						{:else}
							Reset Password
						{/if}
					</button>

					<div class="text-center">
						<button
							onclick={goBackToPhone}
							class="text-sm text-gray-500 hover:text-gray-900"
						>
							Use different phone
						</button>
					</div>
				</form>
				
				<!-- Password Requirements -->
				<div class="mt-6 rounded-md bg-blue-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-3">
							<p class="text-sm font-medium text-blue-800">Password Requirements:</p>
							<ul class="mt-1 list-inside list-disc text-sm text-blue-700">
								<li>Both passwords must match</li>
							</ul>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
