# syntax=docker/dockerfile:1

FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy and build the shared package first
COPY packages/shared/package.json packages/shared/tsconfig.json ./shared/
COPY packages/shared/src ./shared/src
COPY packages/shared/dist ./shared/dist

# Copy kanban-viewer package.json and rewrite workspace:* to local path
COPY packages/kanban-viewer/package.json ./package.json
RUN sed -i 's|"workspace:\*"|"file:./shared"|g' package.json

# Install dependencies (fresh install for Linux platform)
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared ./node_modules/@ai-team/shared
COPY packages/kanban-viewer/ .

# Generate Prisma client and initialize database
ENV DATABASE_URL="file:./prisma/data/ateam.db"
RUN mkdir -p prisma/data && \
    npx prisma generate && \
    npx prisma db push --url "$DATABASE_URL" && \
    npx tsx prisma/seed.ts

# Build Next.js
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma data directory with seeded database
COPY --from=builder --chown=nextjs:nodejs /app/prisma/data ./prisma/data

# Create mission directory mount point
RUN mkdir -p /app/mission && chown nextjs:nodejs /app/mission

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
