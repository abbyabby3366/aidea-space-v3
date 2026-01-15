import jwt from 'jsonwebtoken';
import { config } from './config';

const JWT_SECRET = config.jwt.secret;

export interface JWTPayload {
	userId: string;
	email?: string;
	phone?: string;
	role: 'admin' | 'user' | 'staff';
	iat: number;
	exp: number;
}

export interface User {
	id: string;
	email?: string;
	phone?: string;
	role: 'admin' | 'user' | 'staff';
	createdAt: Date;
	// Keeping isAdmin for backward compatibility logic temporarily if needed, 
	// but user requested adding 'role'. 
	// The user request list "users.status", "users.phoneVerified" etc to BE REMOVED.
	// So I am removing those.
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
	try {
		return jwt.verify(token, JWT_SECRET) as JWTPayload;
	} catch (error) {
		return null;
	}
}

// Generate JWT token
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Check if token is expired
export function isTokenExpired(token: string): boolean {
	const decoded = verifyToken(token);
	if (!decoded) return true;

	const currentTime = Math.floor(Date.now() / 1000);
	return decoded.exp < currentTime;
}

// Extract token from authorization header
export function extractToken(authHeader: string | null): string | null {
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}
	return authHeader.substring(7); // Remove 'Bearer ' prefix
}

// Validate user session
export function validateSession(token: string): { valid: boolean; user?: JWTPayload } {
	if (!token) {
		return { valid: false };
	}

	const decoded = verifyToken(token);
	if (!decoded) {
		return { valid: false };
	}

	if (isTokenExpired(token)) {
		return { valid: false };
	}

	return { valid: true, user: decoded };
}
