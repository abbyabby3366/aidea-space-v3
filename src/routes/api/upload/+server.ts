import { json } from '@sveltejs/kit';
import { uploadToS3, generateUniqueFilename } from '$lib/s3.js';

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customKey = formData.get('key') as string;

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // Use custom key if provided, otherwise generate unique filename
    const uniqueFilename = customKey || generateUniqueFilename(file.name, 'uploads');

    // Convert file to buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3 using server-side function
    const s3Key = await uploadToS3(buffer, uniqueFilename, file.type);

    return json({
      success: true,
      url: s3Key, // Return relative path instead of full URL
      filename: uniqueFilename,
      originalName: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('File upload error:', error);
    return json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
