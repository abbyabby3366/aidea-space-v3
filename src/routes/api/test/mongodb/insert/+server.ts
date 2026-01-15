import { json } from '@sveltejs/kit';
import { connectDB } from '$lib/mongodb';
import type { RequestHandler } from './$types';

// Insert test document
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const db = await connectDB();
		const collection = db.collection('test_documents');

		const document = {
			...data,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		const result = await collection.insertOne(document);

		return json({
			success: true,
			insertedId: result.insertedId,
			message: 'Document inserted successfully'
		});
	} catch (error) {
		console.error('MongoDB insert test failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
