import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { config } from '$lib/config';

// WhatsApp server configuration
const WHATSAPP_SERVER_URL = config.whatsapp.serverUrl;

// Helper function to make requests to WhatsApp server
async function makeWhatsAppRequest(endpoint: string, options: RequestInit = {}) {
	try {
		const url = `${WHATSAPP_SERVER_URL}${endpoint}`;
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			}
		});

		if (!response.ok) {
			throw new Error(`WhatsApp server responded with status: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Error communicating with WhatsApp server:', error.message);
		throw error;
	}
}

// Delete WhatsApp authentication data
export const POST: RequestHandler = async () => {
	try {
		const data = await makeWhatsAppRequest('/delete-auth', {
			method: 'POST'
		});

		return json(data);
	} catch (error) {
		console.error('Error deleting WhatsApp auth data:', error);
		return json(
			{
				success: false,
				error: 'Failed to delete WhatsApp authentication data'
			},
			{ status: 500 }
		);
	}
};
