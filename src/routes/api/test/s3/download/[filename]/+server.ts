import { json } from '@sveltejs/kit';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from '$lib/config';
import type { RequestHandler } from './$types';

// Download file from S3
export const GET: RequestHandler = async ({ params }) => {
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

		const s3Client = new S3Client({
			region: config.s3.region,
			endpoint: `https://${config.s3.endpoint}`,
			credentials: {
				accessKeyId: config.s3.accessKeyId || '',
				secretAccessKey: config.s3.secretAccessKey || ''
			},
			forcePathStyle: true
		});

		const command = new GetObjectCommand({
			Bucket: config.s3.bucketName,
			Key: `test-files/${filename}`
		});

		const response = await s3Client.send(command);

		if (!response.Body) {
			return json(
				{
					success: false,
					error: 'File not found'
				},
				{ status: 404 }
			);
		}

		// Convert stream to buffer
		const chunks: Uint8Array[] = [];
		const reader = response.Body.transformToWebStream().getReader();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}

		const buffer = Buffer.concat(chunks);

		return new Response(buffer, {
			headers: {
				'Content-Type': response.ContentType || 'application/octet-stream',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Content-Length': buffer.length.toString()
			}
		});
	} catch (error) {
		console.error('S3 file download failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
