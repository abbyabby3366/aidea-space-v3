#!/usr/bin/env node

/**
 * Admin Initialization Script
 * Creates an admin user in MongoDB with credentials from .env file
 * Uses the same structure as the admin panel for consistency
 */

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import readline from 'readline';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function initAdmin() {
	console.log('🚀 Initializing Admin User...\n');

	// Validate environment variables
	const requiredEnvVars = [
		'MONGODB_URI',
		'MONGODB_DATABASE',
		'ADMIN_EMAIL',
		'ADMIN_PHONE',
		'ADMIN_PASSWORD',
		'JWT_SECRET'
	];
	const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

	if (missingVars.length > 0) {
		console.error('❌ Missing required environment variables:');
		missingVars.forEach((varName) => console.error(`   - ${varName}`));
		console.error('\nPlease check your .env file and ensure all required variables are set.');
		console.error('💡 Create a .env file in the project root with the following variables:');
		console.error('   MONGODB_URI=mongodb://localhost:27017');
		console.error('   MONGODB_DATABASE=template-app');
		console.error('   ADMIN_EMAIL=admin@yourdomain.com');
		console.error('   ADMIN_PHONE=+1234567890');
		console.error('   ADMIN_PASSWORD=your-secure-password');
		console.error('   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production\n');
		process.exit(1);
	}

	const config = {
		mongoUri: process.env.MONGODB_URI,
		database: process.env.MONGODB_DATABASE || 'template-app',
		adminEmail: process.env.ADMIN_EMAIL,
		adminPhone: process.env.ADMIN_PHONE,
		adminPassword: process.env.ADMIN_PASSWORD
	};

	console.log('📋 Configuration:');
	console.log(`   Database: ${config.database}`);
	console.log(`   Admin Email: ${config.adminEmail}`);
	console.log(`   Admin Phone: ${config.adminPhone}`);
	console.log(`   JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
	console.log(`   MongoDB URI: ${config.mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);

	let client;

	try {
		// Connect to MongoDB
		console.log('🔌 Connecting to MongoDB...');
		client = new MongoClient(config.mongoUri);
		await client.connect();

		const db = client.db(config.database);
		const users = db.collection('users');

		console.log('✅ Connected to MongoDB successfully!\n');

		// Check if admin already exists
		console.log('🔍 Checking for existing admin user...');
		const existingAdmin = await users.findOne({
			$or: [{ email: config.adminEmail }, { phone: config.adminPhone }]
		});

		if (existingAdmin) {
			console.log('⚠️  Admin user already exists!');
			console.log(`   Found: ${existingAdmin.email || existingAdmin.phone}`);

			// Ask if user wants to update
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			const answer = await new Promise((resolve) => {
				rl.question('Do you want to update the existing admin user? (y/N): ', resolve);
			});
			rl.close();

			if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
				console.log('❌ Admin initialization cancelled.\n');
				return;
			}

			// Update existing admin with correct structure (matching admin panel exactly)
			console.log('🔄 Updating existing admin user...');
			const hashedPassword = await bcrypt.hash(config.adminPassword, 12);

			await users.updateOne(
				{ _id: existingAdmin._id },
				{
					$set: {
						email: config.adminEmail,
						phone: config.adminPhone,
						password: hashedPassword,
						fullname: 'System Administrator',
						isAdmin: true,
						phoneVerified: false, // Match admin panel - admins start unverified
						status: 'active',
						createdAt: new Date(),
						lastCheckIn: null,
						memberTier: 'standard' // Default tier as per admin panel
					}
				}
			);

			console.log('✅ Admin user updated successfully!\n');
		} else {
			// Create new admin user with correct structure (matching admin panel exactly)
			console.log('👤 Creating new admin user...');
			const hashedPassword = await bcrypt.hash(config.adminPassword, 12);

			const adminUser = {
				email: config.adminEmail,
				phone: config.adminPhone,
				password: hashedPassword,
				fullname: 'System Administrator',
				isAdmin: true,
				phoneVerified: false, // Match admin panel - admins start unverified
				status: 'active',
				createdAt: new Date(),
				lastCheckIn: null,
				memberTier: 'standard' // Default tier as per admin panel
			};

			const result = await users.insertOne(adminUser);
			console.log('✅ Admin user created successfully!');
			console.log(`   User ID: ${result.insertedId}\n`);
		}

		// Verify admin user
		console.log('🔍 Verifying admin user...');
		const verifyAdmin = await users.findOne({
			$or: [{ email: config.adminEmail }, { phone: config.adminPhone }],
			isAdmin: true
		});

		if (verifyAdmin) {
			console.log('✅ Admin user verification successful!');
			console.log('📝 Admin Details:');
			console.log(`   ID: ${verifyAdmin._id}`);
			console.log(`   Email: ${verifyAdmin.email}`);
			console.log(`   Phone: ${verifyAdmin.phone}`);
			console.log(`   Is Admin: ${verifyAdmin.isAdmin}`);
			console.log(`   Status: ${verifyAdmin.status}`);
			console.log(`   Member Tier: ${verifyAdmin.memberTier}`);
			console.log(`   Created: ${verifyAdmin.createdAt}\n`);

			// Test password verification
			console.log('🧪 Testing password verification...');
			const passwordMatch = await bcrypt.compare(config.adminPassword, verifyAdmin.password);
			console.log(`   Password verification: ${passwordMatch ? '✅ SUCCESS' : '❌ FAILED'}\n`);
		} else {
			console.log('❌ Admin user verification failed!\n');
			process.exit(1);
		}

		console.log('🎉 Admin initialization completed successfully!');
		console.log('🔐 You can now login to the admin panel with:');
		console.log(`   Email: ${config.adminEmail}`);
		console.log(`   Phone: ${config.adminPhone}`);
		console.log(`   Password: ${config.adminPassword}\n`);
	} catch (error) {
		console.error('❌ Error during admin initialization:', error.message);

		if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
			console.error('\n💡 Connection Tips:');
			console.error('   - Check if MongoDB is running');
			console.error('   - Verify your MONGODB_URI is correct');
			console.error('   - For local MongoDB: mongodb://localhost:27017');
			console.error('   - For MongoDB Atlas: mongodb+srv://...\n');
		}

		process.exit(1);
	} finally {
		if (client) {
			await client.close();
			console.log('🔌 MongoDB connection closed.\n');
		}
	}
}

// Run the initialization
initAdmin().catch(console.error);
