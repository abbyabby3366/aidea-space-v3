import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/mongodb';
import type { RequestHandler } from './$types';

// Find test documents
export const GET: RequestHandler = async () => {
	try {
		const db = await connectDB();
		const collection = db.collection('test_documents');

		const documents = await collection.find({}).sort({ createdAt: -1 }).toArray();

		return json({
			success: true,
			documents,
			count: documents.length
		});
	} catch (error) {
		console.error('MongoDB find test failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
