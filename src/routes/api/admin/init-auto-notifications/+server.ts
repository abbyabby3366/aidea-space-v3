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

// POST - Initialize auto-notification settings and templates
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { isAdmin } = await verifyAdminToken(request);

    if (!isAdmin) {
      return json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    const db = await connectDB();
    const settingsCollection = db.collection('notification_settings');
    const templatesCollection = db.collection('message_templates');

    // Initialize default settings if they don't exist
    const existingSettings = await settingsCollection.findOne({ type: 'auto_notifications' });
    if (!existingSettings) {
      const defaultSettings = {
        type: 'auto_notifications',
        otpNotifications: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await settingsCollection.insertOne(defaultSettings);
    }

    // Initialize default templates if they don't exist
    const existingTemplates = await templatesCollection.find({}).toArray();
    if (existingTemplates.length === 0) {
      const defaultTemplates = [
        {
          type: 'otp',
          template: 'Your verification code is: {otp}. This code will expire in 10 minutes.',
          variables: ['otp'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      await templatesCollection.insertMany(defaultTemplates);
    }

    return json({
      success: true,
      message: 'Auto-notification settings and templates initialized successfully'
    });

  } catch (error) {
    console.error('Init auto-notifications error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};
