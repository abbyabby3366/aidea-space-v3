import { json } from '@sveltejs/kit';
import { uploadToS3 } from '$lib/s3';
import type { RequestHandler } from './$types';

// Upload file to S3
export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const filename = formData.get('filename') as string;

		if (!file || !filename) {
			return json(
				{
					success: false,
					error: 'File and filename are required'
				},
				{ status: 400 }
			);
		}

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Determine content type
		const contentType = file.type || 'application/octet-stream';

		// Upload file to S3
		const key = `test-files/${filename}`;
		await uploadToS3(buffer, key, contentType);

		return json({
			success: true,
			filename: key,
			originalName: file.name,
			size: file.size,
			contentType,
			message: 'File uploaded successfully'
		});
	} catch (error) {
		console.error('S3 file upload failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
