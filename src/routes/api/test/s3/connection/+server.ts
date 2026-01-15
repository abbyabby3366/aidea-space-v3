import { json } from '@sveltejs/kit';
import { config } from '$lib/config';
import type { RequestHandler } from './$types';

// Test S3 connection
export const GET: RequestHandler = async () => {
	try {
		// Check if S3 configuration is complete
		if (
			!config.s3.region ||
			!config.s3.endpoint ||
			!config.s3.accessKeyId ||
			!config.s3.secretAccessKey ||
			!config.s3.bucketName
		) {
			return json(
				{
					success: false,
					error: 'S3 configuration incomplete. Please check environment variables.'
				},
				{ status: 500 }
			);
		}

		return json({
			success: true,
			message: 'S3 configuration is valid',
			config: {
				region: config.s3.region,
				endpoint: config.s3.endpoint,
				bucketName: config.s3.bucketName
			}
		});
	} catch (error) {
		console.error('S3 connection test failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
