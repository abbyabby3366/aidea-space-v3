import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { config } from '$lib/config';

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
		if (!decoded) {
			return json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
		}

		// Check if user is admin
		const db = await connectDB();
		console.log('Connected to database:', db.databaseName);
		const users = db.collection('users');
		console.log('Using collection: users');

		const user = await users.findOne(
			{ _id: new ObjectId(decoded.userId) },
			{ projection: { isAdmin: 1, email: 1 } }
		);

		if (!user) {
			return json({ success: false, message: 'User not found' }, { status: 404 });
		}

		const isAdmin = user.email === config.admin.email || user.isAdmin === true;
		if (!isAdmin) {
			return json({ success: false, message: 'Access denied' }, { status: 403 });
		}

		// Clear all collections
		const collections = await db.listCollections().toArray();
		console.log(
			'Available collections before clearing:',
			collections.map((c) => c.name)
		);

		for (const collection of collections) {
			if (collection.name !== 'system.indexes' && collection.name !== 'system.views') {
				const countBefore = await db.collection(collection.name).countDocuments();
				await db.collection(collection.name).deleteMany({});
				const countAfter = await db.collection(collection.name).countDocuments();
				console.log(
					`Cleared collection: ${collection.name} - Before: ${countBefore}, After: ${countAfter}`
				);
			}
		}

		// Create new admin user
		const hashedPassword = await bcrypt.hash('admin123', 12);

		const newAdmin = {
			phone: '001',
			password: hashedPassword,
			phoneVerified: true,
			isAdmin: true,
			status: 'active',
			createdAt: new Date(),
			lastCheckIn: null,
			memberTier: 'lite', // Default tier (though admins might not use this)
			userConfig: {
				isProfileCompleted: false,
				lastLoginDate: new Date()
			}
		};

		console.log('Creating new admin user:', newAdmin);
		const result = await users.insertOne(newAdmin);
		console.log('Admin user created with ID:', result.insertedId);

		// Verify the user was created correctly
		const createdUser = await users.findOne({ _id: result.insertedId });
		console.log('Created user from database:', createdUser);

		// Also create a user with the admin email for backward compatibility
		const adminEmailUser = {
			email: config.admin.email,
			password: hashedPassword,
			phoneVerified: true,
			isAdmin: true,
			status: 'active',
			createdAt: new Date(),
			lastCheckIn: null,
			memberTier: 'lite', // Default tier (though admins might not use this)
			userConfig: {
				isProfileCompleted: false,
				lastLoginDate: new Date()
			}
		};

		console.log('Creating admin email user:', adminEmailUser);
		const emailResult = await users.insertOne(adminEmailUser);
		console.log('Admin email user created with ID:', emailResult.insertedId);

		return json({
			success: true,
			message: 'Database cleared successfully and new admin users created',
			adminId: result.insertedId,
			adminPhone: '001',
			adminPassword: 'admin123',
			adminEmail: config.admin.email
		});
	} catch (error) {
		console.error('Clear database error:', error);
		return json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
};
