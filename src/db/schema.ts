import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { CATEGORIES, PRIORITIES, ROLES, STATUSES } from '../lib/constants';

export * from '../lib/constants';

export const roleEnum = pgEnum('role', ROLES);
export const statusEnum = pgEnum('ticket_status', STATUSES);
export const priorityEnum = pgEnum('ticket_priority', PRIORITIES);
export const categoryEnum = pgEnum('ticket_category', CATEGORIES);
export const eventTypeEnum = pgEnum('ticket_event_type', [
  'created',
  'status',
  'priority',
  'assignee',
]);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// --- Better Auth tables (names and columns follow its core schema) ---

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: roleEnum('role').notNull().default('user'),
  ...timestamps,
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps,
});

// --- Helpdesk tables ---

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: integer('number').notNull().generatedAlwaysAsIdentity(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    status: statusEnum('status').notNull().default('new'),
    priority: priorityEnum('priority').notNull().default('normal'),
    category: categoryEnum('category').notNull().default('other'),
    requesterId: text('requester_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    slaDueAt: timestamp('sla_due_at', { withTimezone: true }).notNull(),
    firstResponseAt: timestamp('first_response_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('tickets_requester_idx').on(t.requesterId),
    index('tickets_assignee_idx').on(t.assigneeId),
    index('tickets_status_idx').on(t.status),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    internal: boolean('internal').notNull().default(false),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('comments_ticket_idx').on(t.ticketId)],
);

export const ticketEvents = pgTable(
  'ticket_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    type: eventTypeEnum('type').notNull(),
    // e.g. { from: 'new', to: 'open' }
    data: jsonb('data').$type<{ from?: string | null; to?: string | null }>(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('ticket_events_ticket_idx').on(t.ticketId)],
);

export const kbArticles = pgTable('kb_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  body: text('body').notNull(),
  published: boolean('published').notNull().default(false),
  authorId: text('author_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  ...timestamps,
});

// --- Relations (used by db.query) ---

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  requester: one(user, {
    fields: [tickets.requesterId],
    references: [user.id],
    relationName: 'requester',
  }),
  assignee: one(user, {
    fields: [tickets.assigneeId],
    references: [user.id],
    relationName: 'assignee',
  }),
  comments: many(comments),
  events: many(ticketEvents),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [comments.ticketId],
    references: [tickets.id],
  }),
  author: one(user, { fields: [comments.authorId], references: [user.id] }),
}));

export const ticketEventsRelations = relations(ticketEvents, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketEvents.ticketId],
    references: [tickets.id],
  }),
  actor: one(user, { fields: [ticketEvents.actorId], references: [user.id] }),
}));

export const userRelations = relations(user, ({ many }) => ({
  requested: many(tickets, { relationName: 'requester' }),
  assigned: many(tickets, { relationName: 'assignee' }),
}));

export const kbArticlesRelations = relations(kbArticles, ({ one }) => ({
  author: one(user, { fields: [kbArticles.authorId], references: [user.id] }),
}));
