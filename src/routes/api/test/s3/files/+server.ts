import { json } from '@sveltejs/kit';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { config } from '$lib/config';
import type { RequestHandler } from './$types';

// List files in S3 test directory
export const GET: RequestHandler = async () => {
	try {
		const s3Client = new S3Client({
			region: config.s3.region,
			endpoint: `https://${config.s3.endpoint}`,
			credentials: {
				accessKeyId: config.s3.accessKeyId || '',
				secretAccessKey: config.s3.secretAccessKey || ''
			},
			forcePathStyle: true
		});

		const command = new ListObjectsV2Command({
			Bucket: config.s3.bucketName,
			Prefix: 'test-files/'
		});

		const response = await s3Client.send(command);

		const files = (response.Contents || []).map((obj) => ({
			filename: obj.Key?.replace('test-files/', '') || '',
			size: obj.Size || 0,
			uploadedAt: obj.LastModified?.toISOString() || null,
			etag: obj.ETag
		}));

		return json({
			success: true,
			files,
			count: files.length
		});
	} catch (error) {
		console.error('S3 list files failed:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
