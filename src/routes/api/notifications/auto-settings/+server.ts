import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

// Helper function to verify admin token
async function verifyAdminToken(request: Request): Promise<{ isAdmin: boolean, adminInfo?: any }> {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAdmin: false };
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return { isAdmin: false };
    }

    const db = await connectDB();
    const users = db.collection('users');

    const user = await users.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { isAdmin: 1, email: 1 } }
    );

    if (!user) {
      return { isAdmin: false };
    }

    const isAdmin = user.email === 'admin@confetti-circle-club.com' || user.isAdmin === true;

    return { isAdmin, adminInfo: user };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { isAdmin: false };
  }
}

// GET - Retrieve auto-notification settings (public access for OTP requirement check)
export const GET: RequestHandler = async ({ request }) => {
  try {
    const db = await connectDB();
    const settingsCollection = db.collection('notification_settings');

    // Get or create settings document
    let settings: any = await settingsCollection.findOne({ type: 'auto_notifications' });

    if (!settings) {
      // Create default settings if they don't exist
      const defaultSettings = {
        type: 'auto_notifications',
        otpNotifications: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await settingsCollection.insertOne(defaultSettings);
      settings = defaultSettings;
    }

    return json({
      success: true,
      settings: {
        otpNotifications: settings.otpNotifications ?? false
      }
    });

  } catch (error) {
    console.error('Auto-settings GET error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};

// POST - Update auto-notification settings (admin only)
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { isAdmin } = await verifyAdminToken(request);

    if (!isAdmin) {
      return json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { otpNotifications } = body;

    const db = await connectDB();
    const settingsCollection = db.collection('notification_settings');

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Only update OTP notifications if provided
    if (typeof otpNotifications === 'boolean') {
      updateData.otpNotifications = otpNotifications;
    }

    // Update or create settings
    const result = await settingsCollection.updateOne(
      { type: 'auto_notifications' },
      {
        $set: updateData,
        $setOnInsert: {
          type: 'auto_notifications',
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return json({
      success: true,
      message: 'Auto-notification settings updated successfully'
    });

  } catch (error) {
    console.error('Auto-settings POST error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};
