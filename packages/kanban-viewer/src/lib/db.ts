/**
 * Prisma Client Singleton
 *
 * Ensures a single Prisma client instance is used throughout the application.
 * In development, prevents creating multiple instances during hot reloading.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// Extend globalThis to include prisma for development hot-reload handling
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create libSQL adapter with proper configuration from prisma.config.ts
 * Note: Using absolute path to avoid readonly database issues
 */
import { getDatabaseUrl } from './db-path';

const adapter = new PrismaLibSql({ url: getDatabaseUrl() });

/**
 * Prisma client singleton instance.
 * Reuses existing instance in development to prevent connection exhaustion during hot reloads.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// In development, store the client on globalThis to survive hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
