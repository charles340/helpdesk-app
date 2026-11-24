/**
 * Applies migrations in ./drizzle.
 * PGlite databases also migrate themselves on first use, and the Docker image
 * migrates on start (MIGRATE_ON_START). Use this for other Postgres setups,
 * such as CI or a server you deploy to by hand.
 */
import 'dotenv/config';
import { migrateDatabase } from '../src/db/migrate';

await migrateDatabase();
console.log('Migrations applied.');
