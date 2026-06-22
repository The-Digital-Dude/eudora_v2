# ──────────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

# Pin to exact pnpm version for consistency
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml* .npmrc* pnpm-workspace.yaml* ./

# Install dependencies (frozen-lockfile to guarantee exact versions)
RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────
# Stage 2: Builder
# ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN pnpm run build

# ──────────────────────────────────────────────────────────────────
# Stage 3: Runner (production image)
# ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy static assets
COPY --from=builder /app/public ./public

# Set proper permission for pre-rendered pages cache
RUN mkdir .next && chown nextjs:nodejs .next

# Leverage standalone output to run the application with minimal dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
