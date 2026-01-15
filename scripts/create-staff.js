import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

async function createStaff(email, phone, password) {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(MONGODB_DATABASE);
    const users = db.collection('users');

    // Check if user already exists
    const existingUser = await users.findOne({ 
      $or: [{ email }, { phone }] 
    });

    if (existingUser) {
      console.log('User already exists, updating role to staff...');
      await users.updateOne(
        { _id: existingUser._id },
        { $set: { role: 'staff' } }
      );
      console.log('User role updated to staff.');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = {
      email,
      phone,
      password: hashedPassword,
      role: 'staff',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users.insertOne(newUser);
    console.log(`Staff user created with ID: ${result.insertedId}`);
  } catch (error) {
    console.error('Error creating staff user:', error);
  } finally {
    await client.close();
  }
}

// Get arguments from command line
const email = process.argv[2];
const phone = process.argv[3];
const password = process.argv[4];

if (!email || !phone || !password) {
  console.log('Usage: node scripts/create-staff.js <email> <phone> <password>');
  process.exit(1);
}

createStaff(email, phone, password);
