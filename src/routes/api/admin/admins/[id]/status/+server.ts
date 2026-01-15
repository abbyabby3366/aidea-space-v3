import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';
import { ObjectId } from 'mongodb';

export const PATCH: RequestHandler = async ({ request, params }) => {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ success: false, message: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    // Check if user is admin
    const db = await connectDB();
    const users = db.collection('users');

    const user = await users.findOne(
      { _id: decoded.userId as any },
      { projection: { isAdmin: 1, email: 1 } }
    );

    if (!user) {
      return json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.email === 'admin@confetti-circle-club.com' || user.isAdmin === true;
    if (!isAdmin) {
      return json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return json({ success: false, message: 'Valid status is required' }, { status: 400 });
    }

    // Check if admin exists
    const adminId = params.id;
    if (!ObjectId.isValid(adminId)) {
      return json({ success: false, message: 'Invalid admin ID' }, { status: 400 });
    }

    const existingAdmin = await users.findOne({ _id: new ObjectId(adminId) });
    if (!existingAdmin) {
      return json({ success: false, message: 'Administrator not found' }, { status: 404 });
    }

    // Ensure the user is an admin
    if (!existingAdmin.isAdmin) {
      return json({ success: false, message: 'User is not an administrator' }, { status: 400 });
    }

    // Prevent deactivating the last active admin
    if (status === 'inactive') {
      const activeAdminCount = await users.countDocuments({ isAdmin: true, status: 'active' });
      if (activeAdminCount <= 1) {
        return json({ success: false, message: 'Cannot deactivate the last active administrator' }, { status: 400 });
      }
    }

    // Update admin status
    const result = await users.updateOne(
      { _id: new ObjectId(adminId) },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return json({ success: false, message: 'Administrator not found' }, { status: 404 });
    }

    return json({
      success: true,
      message: 'Administrator status updated successfully'
    });

  } catch (error) {
    console.error('Update admin status error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};
