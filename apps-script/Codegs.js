/**
 * Serves the HTML file and passes the 'job' URL parameter into the template.
 */
function doGet(e) {
	const template = HtmlService.createTemplateFromFile('Index');

	// This captures ?job=XXXX from the URL.
	// If no param is found, it defaults to "Manual-Upload"
	template.jobNumber = e.parameter && e.parameter.job ? e.parameter.job : 'Manual-Upload';

	return template
		.evaluate()
		.setTitle('Metadata Extractor')
		.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Saves the metadata.
 * The 'jobNumber' passed here comes from the client-side 'currentJob' variable.
 */
/**
 * Saves the metadata.
 * The 'jobNumber' passed here comes from the client-side 'currentJob' variable.
 */
function saveMetadataToSheet(data, jobNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Handle the Meta sheet
  let metaSheet = ss.getSheetByName('Meta');
  if (!metaSheet) {
    metaSheet = ss.insertSheet('Meta');
    metaSheet.appendRow([
      'Job Number',
      'Filename',
      'Type',
      'Resolution',
      'Width',
      'Height',
      'Date Processed',
      'Base64 Thumb'
    ]);
    metaSheet
      .getRange('A1:H1')
      .setBackground('#3498db')
      .setFontColor('white')
      .setFontWeight('bold');
    metaSheet.setFrozenRows(1);
  }

  const timestamp = new Date();
  const rowsToAppend = data.map((row) => {
    return [
      jobNumber,
      row[0], // Filename
      row[1], // Type
      row[2], // Resolution
      row[3], // Width
      row[4], // Height
      timestamp,
      row[5]  // Base64 Thumb
    ];
  });

  const startRow = metaSheet.getLastRow() + 1;
  const range = metaSheet.getRange(startRow, 1, rowsToAppend.length, 8);
  range.setValues(rowsToAppend);
  metaSheet.getRange(startRow, 4, rowsToAppend.length, 1).setNumberFormat('0" DPI"');

  // Handle the job-specific sheet
  let jobSheet = ss.getSheetByName(jobNumber);
  if (!jobSheet) {
    throw new Error(`Job sheet "${jobNumber}" not found. Please create the sheet first.`);
  }

  let currentRow = 14;
  const jobSheetRows = [];
  
  data.forEach((row) => {
    const wInch = (row[3] / row[2]).toFixed(2);
    const hInch = (row[4] / row[2]).toFixed(2);
    const base64Data = row[5];

    while (true) {
      const bCell = jobSheet.getRange(currentRow, 2);
      const dCell = jobSheet.getRange(currentRow, 4);
      if (!bCell.getValue() && !dCell.getValue()) break;
      currentRow++;
    }

    // Write metadata
    jobSheet.getRange(currentRow, 2).setValue(row[0]); // Column B
    jobSheet.getRange(currentRow, 4).setValue(`${wInch}" x ${hInch}"`); // Column D
    
    // Write Base64 string to Column AG
    if (base64Data) {
      jobSheet.getRange(currentRow, 33).setValue(base64Data); // Column AG (index 33)
      
      // Insert Image into Column J
      try {
        const contentType = base64Data.substring(5, base64Data.indexOf(';'));
        const bytes = Utilities.base64Decode(base64Data.split(',')[1]);
        const blob = Utilities.newBlob(bytes, contentType, row[0]);
        
        const img = jobSheet.insertImage(blob, 10, currentRow); // Column J is index 10
        
        // Scale and position the image slightly
        const currentWidth = img.getWidth();
        const currentHeight = img.getHeight();
        const ratio = Math.min(80 / currentWidth, 40 / currentHeight, 1);
        img.setWidth(currentWidth * ratio);
        img.setHeight(currentHeight * ratio);
        
        // Offset to center slightly in cell (Column J)
        img.setAnchorCellXOffset(5);
        img.setAnchorCellYOffset(5);
      } catch (e) {
        console.error('Failed to insert image:', e);
      }
    }

    jobSheetRows.push(currentRow);
    currentRow++;
  });

  return {
    message: 'Successfully logged ' + rowsToAppend.length + ' files with thumbnails.',
    undoData: {
      metaStartRow: startRow,
      metaRowCount: rowsToAppend.length,
      jobSheetName: jobNumber,
      jobSheetRows: jobSheetRows
    }
  };
}

/**
 * Undoes the last save operation.
 */
function undoLastSave(saveResult) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const undoData = saveResult.undoData;

  // Undo Meta sheet
  const metaSheet = ss.getSheetByName('Meta');
  if (metaSheet && undoData.metaStartRow && undoData.metaRowCount) {
    metaSheet.getRange(undoData.metaStartRow, 1, undoData.metaRowCount, 8).clearContent();
  }

  // Undo job sheet
  const jobSheet = ss.getSheetByName(undoData.jobSheetName);
  if (jobSheet && undoData.jobSheetRows) {
    const images = jobSheet.getImages();
    undoData.jobSheetRows.forEach((rowNum) => {
      // Clear text
      jobSheet.getRange(rowNum, 2).clearContent();
      jobSheet.getRange(rowNum, 4).clearContent();
      jobSheet.getRange(rowNum, 33).clearContent(); // Column AG
      
      // Remove images on this specific row
      images.forEach(img => {
        if (img.getAnchorCell().getRow() === rowNum) {
          img.remove();
        }
      });
    });
  }

  return 'Successfully undid the last save operation';
}
