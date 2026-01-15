import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectDB } from '$lib/mongodb';
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { phoneNumber, otp, newPassword } = await request.json();

    if (!phoneNumber || !otp || !newPassword) {
      return json(
        {
          success: false,
          message: 'Phone number, OTP, and new password are required'
        },
        { status: 400 }
      );
    }


    const db = await connectDB();
    const otpCollection = db.collection('otp_verifications');
    const usersCollection = db.collection('users');

    // Find and verify the OTP
    const otpDoc = await otpCollection.findOne({
      phoneNumber,
      otp,
      type: 'password_reset',
      expiresAt: { $gt: new Date() } // OTP must not be expired
    });

    if (!otpDoc) {
      return json(
        {
          success: false,
          message: 'Invalid or expired OTP'
        },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user's password
    console.log('Updating password for user ID:', otpDoc.userId);
    const updateResult = await usersCollection.updateOne(
      { _id: otpDoc.userId },
      { $set: { password: hashedPassword } }
    );

    console.log('Update result:', updateResult);

    if (updateResult.modifiedCount === 0) {
      console.log('No documents were modified - user might not exist');
      return json(
        {
          success: false,
          message: 'Failed to update password - user not found'
        },
        { status: 500 }
      );
    }

    // Remove the used OTP
    await otpCollection.deleteOne({ _id: otpDoc._id });

    // Remove all other unused password reset OTPs for this user
    await otpCollection.deleteMany({
      userId: otpDoc.userId,
      type: 'password_reset'
    });

    return json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return json(
      {
        success: false,
        message: 'Failed to reset password. Please try again later.'
      },
      { status: 500 }
    );
  }
};
