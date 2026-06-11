import path from 'node:path';
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },

  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },

  migrate: {
    // Driver adapter used for Prisma Client queries at runtime
    async adapter() {
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const connectionString = process.env.DATABASE_URL ?? '';
      return new PrismaPg({ connectionString });
    },
  },
});

