import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyToken } from '$lib/auth';
import { connectDB } from '$lib/mongodb';
import { ObjectId } from 'mongodb';
import { config } from '$lib/config';

const COLLECTION_NAME = 'google_sheets_cache';

/**
 * Generates a unique key for a specific script/spreadsheet combination.
 */
function getSourceKey(scriptUrl: string, spreadsheetId: string = '') {
  // Simple hash or concatenated string to differentiate sources
  return Buffer.from(`${scriptUrl.trim()}|${spreadsheetId.trim()}`).toString('base64');
}

/**
 * GET Handler: Fetches cached data for a specific source from MongoDB.
 */
export const GET: RequestHandler = async ({ request, url }) => {
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

    // 2. Identify Source
    const scriptUrl = url.searchParams.get('scriptUrl');
    const spreadsheetId = url.searchParams.get('spreadsheetId') || '';

    if (!scriptUrl) {
      return json([]); // Return empty if no source specified yet
    }

    const sourceKey = getSourceKey(scriptUrl, spreadsheetId);

    // 3. Fetch from DB
    const db = await connectDB();
    const cache = db.collection(COLLECTION_NAME);
    const entry = await cache.findOne({ sourceKey });

    const sheets = entry?.data || [];
    const hiddenSheetNames = entry?.hiddenSheetNames || [];

    // Merge hidden status into sheets
    const responseData = sheets.map((sheet: any) => ({
      ...sheet,
      hidden: hiddenSheetNames.includes(sheet.sheetName)
    }));

    return json(responseData);
  } catch (error: any) {
    console.error('Fetch Cache Error:', error);
    return json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
};

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
    let { scriptUrl, action, spreadsheetId = '', ...payload } = body;

    if (!scriptUrl) {
      return json({ success: false, message: 'Missing scriptUrl' }, { status: 400 });
    }
    
    scriptUrl = scriptUrl.trim();
    spreadsheetId = spreadsheetId.trim();
    const sourceKey = getSourceKey(scriptUrl, spreadsheetId);
    const cache = db.collection(COLLECTION_NAME);

    // 3. Handle Actions
    if (action === 'fetch') {
      console.log('Fetching fresh data from Google Script:', scriptUrl);
      const googleResponse = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'fetch', spreadsheetId, ...payload })
      });

      const responseText = await googleResponse.text();
      
      if (!googleResponse.ok) {
        return json({ success: false, message: `Google Script error (${googleResponse.status})` }, { status: googleResponse.status });
      }

      try {
        const result = JSON.parse(responseText);
        
        // SAVE TO CACHE: Scope by sourceKey
        // We use $set for data but preserve hiddenSheetNames if it exists
        await cache.updateOne(
          { sourceKey },
          { 
            $set: { 
              sourceKey,
              scriptUrl,
              spreadsheetId,
              data: result,
              updatedAt: new Date()
            } 
          },
          { upsert: true }
        );
        
        // Fetch hiddenSheetNames to return merged data
        const entry = await cache.findOne({ sourceKey });
        const hiddenSheetNames = entry?.hiddenSheetNames || [];
        const mergedData = result.map((sheet: any) => ({
          ...sheet,
          hidden: hiddenSheetNames.includes(sheet.sheetName)
        }));

        return json(mergedData);
      } catch (e) {
        return json({ success: false, message: 'Invalid JSON from Google' }, { status: 502 });
      }
    } 

    if (action === 'toggleHide') {
      const { sheetName, hidden } = payload;
      if (!sheetName) return json({ success: false, message: 'Missing sheetName' }, { status: 400 });

      if (hidden) {
        // Add to hidden list
        await cache.updateOne(
          { sourceKey },
          { $addToSet: { hiddenSheetNames: sheetName } },
          { upsert: true }
        );
      } else {
        // Remove from hidden list
        await cache.updateOne(
          { sourceKey },
          { $pull: { hiddenSheetNames: sheetName } }
        );
      }
      return json({ success: true });
    }
    
    if (action === 'update') {
      const { sheetName, updates } = payload;
      
      if (!sheetName || !Array.isArray(updates)) {
        return json({ success: false, message: 'Missing sheetName or updates array' }, { status: 400 });
      }

      // A. Update local MongoDB cache first (Optimistic)
      // We update the entire 'data' array for the specified sheetName within the sourceKey
      await cache.updateOne(
        { 
          sourceKey,
          "data.sheetName": sheetName 
        },
        { 
          $set: { 
            "data.$.items": updates.map((u: any) => ({
              name: u.name,
              rowIndex: u.rowIndex,
              values: u.values
            }))
          } 
        }
      );

      // B. Trigger Google update in the background
      (async () => {
        try {
          await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify({ 
              action: 'update', 
              sheetName, 
              updates, 
              spreadsheetId, 
              ...payload 
            })
          });
          console.log(`Background bulk sync success for ${sourceKey} -> ${sheetName}`);
        } catch (err) {
          console.error(`Background bulk sync FAILED for ${sourceKey}:`, err);
        }
      })();

      return json({ success: true, message: 'Sheet updates saved to DB, syncing in background...' });
    }

    return json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Google Sheets Proxy Error:', error);
    return json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
};
