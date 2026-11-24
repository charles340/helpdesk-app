import {
  createDb,
  databaseUrl,
  isPostgresUrl,
  MIGRATIONS_FOLDER,
  type Db,
} from './index';

/**
 * Applies pending migrations from ./drizzle to a Postgres server.
 * PGlite databases have already done this by the time createDb returns.
 */
export async function applyMigrations(db: Db, url: string) {
  if (!isPostgresUrl(url)) return;
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');
  await migrate(db as unknown as Parameters<typeof migrate>[0], {
    migrationsFolder: MIGRATIONS_FOLDER,
  });
}

/** Opens the database, brings it up to date and closes it again. */
export async function migrateDatabase(url: string = databaseUrl()) {
  const { db, close } = await createDb(url);
  try {
    await applyMigrations(db, url);
  } finally {
    await close();
  }
}
