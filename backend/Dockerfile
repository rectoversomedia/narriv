# ============================================
# Narriv Backend Dockerfile
# ============================================
FROM node:22-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init ca-certificates curl wget

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package.json backend/package-lock.json* ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application code
COPY backend/ ./

# Create uploads directory
RUN mkdir -p uploads/logos

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application
CMD ["dumb-init", "node", "src/index.js"]
