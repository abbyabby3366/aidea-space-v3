import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { config } from '$lib/config';

export const PUT: RequestHandler = async ({ request, params }) => {
	try {
		const authHeader = request.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ success: false, message: 'No token provided' }, { status: 401 });
		}

		const token = authHeader.substring(7);
		const decoded = verifyToken(token);
		if (!decoded) {
			return json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
		}

		const db = await connectDB();
		const users = db.collection('users');

		let user = await users.findOne({ _id: new ObjectId(decoded.userId) });
		if (!user) {
			user = await users.findOne({ _id: decoded.userId as any });
		}

		if (!user) {
			return json({ success: false, message: 'User not found' }, { status: 404 });
		}

		const isAdmin = user.email === config.admin.email || user.isAdmin === true || user.role === 'admin';
		if (!isAdmin) {
			return json({ success: false, message: 'Access denied' }, { status: 403 });
		}

		const body = await request.json();
		const { email, phone, fullname, password } = body;

		const staffId = params.id;
		if (!ObjectId.isValid(staffId)) {
			return json({ success: false, message: 'Invalid staff ID' }, { status: 400 });
		}

		const existingStaff = await users.findOne({ _id: new ObjectId(staffId) });
		if (!existingStaff) {
			return json({ success: false, message: 'Staff user not found' }, { status: 404 });
		}

		if (existingStaff.role !== 'staff') {
			return json({ success: false, message: 'User is not a staff member' }, { status: 400 });
		}

		// Check for conflicts
		if (phone && phone !== existingStaff.phone) {
			const phoneConflict = await users.findOne({ phone, _id: { $ne: new ObjectId(staffId) } });
			if (phoneConflict) {
				return json({ success: false, message: 'Phone number already in use' }, { status: 409 });
			}
		}

		if (email && email !== existingStaff.email) {
			const emailConflict = await users.findOne({ email, _id: { $ne: new ObjectId(staffId) } });
			if (emailConflict) {
				return json({ success: false, message: 'Email address already in use' }, { status: 409 });
			}
		}

		const updateData: any = {
			email: email || null,
			phone,
			fullname: fullname || '',
			updatedAt: new Date()
		};

		if (password) {
			updateData.password = await bcrypt.hash(password, 12);
		}

		await users.updateOne({ _id: new ObjectId(staffId) }, { $set: updateData });

		return json({
			success: true,
			message: 'Staff user updated successfully'
		});
	} catch (error) {
		console.error('Update staff error:', error);
		return json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request, params }) => {
	try {
		const authHeader = request.headers.get('authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ success: false, message: 'No token provided' }, { status: 401 });
		}

		const token = authHeader.substring(7);
		const decoded = verifyToken(token);
		if (!decoded) {
			return json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
		}

		const db = await connectDB();
		const users = db.collection('users');

		let user = await users.findOne({ _id: new ObjectId(decoded.userId) });
		if (!user) {
			user = await users.findOne({ _id: decoded.userId as any });
		}

		if (!user) {
			return json({ success: false, message: 'User not found' }, { status: 404 });
		}

		const isAdmin = user.email === config.admin.email || user.isAdmin === true || user.role === 'admin';
		if (!isAdmin) {
			return json({ success: false, message: 'Access denied' }, { status: 403 });
		}

		const staffId = params.id;
		if (!ObjectId.isValid(staffId)) {
			return json({ success: false, message: 'Invalid staff ID' }, { status: 400 });
		}

		const existingStaff = await users.findOne({ _id: new ObjectId(staffId) });
		if (!existingStaff) {
			return json({ success: false, message: 'Staff user not found' }, { status: 404 });
		}

		if (existingStaff.role !== 'staff') {
			return json({ success: false, message: 'User is not a staff member' }, { status: 400 });
		}

		await users.deleteOne({ _id: new ObjectId(staffId) });

		return json({
			success: true,
			message: 'Staff user deleted successfully'
		});
	} catch (error) {
		console.error('Delete staff error:', error);
		return json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
};
