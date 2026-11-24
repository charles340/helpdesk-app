import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { createDb, type Db } from '@/db';
import { user } from '@/db/schema';
import type { Role } from '@/lib/constants';

/**
 * Gives the test file its own in-memory Postgres (PGlite) with every
 * migration applied, emptied before each test.
 */
export function setupTestDb() {
  let handle: Awaited<ReturnType<typeof createDb>>;

  beforeAll(async () => {
    handle = await createDb('memory://');
  });
  afterAll(async () => {
    await handle?.close();
  });
  beforeEach(async () => {
    // Cascades to sessions, tickets, comments and events.
    await handle.db.execute(sql`truncate table "user", kb_articles cascade`);
  });

  return {
    get db(): Db {
      return handle.db;
    },
  };
}

let counter = 0;

/** Inserts a user and returns the actor shape the server functions take. */
export async function addUser(db: Db, role: Role, name?: string) {
  const id = `test-${role}-${++counter}`;
  await db.insert(user).values({
    id,
    name: name ?? `${role} ${counter}`,
    email: `${id}@example.test`,
    role,
  });
  return { id, role };
}
