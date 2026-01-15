/**
 * Google Apps Script for fetching and writing data to an Admin Panel.
 * 
 * Features:
 * 1. Read from all sheets where W10 = TRUE.
 * 2. Get items from B14:B38, appending column D to column B for the name.
 * 3. Fetch 10 values from K14:T38 for each item.
 * 4. Update specific rows with new values.
 */

const GOOGLE_SHEETS_CONFIG = {
  FILTER_CELL: 'W10',
  ITEM_NAME_COL: 'B',
  EXTRA_INFO_COL: 'D',
  DATA_START_ROW: 14,
  DATA_END_ROW: 38,
  VALUES_START_COL: 'K', // Column 11
  VALUES_END_COL: 'T',   // Column 20
  NAME_JOIN_CHAR: ' - '
};

/**
 * Main function to fetch all eligible sheet data.
 * @param {string} [spreadsheetId] Optional spreadsheet ID.
 * @returns {Array<{sheetName: string, items: Array<{name: string, rowIndex: number, values: Array<any>}>}>}
 */
function fetchSheetsData(spreadsheetId) {
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const result = [];

  sheets.forEach(sheet => {
    // 1. Check if sheet is eligible (W10 == TRUE)
    const isEligible = sheet.getRange(GOOGLE_SHEETS_CONFIG.FILTER_CELL).getValue();
    
    if (isEligible === true || String(isEligible).toUpperCase() === 'TRUE') {
      const sheetData = {
        sheetName: sheet.getName(),
        items: []
      };

      const startRow = GOOGLE_SHEETS_CONFIG.DATA_START_ROW;
      const numRows = GOOGLE_SHEETS_CONFIG.DATA_END_ROW - GOOGLE_SHEETS_CONFIG.DATA_START_ROW + 1;

      // 2. Read Name columns (B and D) and Value columns (K to T) in bulk
      // Column B is 2, D is 4 (offset 0 and 2 from B)
      const namesRange = sheet.getRange(startRow, 2, numRows, 3).getValues(); // B to D
      const valuesRange = sheet.getRange(startRow, 11, numRows, 10).getValues(); // K to T

      for (let i = 0; i < numRows; i++) {
        const itemName = namesRange[i][0]; // Column B
        const extraInfo = namesRange[i][2]; // Column D
        
        // Only process if there's an item name in column B
        if (itemName && String(itemName).trim() !== "") {
          const combinedName = extraInfo ? `${itemName}${GOOGLE_SHEETS_CONFIG.NAME_JOIN_CHAR}${extraInfo}` : itemName;
          
          sheetData.items.push({
            name: combinedName.toString(),
            rowIndex: startRow + i,
            values: valuesRange[i]
          });
        }
      }

      if (sheetData.items.length > 0) {
        result.push(sheetData);
      }
    }
  });

  return result;
}

/**
 * Updates 10 values for a specific item in a sheet.
 * @param {string} sheetName Name of the sheet.
 * @param {number} rowIndex The 1-based row index to update.
 * @param {Array<any>} values Array of 10 values to write to K:T.
 * @param {string} [spreadsheetId] Optional spreadsheet ID.
 */
function updateItemData(sheetName, rowIndex, values, spreadsheetId) {
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found.`);
  }

  if (!Array.isArray(values) || values.length !== 10) {
    throw new Error("Values must be an array of exactly 10 elements.");
  }

  // Column 11 is K. Update 1 row, 10 columns.
  sheet.getRange(rowIndex, 11, 1, 10).setValues([values]);
  
  return {
    success: true,
    message: `Updated ${sheetName} at row ${rowIndex}`
  };
}

/**
 * Web App Wrapper (Optional)
 * Allows the script to be called via HTTP POST from the Svelte app.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const spreadsheetId = payload.spreadsheetId;
    let result;

    switch (action) {
      case 'fetch':
        result = fetchSheetsData(spreadsheetId);
        break;
      case 'update':
        result = updateItemData(payload.sheetName, payload.rowIndex, payload.values, spreadsheetId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

