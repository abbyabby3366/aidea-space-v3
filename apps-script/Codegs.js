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
function saveMetadataToSheet(data, jobNumber) {
	const ss = SpreadsheetApp.getActiveSpreadsheet();

	// First, handle the Meta sheet (existing functionality)
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
			'Date Processed'
		]);
		metaSheet
			.getRange('A1:G1')
			.setBackground('#3498db')
			.setFontColor('white')
			.setFontWeight('bold');
		metaSheet.setFrozenRows(1);
	}

	const timestamp = new Date();
	const rowsToAppend = data.map((row) => {
		return [
			jobNumber, // Using the parameter passed from the UI
			row[0], // Filename
			row[1], // Type
			row[2], // Resolution
			row[3], // Width
			row[4], // Height
			timestamp
		];
	});

	const startRow = metaSheet.getLastRow() + 1;
	const range = metaSheet.getRange(startRow, 1, rowsToAppend.length, 7);
	range.setValues(rowsToAppend);

	// Format Resolution column
	metaSheet.getRange(startRow, 4, rowsToAppend.length, 1).setNumberFormat('0" DPI"');

	// Now handle the job-specific sheet
	let jobSheet = ss.getSheetByName(jobNumber);
	if (!jobSheet) {
		throw new Error(`Job sheet "${jobNumber}" not found. Please create the sheet first.`);
	}

	// Find the next available row starting from row 14 and track what we write
	let currentRow = 14;
	const jobSheetRows = [];
	data.forEach((row) => {
		const wInch = (row[3] / row[2]).toFixed(2); // width / resolution
		const hInch = (row[4] / row[2]).toFixed(2); // height / resolution

		// Find next empty row where both B and D are empty
		while (true) {
			const bCell = jobSheet.getRange(currentRow, 2); // Column B
			const dCell = jobSheet.getRange(currentRow, 4); // Column D

			// Check if both cells are empty
			if (!bCell.getValue() && !dCell.getValue()) {
				break; // Found empty row, use it
			}
			currentRow++; // Move to next row
		}

		// Write filename to column B
		jobSheet.getRange(currentRow, 2).setValue(row[0]); // Column B

		// Write dimensions to column D
		jobSheet.getRange(currentRow, 4).setValue(`${wInch}" x ${hInch}"`); // Column D

		// Track this row for undo
		jobSheetRows.push(currentRow);

		currentRow++; // Move to next row for next item
	});

	return {
		message: 'Successfully logged ' + rowsToAppend.length + ' files for Job: ' + jobNumber,
		undoData: {
			metaStartRow: startRow,
			metaRowCount: rowsToAppend.length,
			jobSheetName: jobNumber,
			jobSheetRows: jobSheetRows
		}
	};
}

/**
 * Undoes the last save operation by removing the data that was written.
 */
function undoLastSave(saveResult) {
	const ss = SpreadsheetApp.getActiveSpreadsheet();
	const undoData = saveResult.undoData;

	// Undo Meta sheet changes
	const metaSheet = ss.getSheetByName('Meta');
	if (metaSheet && undoData.metaStartRow && undoData.metaRowCount) {
		const startRow = undoData.metaStartRow;
		const rowCount = undoData.metaRowCount;

		// Clear the rows that were added
		metaSheet.getRange(startRow, 1, rowCount, 7).clearContent();

		// If these were the last rows, we might need to handle frozen rows, but for now just clear
	}

	// Undo job sheet changes
	const jobSheet = ss.getSheetByName(undoData.jobSheetName);
	if (jobSheet && undoData.jobSheetRows) {
		undoData.jobSheetRows.forEach((rowNum) => {
			// Clear column B and D for this row
			jobSheet.getRange(rowNum, 2).clearContent(); // Column B
			jobSheet.getRange(rowNum, 4).clearContent(); // Column D
		});
	}

	return 'Successfully undid the last save operation';
}
