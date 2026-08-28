# ==============================================================================
# TOTS Screen — Container Image (Bun Powered)
# ==============================================================================

FROM oven/bun:alpine

WORKDIR /app

# Install production dependencies
COPY package.json bun.lock ./
RUN bun install --production

# Copy application source code and assets
COPY bin ./bin
COPY src ./src
COPY public ./public

# Set default environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Expose default port
EXPOSE 8080

# Run TOTS Screen CLI runner
CMD ["bun", "bin/screenshare.js"]
