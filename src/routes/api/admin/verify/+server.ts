import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import { config } from '$lib/config';

export const GET: RequestHandler = async ({ request }) => {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ success: false, message: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);
    console.log('Verify - Token decoded:', decoded);
    if (!decoded) {
      return json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    // Check if user is admin
    const db = await connectDB();
    const users = db.collection('users');

    // Try to find user by ObjectId first
    let user = await users.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { isAdmin: 1, email: 1, phone: 1, fullname: 1, role: 1 } }
    );

    // If not found, try with string ID (legacy support or if ID format varies)
    if (!user) {
      user = await users.findOne(
        { _id: decoded.userId as any },
        { projection: { isAdmin: 1, email: 1, phone: 1, fullname: 1, role: 1 } }
      );
    }

    // If not found by ID, try to find by phone number as fallback
    if (!user && decoded.phone) {
      user = await users.findOne(
        { phone: decoded.phone },
        { projection: { isAdmin: 1, email: 1, phone: 1, _id: 1, fullname: 1, role: 1 } }
      );
    }

    console.log('User found in verify:', user ? user._id : 'null');

    if (!user) {
      return json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Check if user is admin based on configuration or role
    const isAdmin = user.email === config.admin.email || user.isAdmin === true || user.phone === config.admin.phone || user.role === 'admin';

    return json({
      success: true,
      isAdmin,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.fullname || user.email || 'Admin',
        role: user.role || (isAdmin ? 'admin' : 'user')
      }
    });

  } catch (error) {
    console.error('Admin verification error:', error);
    return json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
};
