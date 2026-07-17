# =============================================================================
# Crane SEO Platform - Crawler Service Dockerfile
# Includes Playwright browser dependencies for JavaScript rendering
# =============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --prefer-offline

# Copy TypeScript source and config
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build; exit 0

# =============================================================================
# Production stage
# =============================================================================
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S crawlergroup && \
    adduser -u 1001 -S crawleruser -G crawlergroup

# Install Playwright system dependencies
# These are required for Chromium to run in Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    tini

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund --prefer-offline

# Copy compiled output from builder
COPY --from=builder /app/dist/ ./dist/

# Set ownership (only app files, skip node_modules which is slow)
RUN chown -R crawleruser:crawlergroup /app/dist /app/package.json

# Switch to non-root user
USER crawleruser

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Use tini as init
ENTRYPOINT ["/sbin/tini", "--"]

# Default command
CMD ["node", "dist/index.js"]