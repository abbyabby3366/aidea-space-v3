/**
 * Sends a WhatsApp "Hello" message to all recipients listed in cell L1
 * @return {Object} Response from the API for all messages
 */
function sendWhatsAppMessage() {
	// Read recipients from cell L1
	const sheet = SpreadsheetApp.getActiveSheet();
	const recipientsCell = sheet.getRange('L1').getValue();

	// Split comma-separated recipients and add @s.whatsapp.net
	const phoneNumbers = recipientsCell.split(',');
	const recipients = phoneNumbers.map((phone) => phone.trim() + '@s.whatsapp.net');

	// Get job number from sheet name
	const jobNumber = sheet.getName();

	// Read print items from B14, C14, D14... until empty cell
	const printItems = [];
	let columnIndex = 2; // Column B = 2, C = 3, etc.

	while (true) {
		const cellValue = sheet.getRange(14, columnIndex).getValue();
		if (!cellValue || cellValue.toString().trim() === '') {
			break; // Stop when we find an empty cell
		}
		printItems.push(cellValue.toString().trim());
		columnIndex++;
	}

	// Construct the message text with header and print items
	let messageText = `Print Items for ${jobNumber}\n\n`;
	if (printItems.length > 0) {
		messageText += printItems.map((item, index) => `${index + 1}. ${item}`).join('\n');
	} else {
		messageText += 'No print items found.';
	}

	const results = [];

	// Send message to each recipient
	for (const recipientJid of recipients) {
		try {
			// Set up the request options
			const options = {
				method: 'post',
				headers: {
					'x-api-key': 'who_is_the_best_man_in_the_world',
					'Content-Type': 'application/json'
				},
				payload: JSON.stringify({
					jid: recipientJid,
					text: messageText
				}),
				muteHttpExceptions: true
			};

			// Make the POST request
			const response = UrlFetchApp.fetch('https://tra.ncss.dev/api/send-message', options);

			// Log success
			Logger.log('Message sent successfully to: ' + recipientJid);
			results.push({
				jid: recipientJid,
				success: true,
				statusCode: response.getResponseCode(),
				response: response.getContentText()
			});
		} catch (error) {
			// Log error
			Logger.log('Error sending message to ' + recipientJid + ': ' + error.toString());
			results.push({
				jid: recipientJid,
				success: false,
				error: error.toString()
			});
		}
	}

	return {
		totalRecipients: recipients.length,
		results: results
	};
}
