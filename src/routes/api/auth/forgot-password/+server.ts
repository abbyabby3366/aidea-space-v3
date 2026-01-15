import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectDB } from '$lib/mongodb';

// WhatsApp server configuration
const WHATSAPP_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3182';

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

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { phoneNumber } = await request.json();

		if (!phoneNumber) {
			return json(
				{
					success: false,
					message: 'Phone number is required'
				},
				{ status: 400 }
			);
		}

		// Check if user exists with this phone number
		const db = await connectDB();
		const usersCollection = db.collection('users');

		const user = await usersCollection.findOne({ phone: phoneNumber });

		if (!user) {
			// For security reasons, don't reveal if phone number exists or not
			return json({
				success: true,
				message: 'If an account with that phone number exists, a password reset OTP has been sent.'
			});
		}

		// Generate a random 6-digit OTP
		const otp = Math.floor(100000 + Math.random() * 900000).toString();

		// Store OTP in database with expiration (10 minutes)
		const otpCollection = db.collection('otp_verifications');

		// Remove any existing OTP for this phone number
		await otpCollection.deleteMany({ phoneNumber });

		// Store new OTP
		await otpCollection.insertOne({
			phoneNumber,
			otp,
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
			type: 'password_reset',
			userId: user._id
		});

		// Send OTP via WhatsApp
		const message = `🔐 *Password Reset Verification*\n\nYour password reset OTP is: *${otp}*\nValid for 10 minutes\n\n⚠️ Do not share this OTP with anyone.\n\nBest regards,\nConfetti Circle Club Team`;

		try {
			await makeWhatsAppRequest('/send-message', {
				method: 'POST',
				body: JSON.stringify({ phoneNumber, message })
			});

			return json({
				success: true,
				message: 'Password reset OTP sent successfully to your WhatsApp'
			});
		} catch (whatsappError) {
			console.error('Failed to send WhatsApp message:', whatsappError);
			return json(
				{
					success: false,
					message: 'Failed to send OTP via WhatsApp. Please try again later.'
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error('Error in forgot password:', error);
		return json(
			{
				success: false,
				message: 'Failed to process password reset request. Please try again later.'
			},
			{ status: 500 }
		);
	}
};
