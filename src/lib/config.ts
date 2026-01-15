// Load environment variables (server-side only)
if (typeof process !== 'undefined' && process.env) {
	try {
		// Only import and config dotenv on the server
		const dotenv = await import('dotenv');
		dotenv.config();
	} catch (e) {
		// Ignore if dotenv is not available or fails
	}
}

// Helper to safely get env variables
const getEnv = (key: string, defaultValue: any = undefined) => {
	if (typeof process !== 'undefined' && process.env) {
		return process.env[key] || defaultValue;
	}
	return defaultValue;
};

// Configuration for the Template App
export const config = {
	// MongoDB Configuration
	mongodb: {
		uri: getEnv('MONGODB_URI'),
		database: getEnv('MONGODB_DATABASE')
	},

	// S3 Configuration
	s3: {
		region: getEnv('S3_REGION_NAME'),
		endpoint: getEnv('S3_ENDPOINT_URL'),
		accessKeyId: getEnv('S3_ACCESS_KEY'),
		secretAccessKey: getEnv('S3_SECRET_KEY'),
		bucketName: getEnv('S3_BUCKET_NAME')
	},

	// JWT Configuration
	jwt: {
		secret: getEnv('JWT_SECRET', 'your-super-secret-jwt-change-this-in-production'),
		expiresIn: '7d'
	},

	// Admin Configuration
	admin: {
		email: getEnv('ADMIN_EMAIL', 'admin@template-app.com'),
		phone: getEnv('ADMIN_PHONE', '001'),
		password: getEnv('ADMIN_PASSWORD', 'admin123')
	},

	// WhatsApp Server Configuration
	whatsapp: {
		serverUrl: getEnv('WHATSAPP_SERVER_URL', 'http://127.0.0.1:3182'),
		serverPort: getEnv('WHATSAPP_SERVER_PORT', 3182),
		twilio: {
			accountSid: getEnv('TWILIO_ACCOUNT_SID'),
			authToken: getEnv('TWILIO_AUTH_TOKEN')
		},
		messagebird: {
			apiKey: getEnv('MESSAGEBIRD_API_KEY'),
			channelId: getEnv('MESSAGEBIRD_CHANNEL_ID')
		},
		facebook: {
			token: getEnv('FACEBOOK_TOKEN'),
			phoneNumberId: getEnv('FACEBOOK_PHONE_NUMBER_ID')
		}
	},

	// App Configuration
	app: {
		port: getEnv('APP_PORT', 3000),
		environment: getEnv('NODE_ENV', 'development'),
		baseUrl: getEnv('APP_BASE_URL', 'http://localhost:3000'),
		contactUsLink: getEnv('CONTACT_US_LINK', 'https://wa.me/1234567890')
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
