import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectDB } from '$lib/mongodb';

// GET - Check if OTP is required for registration (public access)
export const GET: RequestHandler = async () => {
  try {
    const db = await connectDB();
    const settingsCollection = db.collection('notification_settings');

    // Get settings document
    let settings = await settingsCollection.findOne({ type: 'auto_notifications' });

    if (!settings) {
      // Return default settings if they don't exist
      return json({
        success: true,
        otpRequired: false // Default to false if no settings exist
      });
    }

    return json({
      success: true,
      otpRequired: settings.otpNotifications ?? false
    });

  } catch (error) {
    console.error('OTP requirement check error:', error);
    return json({
      success: false,
      message: 'Internal server error',
      otpRequired: false // Default to false on error
    }, { status: 500 });
  }
};
