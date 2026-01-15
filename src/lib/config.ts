// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Configuration for the Template App
export const config = {
	// MongoDB Configuration
	mongodb: {
		uri: process.env.MONGODB_URI,
		database: process.env.MONGODB_DATABASE
	},

	// S3 Configuration
	s3: {
		region: process.env.S3_REGION_NAME,
		endpoint: process.env.S3_ENDPOINT_URL,
		accessKeyId: process.env.S3_ACCESS_KEY,
		secretAccessKey: process.env.S3_SECRET_KEY,
		bucketName: process.env.S3_BUCKET_NAME
	},

	// JWT Configuration
	jwt: {
		secret: process.env.JWT_SECRET || 'your-super-secret-jwt-change-this-in-production',
		expiresIn: '7d'
	},

	// Admin Configuration
	admin: {
		email: process.env.ADMIN_EMAIL || 'admin@template-app.com',
		phone: process.env.ADMIN_PHONE || '001',
		password: process.env.ADMIN_PASSWORD || 'admin123'
	},

	// WhatsApp Server Configuration
	whatsapp: {
		serverUrl: process.env.WHATSAPP_SERVER_URL || 'http://127.0.0.1:3182',
		serverPort: process.env.WHATSAPP_SERVER_PORT || 3182,
		twilio: {
			accountSid: process.env.TWILIO_ACCOUNT_SID,
			authToken: process.env.TWILIO_AUTH_TOKEN
		},
		messagebird: {
			apiKey: process.env.MESSAGEBIRD_API_KEY,
			channelId: process.env.MESSAGEBIRD_CHANNEL_ID
		},
		facebook: {
			token: process.env.FACEBOOK_TOKEN,
			phoneNumberId: process.env.FACEBOOK_PHONE_NUMBER_ID
		}
	},

	// App Configuration
	app: {
		port: process.env.APP_PORT || 3000,
		environment: process.env.NODE_ENV || 'development',
		baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
		contactUsLink: process.env.CONTACT_US_LINK || 'https://wa.me/1234567890'
	},

	// Security Configuration
	security: {
		bcryptRounds: 12,
		otpExpiryMinutes: 10,
		maxLoginAttempts: 5,
		lockoutDurationMinutes: 15
	}
};

// Helper function to check if WhatsApp service is configured
export function isWhatsAppConfigured(): boolean {
	return !!(config.whatsapp.serverUrl && config.whatsapp.serverPort);
}

// Helper function to get active WhatsApp service
export function getActiveWhatsAppService(): 'twilio' | 'messagebird' | 'facebook' | null {
	if (config.whatsapp.twilio.accountSid && config.whatsapp.twilio.authToken) {
		return 'twilio';
	}
	if (config.whatsapp.messagebird.apiKey && config.whatsapp.messagebird.channelId) {
		return 'messagebird';
	}
	if (config.whatsapp.facebook.token && config.whatsapp.facebook.phoneNumberId) {
		return 'facebook';
	}
	return null;
}
