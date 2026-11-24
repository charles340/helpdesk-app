import 'server-only';
import {
  and,
  asc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { Db } from '@/db';
import {
  comments,
  ticketEvents,
  tickets,
  user,
  type Category,
  type Priority,
  type Status,
} from '@/db/schema';
import {
  canComment,
  canManageTickets,
  canSeeInternalNotes,
  canViewTicket,
  isStaff,
  type Actor,
} from '@/lib/permissions';
import { slaDueAt } from '@/lib/sla';
import { ACTIVE_STATUSES, canTransition } from '@/lib/ticket-workflow';
import { DomainError } from './errors';
import { containsPattern, isUuid } from './sql';

export type { Actor };

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type DbOrTx = Db | Tx;

export class TicketError extends DomainError {}

export const PAGE_SIZE = 20;

// ---------- Reads ----------

export type TicketFilters = {
  status?: Status | 'active';
  priority?: Priority;
  /** 'me', 'unassigned', or a user id. Staff only. */
  assignee?: string;
  q?: string;
  page?: number;
};

export async function listTickets(
  db: Db,
  actor: Actor,
  filters: TicketFilters = {},
) {
  const where: SQL[] = [];

  // Requesters only ever see their own tickets, whatever the filters say.
  if (!isStaff(actor.role)) where.push(eq(tickets.requesterId, actor.id));

  if (filters.status === 'active') {
    where.push(inArray(tickets.status, ACTIVE_STATUSES));
  } else if (filters.status) {
    where.push(eq(tickets.status, filters.status));
  }
  if (filters.priority) where.push(eq(tickets.priority, filters.priority));

  if (isStaff(actor.role) && filters.assignee) {
    if (filters.assignee === 'unassigned')
      where.push(isNull(tickets.assigneeId));
    else
      where.push(
        eq(
          tickets.assigneeId,
          filters.assignee === 'me' ? actor.id : filters.assignee,
        ),
      );
  }

  const q = filters.q?.trim();
  if (q) {
    const number = Number(q.replace(/^hd-?/i, ''));
    const pattern = containsPattern(q);
    const match = or(
      ilike(tickets.title, pattern),
      ilike(tickets.description, pattern),
      Number.isInteger(number) && number > 0
        ? eq(tickets.number, number)
        : undefined,
    );
    if (match) where.push(match);
  }

  const condition = where.length ? and(...where) : undefined;
  const page = Math.max(1, filters.page ?? 1);

  const [rows, total] = await Promise.all([
    db.query.tickets.findMany({
      where: condition,
      with: {
        requester: { columns: { id: true, name: true } },
        assignee: { columns: { id: true, name: true } },
      },
      orderBy: [
        // Urgent first, then oldest deadline first.
        sql`case ${tickets.priority} when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end`,
        asc(tickets.slaDueAt),
      ],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.$count(tickets, condition),
  ]);

  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Returns null when the ticket doesn't exist or the actor can't see it. */
export async function getTicket(db: Db, actor: Actor, id: string) {
  if (!isUuid(id)) return null;

  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, id),
    with: {
      requester: { columns: { id: true, name: true, email: true } },
      assignee: { columns: { id: true, name: true } },
      comments: {
        // Filtered in the query, so internal notes never leave the database
        // for requesters.
        where: canSeeInternalNotes(actor)
          ? undefined
          : eq(comments.internal, false),
        with: { author: { columns: { id: true, name: true, role: true } } },
        orderBy: asc(comments.createdAt),
      },
      events: {
        with: { actor: { columns: { id: true, name: true } } },
        orderBy: asc(ticketEvents.createdAt),
      },
    },
  });

  if (!ticket || !canViewTicket(actor, ticket)) return null;
  return ticket;
}

export async function listStaff(db: Db) {
  return db.query.user.findMany({
    where: inArray(user.role, ['agent', 'admin']),
    columns: { id: true, name: true },
    orderBy: asc(user.name),
  });
}

// ---------- Writes ----------

export async function createTicket(
  db: Db,
  actor: Actor,
  input: {
    title: string;
    description: string;
    priority: Priority;
    category: Category;
  },
  now: Date = new Date(),
) {
  return db.transaction(async (tx) => {
    const [ticket] = await tx
      .insert(tickets)
      .values({
        ...input,
        requesterId: actor.id,
        createdAt: now,
        slaDueAt: slaDueAt(input.priority, now),
      })
      .returning();
    await logEvent(tx, ticket.id, actor.id, 'created', { to: 'new' });
    return ticket;
  });
}

export async function addComment(
  db: Db,
  actor: Actor,
  ticketId: string,
  input: { body: string; internal: boolean },
  now: Date = new Date(),
) {
  return db.transaction(async (tx) => {
    const ticket = await loadForUpdate(tx, actor, ticketId);
    if (!canComment(actor, ticket)) {
      throw new TicketError('forbidden', 'This ticket is closed.');
    }
    if (input.internal && !canSeeInternalNotes(actor)) {
      throw new TicketError('forbidden', 'Only staff can add internal notes.');
    }

    const [comment] = await tx
      .insert(comments)
      .values({ ticketId, authorId: actor.id, ...input, createdAt: now })
      .returning();

    const staff = isStaff(actor.role);
    const changes: Partial<typeof tickets.$inferInsert> = {};

    // First public staff reply counts as the first response.
    if (staff && !input.internal && !ticket.firstResponseAt) {
      changes.firstResponseAt = now;
    }

    // Replies move the ticket along: a staff reply opens a new ticket, and a
    // requester reply wakes up a ticket that was waiting on them.
    let nextStatus: Status | null = null;
    if (staff && !input.internal && ticket.status === 'new')
      nextStatus = 'open';
    if (!staff && ticket.status === 'pending') nextStatus = 'open';
    if (nextStatus) {
      changes.status = nextStatus;
      await logEvent(tx, ticketId, actor.id, 'status', {
        from: ticket.status,
        to: nextStatus,
      });
    }

    if (Object.keys(changes).length) {
      await tx.update(tickets).set(changes).where(eq(tickets.id, ticketId));
    }
    return comment;
  });
}

export async function changeStatus(
  db: Db,
  actor: Actor,
  ticketId: string,
  to: Status,
  now: Date = new Date(),
) {
  return db.transaction(async (tx) => {
    const ticket = await loadForUpdate(tx, actor, ticketId);
    if (ticket.status === to) return;
    if (!canTransition(ticket.status, to, actor.role)) {
      throw new TicketError(
        'invalid',
        `Can't move a ${ticket.status} ticket to ${to}.`,
      );
    }

    const done = to === 'resolved' || to === 'closed';
    await tx
      .update(tickets)
      .set({
        status: to,
        // Keep the first resolution time when closing a resolved ticket.
        resolvedAt: done ? (ticket.resolvedAt ?? now) : null,
      })
      .where(eq(tickets.id, ticketId));
    await logEvent(tx, ticketId, actor.id, 'status', {
      from: ticket.status,
      to,
    });
  });
}

export async function assignTicket(
  db: Db,
  actor: Actor,
  ticketId: string,
  assigneeId: string | null,
) {
  if (!canManageTickets(actor)) {
    throw new TicketError('forbidden', 'Only staff can assign tickets.');
  }
  return db.transaction(async (tx) => {
    const ticket = await loadForUpdate(tx, actor, ticketId);
    if (ticket.assigneeId === assigneeId) return;

    let assigneeName: string | null = null;
    if (assigneeId) {
      const assignee = await tx.query.user.findFirst({
        where: eq(user.id, assigneeId),
        columns: { name: true, role: true },
      });
      if (!assignee || !isStaff(assignee.role)) {
        throw new TicketError('invalid', 'Tickets can only go to staff.');
      }
      assigneeName = assignee.name;
    }

    const previous = ticket.assigneeId
      ? await tx.query.user.findFirst({
          where: eq(user.id, ticket.assigneeId),
          columns: { name: true },
        })
      : null;

    await tx
      .update(tickets)
      .set({ assigneeId })
      .where(eq(tickets.id, ticketId));
    await logEvent(tx, ticketId, actor.id, 'assignee', {
      from: previous?.name ?? null,
      to: assigneeName,
    });
  });
}

export async function changePriority(
  db: Db,
  actor: Actor,
  ticketId: string,
  priority: Priority,
) {
  if (!canManageTickets(actor)) {
    throw new TicketError('forbidden', 'Only staff can change priority.');
  }
  return db.transaction(async (tx) => {
    const ticket = await loadForUpdate(tx, actor, ticketId);
    if (ticket.priority === priority) return;
    await tx
      .update(tickets)
      .set({ priority, slaDueAt: slaDueAt(priority, ticket.createdAt) })
      .where(eq(tickets.id, ticketId));
    await logEvent(tx, ticketId, actor.id, 'priority', {
      from: ticket.priority,
      to: priority,
    });
  });
}

// ---------- Helpers ----------

async function loadForUpdate(tx: Tx, actor: Actor, ticketId: string) {
  if (!isUuid(ticketId))
    throw new TicketError('not_found', 'Ticket not found.');
  const [ticket] = await tx
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .for('update');
  // Same error for "missing" and "not yours", so ids can't be probed.
  if (!ticket || !canViewTicket(actor, ticket)) {
    throw new TicketError('not_found', 'Ticket not found.');
  }
  return ticket;
}

async function logEvent(
  tx: DbOrTx,
  ticketId: string,
  actorId: string,
  type: (typeof ticketEvents.$inferInsert)['type'],
  data: { from?: string | null; to?: string | null },
) {
  await tx.insert(ticketEvents).values({ ticketId, actorId, type, data });
}
