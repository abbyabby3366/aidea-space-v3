<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let isLoading = false;
	let errorMessage = '';

	// Form data
	let formData = {
		identifier: '',
		password: ''
	};

	// Password visibility
	let showPassword = false;

  function parseJwt(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  function getRedirectPath(role: string) {
    if (role === 'admin') return '/admin/google-sheets';
    if (role === 'staff') return '/staff/jobs';
    return '/';
  }

  onMount(() => {
    // Check if already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
      const decoded = parseJwt(token);
      if (decoded && decoded.role) {
        goto(getRedirectPath(decoded.role));
      } else {
        goto('/admin'); // Fallback
      }
    }
  });

  async function handleLogin() {
    if (!formData.identifier || !formData.password) {
      errorMessage = 'Please enter both identifier and password';
      return;
    }

    isLoading = true;
    errorMessage = '';

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('authToken', data.token);
        const role = data.user?.role || 'user';
        goto(getRedirectPath(role));
      } else {
        errorMessage = data.message || 'Login failed';
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMessage = 'An error occurred during login';
    } finally {
      isLoading = false;
    }
  }

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleLogin();
		}
	}
</script>

<svelte:head>
	<title>Login - Template App</title>
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
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign In</h2>
			<p class="mt-2 text-center text-sm text-gray-600">Sign in to your account</p>
		</div>

		<div class="rounded-lg bg-white px-6 py-8 text-gray-900 shadow sm:px-10">
			{#if errorMessage}
				<div class="mb-4 rounded-md bg-red-50 p-4">
					<div class="text-sm text-red-700">{errorMessage}</div>
				</div>
			{/if}

			<form onsubmit={(e) => e.preventDefault()} class="space-y-6">
				<div>
					<label for="identifier" class="block text-sm font-medium text-gray-700">
						Email or Phone
					</label>
					<div class="mt-1">
						<input
							id="identifier"
							name="identifier"
							type="text"
							autocomplete="username"
							required
							bind:value={formData.identifier}
							onkeypress={handleKeyPress}
							class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:outline-none sm:text-sm"
							placeholder="Enter your email or phone"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700"> Password </label>
					<div class="relative mt-1">
						<input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							autocomplete="current-password"
							required
							bind:value={formData.password}
							onkeypress={handleKeyPress}
							class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 placeholder-gray-400 shadow-sm focus:border-purple-500 focus:ring-purple-500 focus:outline-none sm:text-sm"
							placeholder="Enter your password"
						/>
						<button
							type="button"
							class="absolute inset-y-0 right-0 flex items-center pr-3"
							onclick={() => (showPassword = !showPassword)}
						>
							{#if showPassword}
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
									/>
								</svg>
							{:else}
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<div>
					<button
						type="submit"
						onclick={handleLogin}
						disabled={isLoading}
						class="group relative flex w-full justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
					>
						{#if isLoading}
							<div class="flex items-center">
								<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
								Signing in...
							</div>
						{:else}
							Sign in
						{/if}
					</button>
				</div>

				<div class="text-center">
					<a href="/forget-password" class="text-sm text-purple-600 hover:text-purple-500">
						Forgot your password?
					</a>
				</div>
			</form>
		</div>
	</div>
</div>
