// Utility functions for the application
import { writable } from 'svelte/store';

/**
 * Converts a relative S3 path to a full URL with the domain
 * @param relativePath - The relative path from S3 (e.g., "announcements/cover_123.jpg")
 * @returns The full URL (e.g., "https://x.neuronwww.com/announcements/cover_123.jpg")
 */
export function getImageUrl(relativePath: string): string {
	if (!relativePath) return '';

	// If it's already a full URL, return as is
	if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
		return relativePath;
	}

	// Convert relative path to full URL
	return `https://x.neuronwww.com/${relativePath}`;
}


/**
 * Toast notification system
 */
export interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info' | 'warning';
	duration?: number;
	persistent?: boolean; // If true, toast won't auto-dismiss
}

let toastId = 0;
export const toasts = writable<Toast[]>([]);

/**
 * Show a toast notification
 * @param message - The message to display
 * @param type - The type of toast (success, error, info, warning)
 * @param duration - How long to show the toast in milliseconds (default: 3000)
 * @param persistent - If true, toast won't auto-dismiss (default: false)
 */
export function showToast(
	message: string,
	type: Toast['type'] = 'info',
	duration: number = 3000,
	persistent: boolean = false
): void {
	const id = (++toastId).toString();
	const toast: Toast = { id, message, type, duration, persistent };

	toasts.update((currentToasts) => {
		const updated = currentToasts.length >= 1 ? currentToasts.slice(1) : currentToasts;
		return [...updated, toast];
	});

	// Auto-remove toast after duration only if not persistent
	if (!persistent) {
		setTimeout(() => {
			removeToast(id);
		}, duration);
	}
}

/**
 * Remove a toast notification
 * @param id - The toast ID to remove
 */
export function removeToast(id: string): void {
	toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
}

/**
 * Clear all toast notifications
 */
export function clearToasts(): void {
	toasts.set([]);
}
