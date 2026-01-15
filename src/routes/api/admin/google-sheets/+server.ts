import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import { config } from '$lib/config';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // 1. Verify Admin Status
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

    const isAdmin = user.email === config.admin.email || user.isAdmin === true || user.phone === config.admin.phone || user.role === 'admin';
    if (!isAdmin) {
      return json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // 2. Extract Proxy Data
    const body = await request.json();
    let { scriptUrl, ...payload } = body;

    if (!scriptUrl) {
      return json({ success: false, message: 'Missing scriptUrl' }, { status: 400 });
    }
    
    scriptUrl = scriptUrl.trim();

    // 3. Proxy request to Google Apps Script
    console.log('Proxying to Google Script:', scriptUrl);
    console.log('Payload:', JSON.stringify(payload));

    // Match the Node test script exactly: No custom headers, default redirect behavior
    const googleResponse = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const responseText = await googleResponse.text();
    console.log('Google Response Status:', googleResponse.status);
    console.log('Google Response Content-Type:', googleResponse.headers.get('content-type'));
    
    if (!googleResponse.ok) {
      console.error('Google Response Error Body:', responseText.substring(0, 500));
      return json({ 
        success: false, 
        message: `Google Script error (${googleResponse.status})`,
        details: responseText.substring(0, 200)
      }, { status: googleResponse.status });
    }

    // Try to parse as JSON
    try {
      const result = JSON.parse(responseText);
      console.log('Successfully parsed JSON response');
      return json(result);
    } catch (e) {
      console.error('Failed to parse Google Script response as JSON. Body snippet:', responseText.substring(0, 500));
      
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        return json({ 
          success: false, 
          message: 'Received HTML instead of JSON. Check script deployment settings.',
          debug: responseText.substring(0, 100)
        }, { status: 502 });
      }

      return json({ 
        success: false, 
        message: 'Invalid JSON response from Google Script.',
        debug: responseText.substring(0, 200)
      }, { status: 502 });
    }

  } catch (error: any) {
    console.error('Google Sheets Proxy Error:', error);
    return json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
};
