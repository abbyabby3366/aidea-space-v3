import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';

const SETTINGS_COLLECTION = 'app_settings';
const GOOGLE_SHEETS_KEY = 'google_sheets_config';

export const GET: RequestHandler = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded) {
      return json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const db = await connectDB();
    const settings = db.collection(SETTINGS_COLLECTION);
    const config = await settings.findOne({ key: GOOGLE_SHEETS_KEY });

    return json({
      success: true,
      scriptUrl: config?.scriptUrl || '',
      spreadsheetId: config?.spreadsheetId || ''
    });
  } catch (error: any) {
    return json({ success: false, message: error.message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded || decoded.role !== 'admin') {
      return json({ success: false, message: 'Only admins can update settings' }, { status: 403 });
    }

    const { scriptUrl, spreadsheetId } = await request.json();
    const db = await connectDB();
    const settings = db.collection(SETTINGS_COLLECTION);

    await settings.updateOne(
      { key: GOOGLE_SHEETS_KEY },
      { 
        $set: { 
          scriptUrl, 
          spreadsheetId, 
          updatedAt: new Date(),
          updatedBy: decoded.userId
        } 
      },
      { upsert: true }
    );

    return json({ success: true, message: 'Global settings updated' });
  } catch (error: any) {
    return json({ success: false, message: error.message }, { status: 500 });
  }
};
