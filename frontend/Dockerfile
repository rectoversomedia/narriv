# ============================================
# Narriv Frontend Dockerfile
# ============================================
FROM node:22-alpine AS base

# Install dependencies for production
FROM base AS deps
RUN apk add --no-cache dumb-init ca-certificates

WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies
RUN npm ci --omit=dev

# ============================================
# Development dependencies
# ============================================
FROM base AS dev-deps
RUN apk add --no-cache dumb-init ca-certificates
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# ============================================
# Builder
# ============================================
FROM deps AS builder
WORKDIR /app

COPY frontend/ ./

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# ============================================
# Runner (Production)
# ============================================
FROM base AS runner
RUN apk add --no-cache dumb-init ca-certificates

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeapp

# Copy package files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy static files
COPY --chown=nodeapp:nodejs --chmod=755 . .

# Switch to non-root user
USER nodeapp

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start application
CMD ["dumb-init", "node_modules/next/dist/bin/next", "start"]
