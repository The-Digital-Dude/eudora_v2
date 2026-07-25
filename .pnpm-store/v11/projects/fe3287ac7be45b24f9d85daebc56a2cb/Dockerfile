# ──────────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

# Pin to exact pnpm version used locally to ensure consistent behaviour
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy manifest files. The lockfile pins the resolved tree to match local dev
# exactly — pnpm-workspace.yaml's auditConfig.minimumReleaseAge: 0 already
# disables the supply-chain check that an earlier version of this file worked
# around by omitting the lockfile (which caused an unpinned resolve where
# Prisma's config loader couldn't reach the `dotenv` transitive dependency).
COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./

# 1. Install without running any lifecycle scripts (avoids ERR_PNPM_IGNORED_BUILDS)
# 2. Then explicitly rebuild only the packages that need their scripts
RUN pnpm install --frozen-lockfile --ignore-scripts \
    && pnpm rebuild @prisma/engines prisma unrs-resolver

# ──────────────────────────────────────────────────────────────────
# Stage 2: Builder
# ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `prisma generate` only needs DATABASE_URL to resolve prisma.config.ts — it
# doesn't connect to a database. The real value is supplied at runtime via
# env_file in docker-compose.yml.
ENV DATABASE_URL="postgresql://postgres:postgres@postgres:5432/eudora_db"

# Generate Prisma client
RUN pnpm prisma generate

# Build the NestJS application
RUN pnpm build

# ──────────────────────────────────────────────────────────────────
# Stage 3: Runner (production image)
# ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

WORKDIR /app

# Copy only what is needed at runtime
COPY --from=builder --chown=nestjs:nodejs /app/dist            ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules    ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma          ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nestjs:nodejs /app/package.json    ./package.json

# LocalStorageService creates this at boot — must exist and be writable by
# the non-root user before USER switches away from root.
RUN mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads

USER nestjs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run DB migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
