import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export const PUT: RequestHandler = async ({ request, params }) => {
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
			{ _id: new ObjectId(decoded.userId) },
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
		const { email, phone, fullname, password } = body;

		if (!phone) {
			return json({ success: false, message: 'Phone is required' }, { status: 400 });
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

		// Check if phone is being changed and if it conflicts with another user
		if (phone !== existingAdmin.phone) {
			const phoneConflict = await users.findOne({ phone, _id: { $ne: new ObjectId(adminId) } });
			if (phoneConflict) {
				return json(
					{ success: false, message: 'Phone number already in use by another user' },
					{ status: 409 }
				);
			}
		}

		// Update admin
		const updateData: any = {
			email: email || null,
			phone,
			fullname: fullname || ''
		};

		// Only update password if provided
		if (password) {
			const hashedPassword = await bcrypt.hash(password, 12);
			updateData.password = hashedPassword;
		}

		const result = await users.updateOne({ _id: new ObjectId(adminId) }, { $set: updateData });

		if (result.matchedCount === 0) {
			return json({ success: false, message: 'Administrator not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Administrator updated successfully'
		});
	} catch (error) {
		console.error('Update admin error:', error);
		return json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, params }) => {
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
			{ _id: new ObjectId(decoded.userId) },
			{ projection: { isAdmin: 1, email: 1 } }
		);

		if (!user) {
			return json({ success: false, message: 'User not found' }, { status: 404 });
		}

		const isAdmin = user.email === 'admin@confetti-circle-club.com' || user.isAdmin === true;
		if (!isAdmin) {
			return json({ success: false, message: 'Access denied' }, { status: 403 });
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

		// Prevent deletion of the last admin
		const adminCount = await users.countDocuments({ isAdmin: true });
		if (adminCount <= 1) {
			return json(
				{ success: false, message: 'Cannot delete the last administrator' },
				{ status: 400 }
			);
		}

		// Delete admin
		const result = await users.deleteOne({ _id: new ObjectId(adminId) });

		if (result.deletedCount === 0) {
			return json({ success: false, message: 'Administrator not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Administrator deleted successfully'
		});
	} catch (error) {
		console.error('Delete admin error:', error);
		return json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
};
