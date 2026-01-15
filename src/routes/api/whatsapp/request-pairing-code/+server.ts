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

// Request pairing code for WhatsApp authentication
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { phoneNumber } = await request.json();

		if (!phoneNumber) {
			return json(
				{
					success: false,
					error: 'Phone number is required'
				},
				{ status: 400 }
			);
		}

		const data = await makeWhatsAppRequest('/request-pairing-code', {
			method: 'POST',
			body: JSON.stringify({ phoneNumber })
		});

		return json(data);
	} catch (error) {
		console.error('Error requesting pairing code:', error);
		return json(
			{
				success: false,
				error: 'Failed to request pairing code'
			},
			{ status: 500 }
		);
	}
};
