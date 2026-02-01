# =============================================================================
# Octup Sales Dashboard - Production Dockerfile
# =============================================================================
# Multi-stage build for React frontend + Express backend
# Optimized for Google Cloud Run deployment
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build React Frontend
# -----------------------------------------------------------------------------
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files for frontend
COPY package.json ./

# Install frontend dependencies (use npm install for flexibility)
RUN npm install

# Copy frontend source code
COPY public/ ./public/
COPY src/ ./src/
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Set production API URL (relative path since same server)
ENV REACT_APP_API_URL=/api
ENV REACT_APP_DATA_SOURCE=api

# Build the React app
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production Server
# -----------------------------------------------------------------------------
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy server package files
COPY server/package.json ./server/

# Install server dependencies only
WORKDIR /app/server
RUN npm install --omit=dev

# Copy server source code
COPY server/ ./

# Copy built React app from frontend-builder stage
COPY --from=frontend-builder /app/build ../build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# The following environment variables should be set at runtime:
# - BIGQUERY_PROJECT_ID
# - BIGQUERY_DATASET
# - HUBSPOT_PORTAL_ID
# - GOOGLE_APPLICATION_CREDENTIALS (if using service account file)

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start server with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
