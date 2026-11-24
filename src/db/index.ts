import path from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

/**
 * Works with both drivers: a real Postgres server (postgres://...) in
 * production and CI, or PGlite (Postgres compiled to WebAssembly, running in
 * this process) for local development and tests. No database install needed.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DbHandle = { db: Db; close: () => Promise<void> };

export const MIGRATIONS_FOLDER = path.join(process.cwd(), 'drizzle');

export function isPostgresUrl(url: string): boolean {
  return /^postgres(ql)?:\/\//.test(url);
}

/**
 * DATABASE_URL can be:
 * - `postgres://user:pass@host:5432/db` for a Postgres server
 * - `memory://` for a throwaway in-memory PGlite database (tests)
 * - a folder path such as `.pglite` for PGlite stored on disk (default)
 */
export async function createDb(url: string): Promise<DbHandle> {
  if (isPostgresUrl(url)) {
    const { default: postgres } = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const client = postgres(url, { max: 10 });
    const db = drizzle(client, { schema }) as unknown as Db;
    return { db, close: () => client.end() };
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const client = url === 'memory://' ? new PGlite() : new PGlite(url);
  const db = drizzle(client, { schema });
  // Local databases migrate themselves, so `bun dev` works on a fresh clone.
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db: db as unknown as Db, close: () => client.close() };
}

export function databaseUrl(): string {
  return process.env.DATABASE_URL || '.pglite';
}

// One shared connection per server process, kept across hot reloads in dev.
const globalForDb = globalThis as unknown as { dbHandle?: Promise<DbHandle> };

/** Opened on first use, so `next build` never touches the database. */
export async function getDb(): Promise<Db> {
  globalForDb.dbHandle ??= createDb(databaseUrl());
  return (await globalForDb.dbHandle).db;
}
