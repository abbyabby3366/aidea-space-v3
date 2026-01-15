import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/mongodb';
import type { RequestHandler } from './$types';

// Update test documents
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const { filter, update } = await request.json();
		const db = await connectDB();
		const collection = db.collection('test_documents');

		// Add updatedAt timestamp
		const updateWithTimestamp = {
			...update,
			$set: {
				...update.$set,
				updatedAt: new Date()
			}
		};

		const result = await collection.updateMany(filter, updateWithTimestamp);

		return json({
			success: true,
			modifiedCount: result.modifiedCount,
			matchedCount: result.matchedCount,
			message: 'Documents updated successfully'
		});
	} catch (error) {
		console.error('MongoDB update test failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
