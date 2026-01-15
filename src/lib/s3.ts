import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config.js';

// Initialize S3 client (server-side only)
let s3Client: S3Client | null = null;

// Only initialize S3 client on server-side
if (typeof window === 'undefined') {
	if (
		!config.s3.region ||
		!config.s3.endpoint ||
		!config.s3.accessKeyId ||
		!config.s3.secretAccessKey
	) {
		console.warn('S3 configuration incomplete - S3 client not initialized');
	} else {
		s3Client = new S3Client({
			region: config.s3.region,
			endpoint: `https://${config.s3.endpoint}`,
			credentials: {
				accessKeyId: config.s3.accessKeyId,
				secretAccessKey: config.s3.secretAccessKey
			},
			forcePathStyle: true // Required for some S3-compatible services like Linode
		});
	}
}

/**
 * Upload a file to S3 storage (server-side only)
 * @param file - The file to upload (Buffer, Uint8Array, or string)
 * @param key - The S3 key (path/filename) for the file
 * @param contentType - The MIME type of the file
 * @returns Promise<string> - The S3 URL of the uploaded file
 */
export async function uploadToS3(
	file: Buffer | Uint8Array | string,
	key: string,
	contentType: string
): Promise<string> {
	if (!s3Client) {
		throw new Error('S3 client not available - this function is server-side only');
	}

	try {
		const command = new PutObjectCommand({
			Bucket: config.s3.bucketName,
			Key: key,
			Body: file,
			ContentType: contentType,
			ACL: 'public-read' // Make the file publicly accessible
		});

		await s3Client.send(command);

		// Return the relative path instead of full URL
		return key;
	} catch (error) {
		console.error('Error uploading to S3:', error);
		throw new Error(
			`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Upload a file from a base64 string to S3 (server-side only)
 * @param base64Data - The base64 encoded file data
 * @param key - The S3 key (path/filename) for the file
 * @param contentType - The MIME type of the file
 * @returns Promise<string> - The S3 URL of the uploaded file
 */
export async function uploadBase64ToS3(
	base64Data: string,
	key: string,
	contentType: string
): Promise<string> {
	if (typeof window === 'undefined') {
		// Server-side: use direct S3 upload
		try {
			// Remove data URL prefix if present
			const base64String = base64Data.replace(/^data:[^;]+;base64,/, '');

			// Convert base64 to buffer
			const buffer = Buffer.from(base64String, 'base64');

			return await uploadToS3(buffer, key, contentType);
		} catch (error) {
			console.error('Error uploading base64 to S3:', error);
			throw new Error(
				`Failed to upload base64 file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	} else {
		// Client-side: use API endpoint
		try {
			const response = await fetch('/api/upload', {
				method: 'POST',
				body: JSON.stringify({
					base64Data,
					key,
					contentType
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.statusText}`);
			}

			const result = await response.json();
			return result.url;
		} catch (error) {
			console.error('Error uploading base64 to S3:', error);
			throw new Error(
				`Failed to upload base64 file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}
}

/**
 * Upload a file from a FormData or File object to S3
 * @param file - The file object from FormData
 * @param key - The S3 key (path/filename) for the file
 * @returns Promise<string> - The S3 URL of the uploaded file
 */
export async function uploadFileToS3(file: File | Blob, key: string): Promise<string> {
	try {
		// Use the API endpoint for file uploads
		const formData = new FormData();
		formData.append('file', file);
		formData.append('key', key);

		const response = await fetch('/api/upload', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error(`Upload failed: ${response.statusText}`);
		}

		const result = await response.json();
		return result.url;
	} catch (error) {
		console.error('Error uploading file to S3:', error);
		throw new Error(
			`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Delete a file from S3 storage (server-side only)
 * @param key - The S3 key (path/filename) of the file to delete
 * @returns Promise<void>
 */
export async function deleteFromS3(key: string): Promise<void> {
	if (!s3Client) {
		throw new Error('S3 client not available - this function is server-side only');
	}

	try {
		const command = new DeleteObjectCommand({
			Bucket: config.s3.bucketName,
			Key: key
		});

		await s3Client.send(command);
	} catch (error) {
		console.error('Error deleting from S3:', error);
		throw new Error(
			`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Generate a unique filename with timestamp and random string
 * @param originalName - The original filename
 * @param prefix - Optional prefix for the file path
 * @returns string - A unique filename
 */
export function generateUniqueFilename(originalName: string, prefix: string = ''): string {
	const timestamp = Date.now();
	const randomString = Math.random().toString(36).substring(2, 15);
	const extension = originalName.split('.').pop() || '';
	const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');

	const uniqueName = `${nameWithoutExtension}_${timestamp}_${randomString}.${extension}`;

	return prefix ? `${prefix}/${uniqueName}` : uniqueName;
}

/**
 * Get the S3 URL for a file without uploading
 * @param key - The S3 key (path/filename) of the file
 * @returns string - The S3 URL
 */
export function getS3Url(key: string): string {
	return `https://x.neuronwww.com/${key}`;
}
