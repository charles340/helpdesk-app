# Deskline

An IT helpdesk for a small team. Requesters file tickets and follow the replies. Agents work a shared queue with SLA deadlines, internal notes and a knowledge base. Admins manage who is an agent.

Built with Next.js 16 (App Router, Cache Components), Drizzle ORM, Better Auth and Tailwind CSS. The database is Postgres, or PGlite (Postgres compiled to WebAssembly) when you don't have a server.

## Run it locally

You need [Bun](https://bun.sh) 1.4. No database install is needed.

```bash
bun install
cp .env.example .env    # then set BETTER_AUTH_SECRET, e.g. openssl rand -base64 32
bun run db:seed         # demo users, ~30 tickets and a few articles
bun dev
```

Open http://localhost:3000. Every demo account uses the password `deskline-demo`:

| Role      | Email             |
| --------- | ----------------- |
| Requester | luka@example.com  |
| Agent     | ana@example.com   |
| Admin     | admin@example.com |

With `DATABASE_URL` empty, data lives in `./.pglite` and the schema is migrated the first time the app opens it. PGlite allows one process at a time, so stop `bun dev` before running `bun run db:seed`.

## Roles

- Requesters see and reply to their own tickets. They can close a ticket, or reopen one that was resolved.
- Agents see every ticket, change status, priority and assignee, write internal notes, see the dashboard and edit the knowledge base.
- Admins can do everything agents can, and change other people's roles on the Users page. Moving an agent back to requester puts their active tickets back in the unassigned queue.

Pages check the role on the server. `src/proxy.ts` only sends visitors without a session cookie to the sign-in page.

## Database

Set `DATABASE_URL` to a `postgres://` URL to use a Postgres server instead of PGlite. `docker compose up db` starts one, reachable at `postgres://deskline:deskline@localhost:5432/deskline`.

After changing `src/db/schema.ts`:

```bash
bun run db:generate   # writes a new migration to ./drizzle
bun run db:migrate    # applies it to a Postgres server
```

PGlite databases pick up new migrations on their own.

## Tests

```bash
bun run test            # unit and database tests (Vitest, in-memory PGlite)
bun run test:e2e        # browser tests (Playwright)
```

The browser tests build the app, seed a separate database in `./.pglite-e2e` and start it on port 3100, so they don't touch your dev data. Run `bun run test:e2e:install` once to download Chromium.

Other checks: `bun run typecheck`, `bun run lint` and `bun run format:check`.

## Docker

```bash
docker compose --profile app up --build
```

This starts Postgres and the app on port 3000. The image runs the standalone Next.js server on Node and applies migrations when it starts (`MIGRATE_ON_START=true`). Set a real `BETTER_AUTH_SECRET` before using it anywhere but your own machine.

## Where things are

| Path             | What it holds                                                        |
| ---------------- | -------------------------------------------------------------------- |
| `src/app/(app)`  | Signed-in pages: tickets, dashboard, knowledge base, users           |
| `src/app/(auth)` | Sign-in and sign-up                                                  |
| `src/server`     | Reads and writes for each area, with permission checks, plus tests   |
| `src/lib`        | Code shared with the browser: SLA rules, status workflow, formatting |
| `src/db`         | Schema, connection and migrations helper                             |
| `scripts`        | `migrate.ts` and `seed.ts`                                           |
| `e2e`            | Playwright tests                                                     |

SLA targets per priority are in `src/lib/sla.ts`. Dates are shown in the `Europe/Zagreb` time zone, set in `src/lib/format.ts`.
