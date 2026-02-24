import path from 'node:path';

/**
 * Resolves the absolute filesystem path to the SQLite database.
 * Reads DATABASE_URL env var (stripping `file:` prefix), falling back to `./prisma/data/ateam.db`.
 */
export function getAbsoluteDatabasePath(): string {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') ?? './prisma/data/dev.db';
  return path.resolve(dbPath);
}

/**
 * Returns a libSQL-compatible connection URL (`file:/absolute/path`).
 */
export function getDatabaseUrl(): string {
  return `file:${getAbsoluteDatabasePath()}`;
}
