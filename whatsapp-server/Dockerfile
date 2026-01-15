FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Set environment variables
ENV NODE_ENV=production
# The app uses cross-env WHATSAPP_SERVER_PORT=3182, we can set it here too
ENV WHATSAPP_SERVER_PORT=3182

# Expose the port
EXPOSE 3182

# Start the WhatsApp server
CMD ["node", "whatsapp-server.js"]
