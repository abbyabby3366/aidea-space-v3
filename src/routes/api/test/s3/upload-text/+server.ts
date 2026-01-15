import { json } from '@sveltejs/kit';
import { uploadToS3 } from '$lib/s3';
import type { RequestHandler } from './$types';

// Upload text content to S3
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { content, filename } = await request.json();

		if (!content || !filename) {
			return json(
				{
					success: false,
					error: 'Content and filename are required'
				},
				{ status: 400 }
			);
		}

		// Upload text content as a file
		const buffer = Buffer.from(content, 'utf8');
		const key = `test-files/${filename}`;

		await uploadToS3(buffer, key, 'text/plain');

		return json({
			success: true,
			filename: key,
			message: 'Text file uploaded successfully'
		});
	} catch (error) {
		console.error('S3 text upload failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
