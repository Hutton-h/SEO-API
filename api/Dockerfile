# =============================================================================
# Crane SEO Platform - API Server Dockerfile
# Multi-stage build for Node.js 20 Alpine
# =============================================================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm install --no-audit --no-fund --prefer-offline

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Prune devDependencies
RUN npm prune --omit=dev

# --- Stage 2: Production ---
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Install runtime dependencies (none needed beyond what Node provides)
RUN apk add --no-cache tini curl

# Copy built artifacts and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Health check (uses shell form to expand API_PORT env var)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${API_PORT:-8080}/health || exit 1

# Use tini as init
ENTRYPOINT ["/sbin/tini", "--"]

# Expose API port
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]