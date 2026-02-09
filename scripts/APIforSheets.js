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
  THUMB_COL: 'AG',       // Column 33
  NAME_JOIN_CHAR: ' - '
};

/**
 * Main function to fetch all eligible sheet data.
 * @param {string} [spreadsheetId] Optional spreadsheet ID.
 * @returns {Array<{sheetName: string, items: Array<{name: string, rowIndex: number, values: Array<any>}>}>}
 */
function fetchSheetsData(spreadsheetId) {
  try {
    const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Could not find/open spreadsheet. Check ID and permissions.");
    
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

        // Bulk read Name and Value columns
        const namesRange = sheet.getRange(startRow, 2, numRows, 3).getValues(); // B to D
        const valuesRange = sheet.getRange(startRow, 11, numRows, 10).getValues(); // K to T
        
        // Ensure the sheet has enough columns for AG (33)
        const lastCol = sheet.getLastColumn();
        let thumbRange = new Array(numRows).fill(['']);
        if (lastCol >= 33) {
          thumbRange = sheet.getRange(startRow, 33, numRows, 1).getValues(); // AG
        }

        for (let i = 0; i < numRows; i++) {
          const itemName = namesRange[i][0]; // Column B
          const extraInfo = namesRange[i][2]; // Column D
          
          if (itemName && String(itemName).trim() !== "") {
            const combinedName = extraInfo ? `${itemName}${GOOGLE_SHEETS_CONFIG.NAME_JOIN_CHAR}${extraInfo}` : itemName;
            
            sheetData.items.push({
              name: combinedName.toString(),
              rowIndex: startRow + i,
              values: valuesRange[i],
              thumb: thumbRange[i][0] // Column AG
            });
          }
        }

        if (sheetData.items.length > 0) {
          result.push(sheetData);
        }
      }
    });

    return result;
  } catch (e) {
    throw new Error(`Fetch failed: ${e.toString()}`);
  }
}

/**
 * Updates multiple items in a specific sheet.
 * @param {string} sheetName Name of the sheet.
 * @param {Array<{rowIndex: number, values: Array<any>}>} updates List of rows to update.
 * @param {string} [spreadsheetId] Optional spreadsheet ID.
 */
function updateSheetData(sheetName, updates, spreadsheetId) {
  try {
    const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Could not find/open spreadsheet. Ensure the Script has access and the Spreadsheet ID is correct.");

    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found. Please ensure the Job Number matches exactly.`);

    const startRow = GOOGLE_SHEETS_CONFIG.DATA_START_ROW;
    const endRow = GOOGLE_SHEETS_CONFIG.DATA_END_ROW;
    const numRows = endRow - startRow + 1;
    
    // Efficiency: Fetch all values first, update in memory, write back once
    const dataRange = sheet.getRange(startRow, 11, numRows, 10);
    const gridValues = dataRange.getValues();
    let changeCount = 0;

    updates.forEach(update => {
      const internalIdx = update.rowIndex - startRow;
      if (internalIdx >= 0 && internalIdx < numRows) {
        if (Array.isArray(update.values) && update.values.length === 10) {
          gridValues[internalIdx] = update.values;
          changeCount++;
        }
      }
    });

    dataRange.setValues(gridValues);
    
    return {
      success: true,
      message: `Successfully updated ${changeCount} rows in ${sheetName}`
    };
  } catch (e) {
    return {
      success: false,
      message: e.toString()
    };
  }
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
        // Support legacy single item update by wrapping it
        if (payload.rowIndex) {
          result = updateSheetData(payload.sheetName, [{ rowIndex: payload.rowIndex, values: payload.values }], spreadsheetId);
        } else {
          result = updateSheetData(payload.sheetName, payload.updates, spreadsheetId);
        }
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

