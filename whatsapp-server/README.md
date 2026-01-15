# WhatsApp Server

A dedicated server for sending WhatsApp messages only. This server handles all WhatsApp message delivery for the main application.

## Features

- ✅ **Message Sending Only** - Focused solely on delivering messages
- ✅ **Multiple Message Types** - OTP, task notifications, transaction updates, etc.
- ✅ **Robust Error Handling** - Comprehensive error handling and logging
- ✅ **Health Monitoring** - Built-in health check endpoint
- ✅ **Optimized Performance** - Streamlined for message delivery

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create environment file:**

   ```bash
   # Create .env file with:
   WHATSAPP_SERVER_PORT=3001
   WHATSAPP_SERVER_URL=http://localhost:3001
   DEBUG=false
   VERBOSE=false
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

## Usage

### Starting the Server

```bash
# Production
npm start

# Development (with auto-restart)
npm run dev

# With PM2 (recommended for production)
npm install -g pm2
pm2 start whatsapp-server.js --name whatsapp-server
```

### Authentication

1. Start the server
2. Scan the QR code that appears in the terminal with WhatsApp
3. The server will automatically connect and be ready to send messages

### API Endpoints

| Method | Endpoint                     | Description                |
| ------ | ---------------------------- | -------------------------- |
| `GET`  | `/health`                    | Health check               |
| `GET`  | `/whatsapp-status`           | WhatsApp connection status |
| `POST` | `/send-otp`                  | Send OTP messages          |
| `POST` | `/send-task-notification`    | Send task notifications    |
| `POST` | `/send-transaction-update`   | Send transaction updates   |
| `POST` | `/send-message`              | Send custom messages       |
| `POST` | `/send-account-verification` | Send verification updates  |

### Message Format Examples

#### OTP Message

```json
POST /send-otp
{
  "phoneNumber": "60123456789",
  "otp": "123456"
}
```

#### Task Notification

```json
POST /send-task-notification
{
  "phoneNumber": "60123456789",
  "taskTitle": "Complete Survey",
  "taskDescription": "Fill out a quick survey about our service",
  "reward": "RM5.00",
  "deadline": "2024-12-31"
}
```

#### Custom Message

Send any custom text message to a phone number.

**Endpoint:** `POST /send-message`

**Request Body:**

```json
{
	"phoneNumber": "60123456789",
	"message": "Hello! This is a custom message."
}
```

**Parameters:**

- `phoneNumber` (string, required): Phone number with country code (without +)
- `message` (string, required): The message text to send

**Success Response (200):**

```json
{
	"success": true,
	"message": "Custom message sent successfully",
	"messageId": "3EB0XXXXXXXXXXXXXXXXXX",
	"timestamp": "2024-12-31T14:30:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Missing required parameters

```json
{
	"success": false,
	"error": "Phone number and message are required"
}
```

- `500 Internal Server Error`: WhatsApp server error or message delivery failure

```json
{
	"success": false,
	"error": "Failed to send message"
}
```

**Notes:**

- Phone numbers should include country code (e.g., "60123456789" for Malaysia)
- Messages support emojis and special characters
- Message delivery is asynchronous and may take a few seconds
- Failed deliveries will be logged but won't block the response

## Configuration

The server is configured to:

- Run on configurable port (default: 3001, set via WHATSAPP_SERVER_PORT environment variable)
- Use headless Chrome for WhatsApp Web
- Automatically reconnect on disconnection
- Log all message delivery attempts
- Provide detailed error messages

## Troubleshooting

### Common Issues

1. **QR Code not appearing:**
   - Check if Chrome/Chromium is installed
   - Ensure no firewall is blocking the connection

2. **Authentication failed:**
   - Clear the `.wwebjs_auth` folder
   - Restart the server and scan QR code again

3. **Messages not sending:**
   - Check WhatsApp connection status: `GET /whatsapp-status`
   - Verify phone number format (should include country code)
   - Check server logs for error details

### Logs

The server provides detailed logging:

- ✅ Success messages
- ❌ Error messages
- 🔐 Authentication events
- 🔌 Connection status changes

## Security Notes

- This server only sends messages, it cannot receive or read messages
- All endpoints validate input data
- Phone numbers are sanitized before processing
- No message content is stored permanently

## Performance

- Optimized for high-volume message sending
- Minimal memory footprint
- Efficient error handling
- Automatic reconnection on failures
