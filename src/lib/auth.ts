import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getDb, type Db } from '@/db';
import * as schema from '@/db/schema';

function createAuth(db: Db) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    user: {
      additionalFields: {
        // Everyone signs up as a plain user. Only an admin can promote someone.
        role: { type: 'string', defaultValue: 'user', input: false },
      },
    },
    // On in production by default (3 sign-in attempts per 10 seconds per IP).
    // Only the end-to-end tests turn it off, because they sign in several
    // accounts from one address in quick succession.
    rateLimit: process.env.AUTH_RATE_LIMIT === 'off' ? { enabled: false } : {},
    // Must stay last so cookies set inside Server Actions reach the browser.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { auth?: Promise<Auth> };

/** Created on first use, together with the database connection. */
export function getAuth(): Promise<Auth> {
  globalForAuth.auth ??= getDb().then(createAuth);
  return globalForAuth.auth;
}
