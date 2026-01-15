import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { config } from '$lib/config';

export const GET: RequestHandler = async ({ request }) => {
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

		const staffMembers = await users.find({ role: 'staff' }).toArray();

		const transformedStaff = staffMembers.map((member) => ({
			id: member._id.toString(),
			email: member.email,
			phone: member.phone,
			createdAt: member.createdAt,
			role: member.role,
			fullname: member.fullname || ''
		}));

		return json({
			success: true,
			staff: transformedStaff
		});
	} catch (error) {
		console.error('Admin staff list error:', error);
		return json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
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

		if (!phone) {
			return json({ success: false, message: 'Phone is required' }, { status: 400 });
		}

		if (!password) {
			return json({ success: false, message: 'Password is required' }, { status: 400 });
		}

		const existingUser = await users.findOne({ 
			$or: [
				{ phone },
				...(email ? [{ email }] : [])
			]
		});
		
		if (existingUser) {
			return json(
				{ success: false, message: 'User with this phone or email already exists' },
				{ status: 409 }
			);
		}

		const hashedPassword = await bcrypt.hash(password, 12);

		const newStaff = {
			email: email || null,
			phone,
			fullname: fullname || '',
			password: hashedPassword,
			role: 'staff',
			createdAt: new Date(),
			updatedAt: new Date()
		};

		const result = await users.insertOne(newStaff);

		return json({
			success: true,
			message: 'Staff user created successfully',
			staffId: result.insertedId
		});
	} catch (error) {
		console.error('Create staff error:', error);
		return json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
};
