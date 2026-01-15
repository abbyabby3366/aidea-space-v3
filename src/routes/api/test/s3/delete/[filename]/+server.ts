import { json } from '@sveltejs/kit';
import { deleteFromS3 } from '$lib/s3';
import type { RequestHandler } from './$types';

// Delete file from S3
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const filename = params.filename;
		if (!filename) {
			return json(
				{
					success: false,
					error: 'Filename is required'
				},
				{ status: 400 }
			);
		}

		const key = `test-files/${filename}`;
		await deleteFromS3(key);

		return json({
			success: true,
			filename: key,
			message: 'File deleted successfully'
		});
	} catch (error) {
		console.error('S3 file delete failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
