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

// GET - Retrieve message templates
export const GET: RequestHandler = async ({ request }) => {
  try {
    const { isAdmin } = await verifyAdminToken(request);

    if (!isAdmin) {
      return json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    const db = await connectDB();
    const templatesCollection = db.collection('message_templates');

    // Get all templates
    const templates = await templatesCollection.find({}).toArray();

    // If no templates exist, create default ones
    if (templates.length === 0) {
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
      const newTemplates = await templatesCollection.find({}).toArray();

      return json({
        success: true,
        templates: newTemplates
      });
    }

    return json({
      success: true,
      templates: templates
    });

  } catch (error) {
    console.error('Message templates GET error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};

// POST - Update message templates
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { isAdmin } = await verifyAdminToken(request);

    if (!isAdmin) {
      return json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { templates } = body;

    if (!templates || !Array.isArray(templates)) {
      return json({ success: false, message: 'Invalid templates data' }, { status: 400 });
    }

    const db = await connectDB();
    const templatesCollection = db.collection('message_templates');

    // Clear existing templates
    await templatesCollection.deleteMany({});

    // Insert new templates
    const templatesWithTimestamps = templates.map(template => ({
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await templatesCollection.insertMany(templatesWithTimestamps);

    return json({
      success: true,
      message: 'Message templates updated successfully'
    });

  } catch (error) {
    console.error('Message templates POST error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};
