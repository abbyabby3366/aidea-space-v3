# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build SvelteKit app
RUN npm run build

# Runtime stage
FROM node:20-slim AS runner

WORKDIR /app

# Copy built assets and necessary files
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

# Install only production dependencies
# Since we use adapter-node, we need the production deps
# However, many SvelteKit templates bundle dependencies into the build.
# We'll install production dependencies just in case.
RUN npm install --omit=dev

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3181

# Expose the port
EXPOSE 3181

# Start the application
CMD ["node", "build"]
