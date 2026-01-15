import { MongoClient, Db } from 'mongodb';
import { config } from './config';

let client: MongoClient | null = null;

export async function connectDB(): Promise<Db> {
	if (!client) {
		try {
			console.log('Connecting to MongoDB...');
			if (!config.mongodb.uri) {
				throw new Error('MONGODB_URI environment variable is not set');
			}
			client = new MongoClient(config.mongodb.uri);
			await client.connect();
			console.log('✅ MongoDB connected successfully!');

			// Test the connection
			const db = client.db(config.mongodb.database);
			await db.admin().ping();
			console.log('✅ Database ping successful!');

			return db;
		} catch (error) {
			console.error('❌ MongoDB connection failed:', error);
			throw error;
		}
	}

	return client.db(config.mongodb.database);
}

export async function closeDB(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		console.log('MongoDB connection closed');
	}
}

export function getClient(): MongoClient | null {
	return client;
}

// Test connection function
export async function testConnection(): Promise<boolean> {
	try {
		const db = await connectDB();
		await db.admin().ping();
		console.log('✅ MongoDB connection test successful!');
		return true;
	} catch (error) {
		console.error('❌ MongoDB connection test failed:', error);
		return false;
	}
}
