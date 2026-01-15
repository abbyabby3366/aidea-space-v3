<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let whatsappStatus = 'disconnected';
	let clientInfo = {
		isConnected: false,
		isAuthenticated: false,
		phoneNumber: null
	};
	let qrCode: string | null = null;
	let lastUpdate: string | null = null;
	let isLoading = false;
	let error: string | null = null;

	let statusInterval: NodeJS.Timeout;

	// New control variables
	let canStart = false;
	let canStop = false;
	let canDeleteAuth = false;
	let authExists = false;
	let isStarting = false;
	let isStopping = false;
	let isDeletingAuth = false;

	// Use backend API endpoints instead of direct WhatsApp server communication
	const WHATSAPP_API_BASE = '/api/whatsapp';

	// Test variables
	let testPhoneNumber = '60123456789';
	let testOtp = '123456';

	// Test result variables
	let otpResult: { success: boolean; message: string } | null = null;

	// Loading states
	let isSendingOtp = false;

	// Template management variables
	let otpTemplate = '';

	let otpTemplateVariables = ['otp'];

	let isUpdatingOtp = false;
	let isLoadingTemplates = false;
	let isResettingTemplates = false;

	// Auto-notification settings
	let autoOtpNotifications = false;
	let autoNotificationStatus: { success: boolean; message: string } | null = null;

	// Additional test variables

	// Pairing code and health check variables
	let pairingPhoneNumber = '';
	let pairingCode: string | null = null;
	let isRequestingPairingCode = false;
	let pairingResult: { success: boolean; message: string } | null = null;

	let healthStatus: any = null;
	let isCheckingHealth = false;

	// UI state variables
	let showAdvancedControls = false;

	async function fetchWhatsAppStatus() {
		try {
			isLoading = true;
			error = null;

			console.log('🔄 [FRONTEND] Fetching WhatsApp status from:', `${WHATSAPP_API_BASE}/status`);
			const response = await fetch(`${WHATSAPP_API_BASE}/status`);
			const data = await response.json();

			console.log('📥 [FRONTEND] WhatsApp status data received:', data); // Debug log
			console.log('🔍 [FRONTEND] Data type:', typeof data);
			console.log('🔍 [FRONTEND] Data keys:', Object.keys(data));

			whatsappStatus = data.status;
			clientInfo = data.clientInfo;
			qrCode = data.qrCode;
			canStart = data.canStart || false;
			canStop = data.canStop || false;
			canDeleteAuth = data.canDeleteAuth || false;
			authExists = data.authExists || false;
			lastUpdate = data.timestamp;

			console.log('🔍 [FRONTEND] Status set to:', whatsappStatus);
			console.log(
				'🔍 [FRONTEND] QR Code set to:',
				qrCode ? `"${qrCode.substring(0, 50)}..."` : 'null'
			);
			console.log('🔍 [FRONTEND] QR Code type:', typeof qrCode);
			console.log('🔍 [FRONTEND] Client info set to:', clientInfo);
		} catch (err) {
			console.error('❌ [FRONTEND] Error fetching WhatsApp status:', err);
			error = 'Failed to connect to WhatsApp server';
		} finally {
			isLoading = false;
		}
	}

	async function startWhatsApp() {
		try {
			isStarting = true;
			error = null;

			console.log('🚀 [FRONTEND] Starting WhatsApp...');
			const response = await fetch(`${WHATSAPP_API_BASE}/start-whatsapp`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const data = await response.json();

			if (data.success) {
				console.log('✅ [FRONTEND] WhatsApp start initiated');
				// Wait a moment then refresh status to get QR code
				setTimeout(() => {
					fetchWhatsAppStatus();
				}, 1000);
			} else {
				error = data.error || 'Failed to start WhatsApp';
			}
		} catch (err) {
			console.error('❌ [FRONTEND] Error starting WhatsApp:', err);
			error = 'Failed to start WhatsApp connection';
		} finally {
			isStarting = false;
		}
	}

	async function stopWhatsApp() {
		try {
			isStopping = true;
			error = null;

			console.log('🛑 [FRONTEND] Stopping WhatsApp...');
			const response = await fetch(`${WHATSAPP_API_BASE}/stop-whatsapp`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const data = await response.json();

			if (data.success) {
				console.log('✅ [FRONTEND] WhatsApp stopped successfully');
				// Clear QR code and refresh status
				qrCode = null;
				setTimeout(() => {
					fetchWhatsAppStatus();
				}, 500);
			} else {
				error = data.error || 'Failed to stop WhatsApp';
			}
		} catch (err) {
			console.error('❌ [FRONTEND] Error stopping WhatsApp:', err);
			error = 'Failed to stop WhatsApp connection';
		} finally {
			isStopping = false;
		}
	}

	async function deleteAuth() {
		try {
			isDeletingAuth = true;
			error = null;

			console.log('🗑️ [FRONTEND] Deleting auth folder...');
			const response = await fetch(`${WHATSAPP_API_BASE}/delete-auth`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const data = await response.json();

			if (data.success) {
				console.log('✅ [FRONTEND] Auth folder deleted successfully');
				// Clear everything and refresh status
				qrCode = null;
				clientInfo = {
					isConnected: false,
					isAuthenticated: false,
					phoneNumber: null
				};
				setTimeout(() => {
					fetchWhatsAppStatus();
				}, 500);
			} else {
				error = data.error || 'Failed to delete auth folder';
			}
		} catch (err) {
			console.error('❌ [FRONTEND] Error deleting auth folder:', err);
			error = 'Failed to delete auth folder';
		} finally {
			isDeletingAuth = false;
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'connected':
				return 'text-green-600 bg-green-100';
			case 'authenticated':
				return 'text-blue-600 bg-blue-100';
			case 'qr_ready':
				return 'text-yellow-600 bg-yellow-100';
			case 'auth_failed':
				return 'text-red-600 bg-red-100';
			case 'disconnected':
			default:
				return 'text-gray-600 bg-gray-100';
		}
	}

	function getStatusText(status: string): string {
		switch (status) {
			case 'connected':
				return 'Connected';
			case 'authenticated':
				return 'Authenticated';
			case 'qr_ready':
				return 'QR Code Ready';
			case 'auth_failed':
				return 'Authentication Failed';
			case 'disconnected':
			default:
				return 'Disconnected';
		}
	}

	// Generate QR code when qrCode data changes
	$: if (qrCode && typeof window !== 'undefined') {
		console.log('🎯 [REACTIVE] QR Code reactive block triggered!');
		console.log('🔍 [REACTIVE] qrCode value:', qrCode);
		console.log('🔍 [REACTIVE] qrCode type:', typeof qrCode);
		console.log('🔍 [REACTIVE] qrCode length:', qrCode ? qrCode.length : 'null');
		console.log('🔍 [REACTIVE] Window available:', typeof window !== 'undefined');

		// Add a small delay to ensure DOM is ready
		setTimeout(() => {
			console.log('⏰ [REACTIVE] Timeout executed, importing qrcode...');
			import('qrcode')
				.then((QRCode) => {
					console.log('✅ [REACTIVE] QRCode library imported successfully');
					const container = document.getElementById('qr-code');
					console.log('🔍 [REACTIVE] Container element:', container);
					console.log('🔍 [REACTIVE] Container exists:', !!container);
					console.log('🔍 [REACTIVE] qrCode still valid:', !!qrCode);

					if (container && qrCode) {
						console.log('🎨 [REACTIVE] Generating QR code for:', qrCode.substring(0, 50) + '...');
						container.innerHTML = '';
						// Create a canvas element first
						const canvas = document.createElement('canvas');
						canvas.width = 200;
						canvas.height = 200;
						container.appendChild(canvas);

						// Generate QR code on the canvas
						QRCode.toCanvas(canvas, qrCode, {
							width: 200,
							margin: 2,
							color: {
								dark: '#000000',
								light: '#FFFFFF'
							}
						});
						console.log('✅ [REACTIVE] QR code generated and added to canvas');
					} else {
						console.error('❌ [REACTIVE] QR code container not found or qrCode is null');
						console.error('❌ [REACTIVE] Container:', container);
						console.error('❌ [REACTIVE] QR Code:', qrCode);
					}
				})
				.catch((err) => {
					console.error('❌ [REACTIVE] Error importing QRCode library:', err);
					// Fallback: display QR code as text for debugging
					const container = document.getElementById('qr-code');
					if (container && qrCode) {
						container.innerHTML = `<div class="text-sm text-gray-500">QR Code Data: ${qrCode.substring(0, 50)}...</div>`;
						console.log('📝 [REACTIVE] Fallback text displayed');
					}
				});
		}, 100);
	}

	onMount(() => {
		console.log('🚀 [COMPONENT] WhatsAppManager component mounted');
		console.log('🔍 [COMPONENT] WHATSAPP_API_BASE:', WHATSAPP_API_BASE);

		fetchWhatsAppStatus();
		loadTemplates();
		loadAutoNotificationSettings();

		// Poll status every 5 seconds
		statusInterval = setInterval(fetchWhatsAppStatus, 5000);
		console.log('⏰ [COMPONENT] Status polling started every 5 seconds');
	});

	onDestroy(() => {
		if (statusInterval) {
			clearInterval(statusInterval);
		}
	});

	// Test functions
	async function testSendOtp() {
		if (!testPhoneNumber || !testOtp) {
			otpResult = { success: false, message: 'Please fill in phone number and OTP' };
			return;
		}

		isSendingOtp = true;
		otpResult = null;

		try {
			// Use custom message endpoint with OTP template
			const message = `🔐 *OTP Verification*\n\nYour OTP is: *${testOtp}*\nValid for 10 minutes\n\n⚠️ Do not share this OTP with anyone.`;

			const response = await fetch(`${WHATSAPP_API_BASE}/send-message`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					phoneNumber: testPhoneNumber,
					message
				})
			});

			const data = await response.json();
			otpResult = { success: data.success, message: data.message || data.error };
		} catch (err) {
			// Log detailed error information
			const error = err as Error;
			console.error('Error sending test OTP:', {
				error: error,
				message: error.message,
				stack: error.stack,
				phoneNumber: testPhoneNumber
			});
			otpResult = { success: false, message: 'Failed to send OTP, please try again later' };
		} finally {
			isSendingOtp = false;
		}
	}

	// Template management functions
	async function loadTemplates() {
		try {
			isLoadingTemplates = true;
			const token = localStorage.getItem('authToken');
			const response = await fetch('/api/notifications/message-templates', {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			const data = await response.json();

			if (data.success) {
				// Find OTP template from the array
				const otpTemplateData = data.templates.find((t: any) => t.type === 'otp');
				if (otpTemplateData) {
					otpTemplate = otpTemplateData.template;
				} else {
					setEnhancedDefaultTemplates();
				}
			} else {
				// Fallback to enhanced defaults if server fails
				setEnhancedDefaultTemplates();
			}
		} catch (err) {
			console.error('Error loading templates:', err);
			// Fallback to enhanced defaults if server fails
			setEnhancedDefaultTemplates();
		} finally {
			isLoadingTemplates = false;
		}
	}

	function setEnhancedDefaultTemplates() {
		otpTemplate = `🔐 *Login Verification*

Your login OTP is: *{otp}*
Valid for 10 minutes

🔒 Keep this code secure
⚠️ Never share with anyone

Best regards,
WaterForces Team`;
	}

	async function updateTemplate(templateType: string) {
		try {
			let isUpdating = false;
			let template = '';

			if (templateType === 'otp') {
				isUpdatingOtp = true;
				isUpdating = true;
				template = otpTemplate;
			}

			if (!isUpdating) return;

			const token = localStorage.getItem('authToken');
			const response = await fetch('/api/notifications/message-templates', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					templates: [
						{
							type: templateType,
							template: template,
							variables: templateType === 'otp' ? ['otp'] : []
						}
					]
				})
			});

			const data = await response.json();
			if (data.success) {
				console.log(`${templateType} template updated successfully`);
			}
		} catch (err) {
			console.error(`Error updating ${templateType} template:`, err);
		} finally {
			isUpdatingOtp = false;
		}
	}

	async function resetTemplates() {
		try {
			isResettingTemplates = true;

			// Set enhanced default templates directly in the frontend
			otpTemplate = `🔐 *Login Verification*

Your login OTP is: *{otp}*
Valid for 10 minutes

🔒 Keep this code secure
⚠️ Never share with anyone

Best regards,
WaterForces Team`;

			// Also update the Svelte backend
			const token = localStorage.getItem('authToken');
			const response = await fetch('/api/notifications/message-templates', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					templates: [
						{
							type: 'otp',
							template: otpTemplate,
							variables: ['otp']
						}
					]
				})
			});

			const data = await response.json();
			if (data.success) {
				console.log('Templates reset successfully');
				// Show success message
				autoNotificationStatus = {
					success: true,
					message: 'Templates reset to enhanced defaults successfully!'
				};
				setTimeout(() => {
					autoNotificationStatus = null;
				}, 3000);
			}
		} catch (err) {
			console.error('Error resetting templates:', err);
			// Show error message
			autoNotificationStatus = { success: false, message: 'Failed to reset templates on server' };
		} finally {
			isResettingTemplates = false;
		}
	}

	// Auto-notification functions
	async function initializeAutoNotificationSettings() {
		try {
			const token = localStorage.getItem('authToken');
			const response = await fetch('/api/admin/init-auto-notifications', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			const data = await response.json();

			if (data.success) {
				autoNotificationStatus = {
					success: true,
					message: 'Settings & templates initialized successfully!'
				};
				// Reload settings and templates after initialization
				await loadAutoNotificationSettings();
				await loadTemplates();
			} else {
				autoNotificationStatus = {
					success: false,
					message: data.error || 'Failed to initialize settings'
				};
			}
		} catch (err) {
			console.error('Error initializing auto-notification settings:', err);
			autoNotificationStatus = { success: false, message: 'Failed to initialize settings' };
		}
	}

	async function loadAutoNotificationSettings() {
		try {
			const token = localStorage.getItem('authToken');
			const response = await fetch('/api/notifications/auto-settings', {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			const data = await response.json();

			if (data.success) {
				autoOtpNotifications = data.settings.otpNotifications;
			}
		} catch (err) {
			console.error('Error loading auto-notification settings:', err);
		}
	}

	async function updateAutoNotificationSettings() {
		try {
			const token = localStorage.getItem('authToken');
			const response = await fetch('/api/notifications/auto-settings', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					otpNotifications: autoOtpNotifications
				})
			});

			const data = await response.json();
			if (data.success) {
				autoNotificationStatus = { success: true, message: 'Settings updated successfully!' };
				setTimeout(() => {
					autoNotificationStatus = null;
				}, 3000);
			} else {
				autoNotificationStatus = {
					success: false,
					message: data.error || 'Failed to update settings'
				};
			}
		} catch (err) {
			console.error('Error updating auto-notification settings:', err);
			autoNotificationStatus = { success: false, message: 'Failed to update settings' };
		}
	}

	// Request pairing code function
	async function requestPairingCode() {
		if (!pairingPhoneNumber) {
			pairingResult = { success: false, message: 'Please enter a phone number' };
			return;
		}

		isRequestingPairingCode = true;
		pairingResult = null;

		try {
			const response = await fetch(`${WHATSAPP_API_BASE}/request-pairing-code`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phoneNumber: pairingPhoneNumber })
			});

			const data = await response.json();
			pairingCode = data.pairingCode || null;
			pairingResult = {
				success: data.success,
				message: data.message || data.error
			};
		} catch (err) {
			console.error('Error requesting pairing code:', err);
			pairingResult = { success: false, message: 'Failed to request pairing code' };
		} finally {
			isRequestingPairingCode = false;
		}
	}

	// Check health function
	async function checkHealth() {
		isCheckingHealth = true;
		healthStatus = null;

		try {
			const response = await fetch(`${WHATSAPP_API_BASE}/health`);
			const data = await response.json();
			healthStatus = data;
		} catch (err) {
			console.error('Error checking health:', err);
			healthStatus = {
				status: 'error',
				whatsapp: 'unknown',
				error: 'Failed to connect to WhatsApp server'
			};
		} finally {
			isCheckingHealth = false;
		}
	}

	// Refresh status function
	async function refreshStatus() {
		await fetchWhatsAppStatus();
	}
</script>

<div class="rounded-lg bg-white p-6 shadow-md">
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900">WhatsApp Manager</h2>
		<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
			<!-- Left Side: Session Controls -->
			<div class="flex gap-3">
				{#if canStart}
					<button
						on:click={startWhatsApp}
						disabled={isStarting}
						class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isStarting ? 'Starting...' : '🚀 Start Session'}
					</button>
				{/if}

				{#if canStop}
					<button
						on:click={stopWhatsApp}
						disabled={isStopping}
						class="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isStopping ? 'Stopping...' : '🛑 Disconnect Session'}
					</button>
				{/if}
			</div>

			<!-- Right Side: Server Warning -->
			<div class="flex items-center gap-3">
				{#if !canStart && !canStop && !isLoading && !error}
					<div class="flex items-center rounded-md bg-yellow-100 px-3 py-2 text-sm text-yellow-800">
						⚠️ Unable to connect to backend server. Please check if whatsapp-server is running.
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#if isLoading}
		<div class="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4">
			<div class="flex items-center justify-center">
				<div class="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"></div>
				Loading WhatsApp data...
			</div>
		</div>
	{:else if error}
		<div class="mb-4 rounded-md border border-red-400 bg-red-100 p-4 text-red-700">
			{error}
		</div>
	{/if}

	<!-- Status Section -->
	<div class="mb-6">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-lg font-semibold text-gray-700">Connection Status</h3>
			<div class="flex gap-2">
				<button
					on:click={refreshStatus}
					disabled={isLoading}
					class="rounded-md bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
				>
					{isLoading ? 'Refreshing...' : '🔄 Refresh'}
				</button>
				<button
					on:click={() => (showAdvancedControls = !showAdvancedControls)}
					class="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
				>
					{showAdvancedControls ? '🔽 Hide Advanced' : '🔼 Show Advanced'}
				</button>
			</div>
		</div>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div class="rounded-lg border p-4">
				<div class="mb-1 text-sm text-gray-500">Status</div>
				<div class="text-lg font-medium">
					<span class="rounded-full px-2 py-1 text-sm font-medium {getStatusColor(whatsappStatus)}">
						{getStatusText(whatsappStatus)}
					</span>
				</div>
			</div>

			<div class="rounded-lg border p-4">
				<div class="mb-1 text-sm text-gray-500">Connected</div>
				<div class="text-lg font-medium">
					{clientInfo.isConnected ? '✅ Yes' : '❌ No'}
				</div>
			</div>

			<div class="rounded-lg border p-4">
				<div class="mb-1 text-sm text-gray-500">Authenticated</div>
				<div class="text-lg font-medium">
					{clientInfo.isAuthenticated ? '✅ Yes' : '❌ No'}
				</div>
			</div>
		</div>

		<!-- Advanced Controls (Collapsible) -->
		{#if showAdvancedControls}
			<div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
					<!-- Request Pairing Code -->
					<div class="rounded border border-gray-200 bg-white p-4">
						<h4 class="mb-2 font-medium text-gray-800">📱 Request Pairing Code</h4>
						<p class="mb-3 text-sm text-gray-600">
							Generate a pairing code for WhatsApp authentication (alternative to QR code)
						</p>
						<div class="mb-3">
							<input
								bind:value={pairingPhoneNumber}
								type="text"
								placeholder="Phone Number (e.g., 1234567890)"
								class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
							/>
						</div>
						<button
							on:click={requestPairingCode}
							disabled={isRequestingPairingCode}
							class="w-full rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
						>
							{isRequestingPairingCode ? 'Requesting...' : '🔢 Request Pairing Code'}
						</button>

						{#if pairingCode}
							<div class="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
								<div class="text-sm font-medium text-blue-800">Pairing Code:</div>
								<div class="mt-1 font-mono text-lg font-bold text-blue-900">{pairingCode}</div>
								<div class="mt-2 text-xs text-blue-600">
									Enter this code in WhatsApp → Settings → Linked Devices → Link Device
								</div>
							</div>
						{/if}

						{#if pairingResult}
							<div
								class="mt-3 rounded-md border p-3 {pairingResult.success
									? 'border-green-200 bg-green-50'
									: 'border-red-200 bg-red-50'}"
							>
								<div class="text-sm {pairingResult.success ? 'text-green-800' : 'text-red-800'}">
									{pairingResult.message}
								</div>
							</div>
						{/if}
					</div>

					<!-- Health Check -->
					<div class="rounded border border-gray-200 bg-white p-4">
						<h4 class="mb-2 font-medium text-gray-800">🏥 Health Check</h4>
						<p class="mb-3 text-sm text-gray-600">
							Check the health status of the WhatsApp server and connection
						</p>
						<button
							on:click={checkHealth}
							disabled={isCheckingHealth}
							class="w-full rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
						>
							{isCheckingHealth ? 'Checking...' : '🔍 Check Health'}
						</button>

						{#if healthStatus}
							<div class="mt-3 space-y-2">
								<div class="rounded-md border border-gray-200 bg-gray-50 p-3">
									<div class="text-sm">
										<span class="font-medium text-gray-700">Server Status:</span>
										<span
											class="ml-2 rounded px-2 py-1 text-xs font-medium {healthStatus.status ===
											'healthy'
												? 'bg-green-100 text-green-800'
												: 'bg-red-100 text-red-800'}"
										>
											{healthStatus.status || 'unknown'}
										</span>
									</div>
									<div class="mt-2 text-sm">
										<span class="font-medium text-gray-700">WhatsApp Status:</span>
										<span
											class="ml-2 rounded px-2 py-1 text-xs font-medium {healthStatus.whatsapp ===
											'connected'
												? 'bg-green-100 text-green-800'
												: healthStatus.whatsapp === 'disconnected'
													? 'bg-red-100 text-red-800'
													: 'bg-yellow-100 text-yellow-800'}"
										>
											{healthStatus.whatsapp || 'unknown'}
										</span>
									</div>
									{#if healthStatus.timestamp}
										<div class="mt-2 text-xs text-gray-500">
											Last checked: {new Date(healthStatus.timestamp).toLocaleString()}
										</div>
									{/if}
								</div>

								{#if healthStatus.error}
									<div class="rounded-md border border-red-200 bg-red-50 p-3">
										<div class="text-sm text-red-800">
											<strong>Error:</strong>
											{healthStatus.error}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Delete Session Data -->
					<div class="rounded border border-gray-200 bg-white p-4">
						<h4 class="mb-2 font-medium text-gray-800">🗑️ Delete Session Data</h4>
						<p class="mb-3 text-sm text-gray-600">
							Permanently delete WhatsApp authentication data. Requires re-authentication.
						</p>
						<div class="mb-3 rounded-md border border-red-200 bg-red-50 p-3">
							<div class="text-sm text-red-800">
								<strong>⚠️ Warning:</strong> This action cannot be undone. You will need to scan QR code
								or use pairing code again.
							</div>
						</div>
						<button
							on:click={deleteAuth}
							disabled={isDeletingAuth}
							class="w-full rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
						>
							{isDeletingAuth ? 'Deleting...' : '🗑️ Delete Session Data'}
						</button>
					</div>

					<!-- Session Status -->
					<div class="rounded border border-gray-200 bg-white p-4">
						<h4 class="mb-2 font-medium text-gray-800">📊 Session Status</h4>
						<p class="mb-3 text-sm text-gray-600">Current authentication session status</p>
						<div class="flex items-center justify-center">
							{#if authExists}
								<div
									class="flex items-center rounded-md bg-blue-100 px-4 py-3 text-sm text-blue-800"
								>
									🔐 Session active
								</div>
							{:else}
								<div
									class="flex items-center rounded-md bg-gray-100 px-4 py-3 text-sm text-gray-600"
								>
									🔓 No session
								</div>
							{/if}
						</div>
						<div class="mt-3 text-xs text-gray-500">
							{authExists
								? 'WhatsApp is authenticated and ready'
								: 'Authentication required to send messages'}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- QR Code Section -->
	{#if qrCode && whatsappStatus === 'qr_ready'}
		<div class="mb-6">
			<h3 class="mb-3 text-lg font-semibold text-gray-700">QR Code</h3>
			<div class="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
				<div class="mb-3 text-sm text-gray-500">
					Scan this QR code with your WhatsApp mobile app to connect
				</div>
				<div class="qr-code-container" id="qr-code"></div>
				<div class="mt-3 text-xs text-gray-400">
					Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Never'}
				</div>
			</div>
		</div>
	{/if}

	<!-- Connection Instructions -->
	{#if whatsappStatus === 'disconnected' || whatsappStatus === 'stopped' || whatsappStatus === 'auth_deleted'}
		<div class="mb-6">
			<h3 class="mb-3 text-lg font-semibold text-gray-700">Connection Instructions</h3>
			<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
				<ol class="list-inside list-decimal space-y-2 text-sm text-blue-800">
					<li>Click the "🚀 Start WhatsApp" button above</li>
					<li>Wait for the QR code to appear</li>
					<li>Open WhatsApp on your mobile device</li>
					<li>Go to Settings → Linked Devices → Link a Device</li>
					<li>Scan the QR code displayed above</li>
					<li>Wait for the connection to be established</li>
				</ol>
			</div>
		</div>
	{:else if whatsappStatus === 'connected'}
		<div class="mb-6">
			<div class="rounded-lg border border-green-200 bg-green-50 p-4">
				<div class="text-sm text-green-800">
					✅ WhatsApp is connected and ready to send messages. Use "🛑 Stop WhatsApp" to disconnect.
				</div>
			</div>
		</div>
	{/if}

	<!-- OTP Settings -->
	<div class="mb-6">
		<div class="rounded border border-gray-200 bg-white p-4">
			<div class="space-y-4">
				<!-- OTP Notifications -->
				<div class="flex items-center justify-between">
					<div>
						<h4 class="font-medium text-gray-800">🔐 OTP Notifications</h4>
						<p class="text-sm text-gray-600">
							Automatically send WhatsApp notifications for OTP verification
						</p>
					</div>
					<label class="relative inline-flex cursor-pointer items-center">
						<input
							type="checkbox"
							bind:checked={autoOtpNotifications}
							on:change={() => updateAutoNotificationSettings()}
							class="peer sr-only"
						/>
						<div
							class="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700 dark:peer-focus:ring-blue-800"
						></div>
					</label>
				</div>

				<!-- OTP Notifications Explanation (when toggle is OFF) -->
				{#if !autoOtpNotifications}
					<div class="ml-6 space-y-3 rounded-md border-l-2 border-gray-200 bg-gray-50 p-4 pl-4">
						<div class="text-sm font-medium text-gray-700">
							🔓 <strong>OTP Verification is DISABLED</strong>
						</div>

						<div class="space-y-2 text-sm text-gray-600">
							<div class="font-medium">
								Normal Registration: Users can register without phone verification
							</div>
							<div class="font-medium">
								Phone Optional: Phone number field is still available but not required
							</div>

							<div class="mt-3 font-medium">⚠️ Security Implications:</div>
							<div class="font-medium">Potential Spam: Easier for automated registrations</div>
							<div class="font-medium">Fake Numbers: Users can enter any phone number</div>
						</div>
					</div>
				{/if}

				<!-- Status Display -->
				{#if autoNotificationStatus}
					<div
						class="mt-4 rounded-md border p-3 {autoNotificationStatus.success
							? 'border-green-200 bg-green-50'
							: 'border-red-200 bg-red-50'}"
					>
						<div
							class="text-sm {autoNotificationStatus.success ? 'text-green-800' : 'text-red-800'}"
						>
							{autoNotificationStatus.message}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Template Management Section -->
	<div class="mb-6">
		<h3 class="mb-3 text-lg font-semibold text-gray-700">Message Templates</h3>
		<div class="space-y-4">
			<!-- OTP Template -->
			<div class="rounded border border-gray-200 bg-white p-4">
				<h4 class="mb-2 font-medium text-gray-800">🔐 OTP</h4>
				<textarea
					bind:value={otpTemplate}
					rows="3"
					class="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
					placeholder="OTP template with otp variable"
				></textarea>
				<div class="mb-3 text-xs text-gray-500">Variables: {otpTemplateVariables.join(', ')}</div>
				<button
					on:click={() => updateTemplate('otp')}
					disabled={isUpdatingOtp}
					class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isUpdatingOtp ? 'Updating...' : 'Update'}
				</button>
			</div>
		</div>
	</div>

	<!-- Test Message Section -->
	{#if clientInfo.isConnected}
		<div class="mb-6">
			<h3 class="mb-3 text-lg font-semibold text-gray-700">Test OTP Message</h3>
			<div class="rounded-lg border border-green-200 bg-green-50 p-4">
				<div class="mb-4 text-sm text-green-800">
					✅ WhatsApp is connected and ready to send OTP messages!
				</div>

				<!-- Test OTP -->
				<div class="rounded border border-gray-200 bg-white p-4">
					<h4 class="mb-2 font-medium text-gray-800">🔐 Test OTP Message</h4>
					<div class="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
						<input
							bind:value={testPhoneNumber}
							type="text"
							placeholder="Phone Number (e.g., 9876543210)"
							class="rounded border border-gray-300 px-3 py-2 text-sm"
						/>
						<input
							bind:value={testOtp}
							type="text"
							placeholder="OTP Code (e.g., 123456)"
							class="rounded border border-gray-300 px-3 py-2 text-sm"
						/>
					</div>
					<button
						on:click={testSendOtp}
						disabled={isSendingOtp}
						class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{isSendingOtp ? 'Sending...' : 'Send Test OTP'}
					</button>
					{#if otpResult}
						<div
							class="mt-3 rounded-md border p-3 {otpResult.success
								? 'border-green-200 bg-green-50'
								: 'border-red-200 bg-red-50'}"
						>
							<div class="text-sm {otpResult.success ? 'text-green-800' : 'text-red-800'}">
								{otpResult.message}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Last Update -->
	{#if lastUpdate}
		<div class="text-center text-xs text-gray-400">
			Last updated: {new Date(lastUpdate).toLocaleString()}
		</div>
	{/if}
</div>

<style>
	.qr-code-container {
		display: inline-block;
		padding: 20px;
		background: white;
		border-radius: 8px;
	}
</style>
