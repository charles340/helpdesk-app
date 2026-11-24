import 'server-only';
import { and, asc, count, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { ticketEvents, tickets, user } from '@/db/schema';
import type { Role } from '@/lib/constants';
import { canManageUsers, isStaff, type Actor } from '@/lib/permissions';
import { ACTIVE_STATUSES } from '@/lib/ticket-workflow';
import { DomainError } from './errors';
import { containsPattern } from './sql';

export const USER_LIST_LIMIT = 100;

/** Admins first, then agents, then requesters, each by name. */
export async function listUsers(
  db: Db,
  actor: Actor,
  filters: { q?: string } = {},
) {
  requireAdmin(actor);
  const q = filters.q?.trim();
  const where = q
    ? or(
        ilike(user.name, containsPattern(q)),
        ilike(user.email, containsPattern(q)),
      )
    : undefined;

  const filed = db
    .select({ userId: tickets.requesterId, total: count().as('filed_total') })
    .from(tickets)
    .groupBy(tickets.requesterId)
    .as('filed');
  const assigned = db
    .select({ userId: tickets.assigneeId, total: count().as('assigned_total') })
    .from(tickets)
    .where(inArray(tickets.status, ACTIVE_STATUSES))
    .groupBy(tickets.assigneeId)
    .as('assigned');

  const [rows, total] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        filed: sql<number>`coalesce(${filed.total}, 0)`.mapWith(Number),
        activeAssigned: sql<number>`coalesce(${assigned.total}, 0)`.mapWith(
          Number,
        ),
      })
      .from(user)
      .leftJoin(filed, eq(filed.userId, user.id))
      .leftJoin(assigned, eq(assigned.userId, user.id))
      .where(where)
      .orderBy(
        sql`case ${user.role} when 'admin' then 0 when 'agent' then 1 else 2 end`,
        asc(user.name),
      )
      .limit(USER_LIST_LIMIT),
    db.$count(user, where),
  ]);

  return { rows, total };
}

/**
 * Changes someone's role. A requester can't hold tickets, so demoting an
 * agent or admin sends their active tickets back to the unassigned queue.
 */
export async function changeRole(
  db: Db,
  actor: Actor,
  userId: string,
  role: Role,
) {
  requireAdmin(actor);
  // Also means there is always at least one admin left.
  if (userId === actor.id) {
    throw new DomainError(
      'invalid',
      "You can't change your own role. Ask another admin.",
    );
  }

  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: user.id, name: user.name, role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .for('update');
    if (!target) throw new DomainError('not_found', 'User not found.');
    if (target.role === role) return { unassigned: 0 };

    await tx.update(user).set({ role }).where(eq(user.id, userId));

    if (!isStaff(target.role) || isStaff(role)) return { unassigned: 0 };

    const released = await tx
      .update(tickets)
      .set({ assigneeId: null })
      .where(
        and(
          eq(tickets.assigneeId, userId),
          inArray(tickets.status, ACTIVE_STATUSES),
        ),
      )
      .returning({ id: tickets.id });

    if (released.length) {
      await tx.insert(ticketEvents).values(
        released.map((t) => ({
          ticketId: t.id,
          actorId: actor.id,
          type: 'assignee' as const,
          data: { from: target.name, to: null },
        })),
      );
    }
    return { unassigned: released.length };
  });
}

function requireAdmin(actor: Actor) {
  if (!canManageUsers(actor)) {
    throw new DomainError('forbidden', 'Only admins can manage users.');
  }
}
