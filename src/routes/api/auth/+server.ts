import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '$lib/config';
import { connectDB } from '$lib/mongodb';

const JWT_SECRET = config.jwt.secret;

// Verify JWT token
function verifyToken(token: string): any {
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch (error) {
		return null;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { identifier, password } = await request.json();

		if (!identifier || !password) {
			return json(
				{ success: false, message: 'Identifier and password are required' },
				{ status: 400 }
			);
		}

		const db = await connectDB();
		const users = db.collection('users');

		// Find user by email or phone
		const user = await users.findOne({
			$or: [{ email: identifier }, { phone: identifier }]
		});

		if (!user) {
			return json({ success: false, message: 'Invalid credentials' }, { status: 401 });
		}

		// Check password
		const passwordMatch = await bcrypt.compare(password, user.password);
		if (!passwordMatch) {
			return json({ success: false, message: 'Invalid credentials' }, { status: 401 });
		}


		// Generate JWT token
		const token = jwt.sign(
			{
				userId: user._id,
				email: user.email,
				phone: user.phone,
				role: user.role || (user.isAdmin ? 'admin' : 'user')
			},
			JWT_SECRET,
			{ expiresIn: '24h' }
		);

		return json({
			success: true,
			message: 'Login successful',
			token,
			user: {
				id: user._id,
				email: user.email,
				phone: user.phone,
				role: user.role || (user.isAdmin ? 'admin' : 'user'),
				isAdmin: user.isAdmin
			}
		});
	} catch (error) {
		console.error('Auth error:', error);
		return json({ success: false, message: 'Internal server error' }, { status: 500 });
	}
};

