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

// Send custom message
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { phoneNumber, message } = await request.json();

		if (!phoneNumber || !message) {
			return json(
				{
					success: false,
					error: 'Phone number and message are required'
				},
				{ status: 400 }
			);
		}

		const data = await makeWhatsAppRequest('/send-message', {
			method: 'POST',
			body: JSON.stringify({ phoneNumber, message })
		});

		return json(data);
	} catch (error) {
		console.error('Error sending custom message:', error);
		return json(
			{
				success: false,
				error: 'Failed to send message'
			},
			{ status: 500 }
		);
	}
};
