import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { config } from '$lib/config';

export const GET: RequestHandler = async ({ request }) => {
	try {
		// Get authorization header
		const authHeader = request.headers.get('authorization');

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ success: false, message: 'No token provided' }, { status: 401 });
		}

		const token = authHeader.substring(7);

		// Verify token
		const decoded = verifyToken(token);
		console.log('Token decoded:', decoded);
		if (!decoded) {
			return json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
		}

		// Check if user is admin
		const db = await connectDB();
		console.log('Connected to database:', db.databaseName);
		const users = db.collection('users');
		console.log('Using collection: users');

		// Try to find user by ObjectId first, then by string ID
		let user = await users.findOne(
			{ _id: new ObjectId(decoded.userId) },
			{ projection: { isAdmin: 1, email: 1 } }
		);

		// If not found, try with string ID
		if (!user) {
			user = await users.findOne({ _id: decoded.userId as any }, { projection: { isAdmin: 1, email: 1 } });
		}

		console.log('Looking for user with ID:', decoded.userId);
		console.log('User found:', user);

		if (!user) {
			return json({ success: false, message: 'User not found' }, { status: 404 });
		}

		const isAdmin = user.email === config.admin.email || user.isAdmin === true;
		if (!isAdmin) {
			return json({ success: false, message: 'Access denied' }, { status: 403 });
		}

		// Get all admins only
		console.log('Looking for users with isAdmin: true');

		// Debug: Let's see all users first
		const allUsers = await users
			.find({}, { projection: { email: 1, phone: 1, isAdmin: 1, _id: 1 } })
			.toArray();
		console.log('All users in database:', allUsers);
		console.log(
			'All users with _id type:',
			allUsers.map((u) => ({ id: u._id, idType: typeof u._id, isAdmin: u.isAdmin }))
		);

		// Try multiple ways to find admins
		const adminsQuery1 = await users.find({ isAdmin: true }).toArray();
		console.log('Query 1 - isAdmin: true:', adminsQuery1);

		const adminsQuery2 = await users.find({ isAdmin: { $exists: true, $ne: false } }).toArray();
		console.log('Query 2 - isAdmin exists and not false:', adminsQuery2);

		const adminsQuery3 = await users
			.find({ $or: [{ isAdmin: true }, { email: config.admin.email }] })
			.toArray();
		console.log('Query 3 - isAdmin: true OR admin email:', adminsQuery3);

		// Also check for users with phone '001' (the admin we created)
		const adminsQuery4 = await users.find({ phone: '001' }).toArray();
		console.log('Query 4 - phone: 001:', adminsQuery4);

		// Use the most comprehensive query
		let admins = adminsQuery3;

		// If no admins found with the main query, try the phone query
		if (admins.length === 0 && adminsQuery4.length > 0) {
			console.log('No admins found with main query, but found user with phone 001, using that');
			admins = adminsQuery4;
		}

		console.log('Final admins found:', admins);

		// Apply projection to remove sensitive fields
		const adminsWithProjection = admins.map((admin) => ({
			_id: admin._id,
			email: admin.email,
			phone: admin.phone,
			createdAt: admin.createdAt,
			role: admin.role,
			isAdmin: admin.isAdmin,
			fullname: admin.fullname
		}));

		// Transform admins data
		const transformedAdmins = adminsWithProjection.map((admin) => ({
			id: admin._id.toString(), // Ensure ObjectId is converted to string
			email: admin.email,
			phone: admin.phone,
			createdAt: admin.createdAt,
			role: admin.role || (admin.isAdmin ? 'admin' : 'user'),
			isAdmin: admin.isAdmin || false,
			fullname: admin.fullname || ''
		}));

		console.log('Transformed admins:', transformedAdmins);

		return json({
			success: true,
			admins: transformedAdmins
		});
	} catch (error) {
		console.error('Admin admins error:', error);
		return json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Get authorization header
		const authHeader = request.headers.get('authorization');

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ success: false, message: 'No token provided' }, { status: 401 });
		}

		const token = authHeader.substring(7);

		// Verify token
		const decoded = verifyToken(token);
		console.log('POST - Token decoded:', decoded);
		if (!decoded) {
			return json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
		}

		// Check if user is admin
		const db = await connectDB();
		const users = db.collection('users');

		// Try to find user by ObjectId first, then by string ID
		let user = await users.findOne(
			{ _id: new ObjectId(decoded.userId) },
			{ projection: { isAdmin: 1, email: 1 } }
		);

		// If not found, try with string ID
		if (!user) {
			user = await users.findOne({ _id: decoded.userId as any }, { projection: { isAdmin: 1, email: 1 } });
		}

		if (!user) {
			return json({ success: false, message: 'User not found' }, { status: 404 });
		}

		const isAdmin = user.email === config.admin.email || user.isAdmin === true;
		if (!isAdmin) {
			return json({ success: false, message: 'Access denied' }, { status: 403 });
		}

		// Get request body
		const body = await request.json();
		const { email, phone, fullname, password } = body;

		if (!phone) {
			return json({ success: false, message: 'Phone is required' }, { status: 400 });
		}

		if (!password) {
			return json({ success: false, message: 'Password is required' }, { status: 400 });
		}

		// Check if user already exists
		const existingUser = await users.findOne({ phone });
		if (existingUser) {
			return json(
				{ success: false, message: 'User with this phone number already exists' },
				{ status: 409 }
			);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12);

		// Create new admin user
		const newAdmin = {
			email: email || null,
			phone,
			fullname: fullname || '',
			password: hashedPassword,
			isAdmin: true,
			role: 'admin',
			createdAt: new Date(),
		};

		const result = await users.insertOne(newAdmin);

		return json({
			success: true,
			message: 'Administrator created successfully',
			adminId: result.insertedId
		});
	} catch (error) {
		console.error('Create admin error:', error);
		return json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
};
