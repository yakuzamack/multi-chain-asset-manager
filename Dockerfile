FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install Python and other build dependencies
RUN apk add --no-cache python3 make g++ gcc

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public directory exists
RUN mkdir -p public

# Next.js collects anonymous telemetry data about usage - disable it
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permissions
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

# Ensure public directory exists
RUN mkdir -p public

# Copy built files - handle both standalone and non-standalone output formats
COPY --from=builder /app/public ./public
# Copy standalone output if it exists, otherwise copy the entire .next directory
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

USER nextjs

EXPOSE 3000

ENV PORT=3000

# Start the application - use correct start command based on output format
CMD ["npm", "start"] 