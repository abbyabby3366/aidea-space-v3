import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/mongodb';
import type { RequestHandler } from './$types';

// Test MongoDB connection
export const GET: RequestHandler = async () => {
	try {
		const db = await connectDB();
		await db.admin().ping();

		return json({
			success: true,
			message: 'MongoDB connection successful'
		});
	} catch (error) {
		console.error('MongoDB connection test failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
