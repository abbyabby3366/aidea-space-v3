/**
 * OPTION 1: Duplicates from the "Raw" sheet specifically.
 */
function duplicateRawSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rawSheet = ss.getSheetByName("Raw");
  
  if (!rawSheet) {
    SpreadsheetApp.getUi().alert("Error: Could not find a sheet named 'Raw'");
    return;
  }
  
  createNewJobSheet(ss, rawSheet);
}

/**
 * OPTION 2: Duplicates from whichever sheet you are currently looking at.
 */
function duplicateCurrentSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var currentSheet = ss.getActiveSheet();
  
  createNewJobSheet(ss, currentSheet);
}

/**
 * CORE LOGIC
 */
function createNewJobSheet(ss, sourceSheet) {
  var sheets = ss.getSheets();
  
  // 1. Find the highest Job Number
  var maxJobNum = 0;
  sheets.forEach(function(s) {
    var name = s.getName();
    if (!isNaN(name) && name.trim() !== "") {
      maxJobNum = Math.max(maxJobNum, parseInt(name));
    }
  });
  
  var newJobNumber = maxJobNum + 1;
  var newName = newJobNumber.toString();

  // 2. Duplicate and rename
  var newSheet = sourceSheet.copyTo(ss).setName(newName);
  
  // 3. Set today's date in C10
  var today = new Date();
  var formattedDate = Utilities.formatDate(today, "GMT+8", "d MMMM yyyy");
  newSheet.getRange("C10").setValue(formattedDate);
  
  // 4. Set the Job Number in H5
  newSheet.getRange("H5").setValue(newJobNumber);

  // 5. Set Formula in V5
  // This builds: =V1 & "?job=123" (handles existing ? or & automatically)
  var formula = '=IF(ISBLANK(V1), "", V1 & IF(ISERROR(FIND("?", V1)), "?", "&") & "job=' + newJobNumber + '")';
  newSheet.getRange("V5").setFormula(formula);

  // Move and activate
  ss.setActiveSheet(newSheet);
  ss.moveActiveSheet(ss.getNumSheets());
}
/**
 * Opens the URL found in cell V5 of the active sheet.
 */
function openJobUrl() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var url = sheet.getRange("V5").getValue();

  if (!url || url === "") {
    SpreadsheetApp.getUi().alert("Error: Cell V5 is empty or does not contain a URL.");
    return;
  }

  // HTML/JS Bridge to trigger a browser-side redirect
  var html = `
    <html>
      <script>
        window.open("${url}", "_blank");
        google.script.host.close();
      </script>
    </html>
  `;
  
  var userInterface = HtmlService.createHtmlOutput(html)
    .setWidth(10)
    .setHeight(10); // Minimal size as it closes instantly
    
  SpreadsheetApp.getUi().showModalDialog(userInterface, "Opening Job Link...");
}

/**
 * UPDATED: Added the new function to the custom menu
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Job Manager')
        .addItem('🌐 Open Job URL (V5)', 'openJobUrl')
            .addSeparator()
      .addItem('Create New from RAW', 'duplicateRawSheet')
      .addItem('Duplicate CURRENT Sheet', 'duplicateCurrentSheet')
      .addToUi();
}

function toggleColumnsKU() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const startColumn = 11; // Column K
  const numColumns = 11;  // K through U
  
  // Check if the first column in the range (K) is already hidden
  if (sheet.isColumnHiddenByUser(startColumn)) {
    sheet.showColumns(startColumn, numColumns);
  } else {
    sheet.hideColumns(startColumn, numColumns);
  }
}