/**
 * Simple Node.js script to test the Google Apps Script endpoint.
 * 
 * Usage:
 * 1. Replace the SCRIPT_URL with your Web App URL.
 * 2. Run with: node scripts/testSheetsAPI.js
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzL5mLT2_smT02N301y83Y7Bl1m4IKM9f9RfVITnchFkpiFh1wmzIZyGqvJd5FgT4Ra/exec'; 
const SPREADSHEET_ID = '1zToVel4JHVsPdj0SwzzxUbbsd4-Y_ylijWMMkRpoMek'; // Optional

async function testFetch() {
  console.log('--- Testing Fetch Action ---');
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'fetch',
        spreadsheetId: SPREADSHEET_ID || undefined
      })
    });

    const text = await response.text();
    console.log('Status:', response.status);
    
    try {
      const json = JSON.parse(text);
      console.log('Data received successfully:');
      console.dir(json, { depth: null });
    } catch (e) {
      console.log('Response is not JSON. Raw body:');
      console.log(text);
    }
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

// Run the test
if (SCRIPT_URL.includes('YOUR_APPS_SCRIPT_URL_HERE')) {
  console.error('Error: Please edit scripts/testSheetsAPI.js and replace SCRIPT_URL with your actual deployment URL.');
} else {
  testFetch();
}
