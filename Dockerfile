# Production image with FFmpeg + libraries for Remotion's Chrome Headless Shell (Debian).
# See README → Production deployment.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libgbm-dev \
    libasound2 \
    libxrandr2 \
    libxkbcommon-dev \
    libxfixes3 \
    libxcomposite1 \
    libxdamage1 \
    libpango-1.0-0 \
    libcairo2 \
    libcups2 \
    libatk-bridge2.0-0 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Remotion's bundler compiles src/remotion/ at runtime and resolves imports
# (remotion, @remotion/google-fonts/*, etc.) that standalone doesn't trace.
# Copy the full node_modules so all packages are available for the bundler.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Download Remotion's Chrome headless shell into the final image at build time.
# The standalone output already includes @remotion/renderer in node_modules.
RUN node -e "import('@remotion/renderer').then(m=>m.ensureBrowser()).then(()=>console.log('Browser ready')).catch(e=>{console.error(e);process.exit(1)})"

EXPOSE 3000
# Railway (and others) set PORT at runtime — do not hardcode it here.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
