/**
 * Next.js calls this once when the server starts, before it handles requests.
 * With MIGRATE_ON_START=true (the Docker image sets it) the database is
 * migrated here, so a new deployment never serves pages against an old schema.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.MIGRATE_ON_START !== 'true') return;

  const { migrateDatabase } = await import('./db/migrate');
  await migrateDatabase();
  console.log('Database migrations applied.');
}
