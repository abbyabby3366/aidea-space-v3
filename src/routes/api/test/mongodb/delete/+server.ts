import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/mongodb';
import type { RequestHandler } from './$types';

// Delete test documents
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { filter } = await request.json();
		const db = await connectDB();
		const collection = db.collection('test_documents');

		const result = await collection.deleteMany(filter);

		return json({
			success: true,
			deletedCount: result.deletedCount,
			message: 'Documents deleted successfully'
		});
	} catch (error) {
		console.error('MongoDB delete test failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
