import 'server-only';
import { and, count, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '@/db';
import { tickets } from '@/db/schema';
import { PRIORITIES } from '@/lib/constants';
import { capitalize, formatDayKey, lastDayKeys, TIME_ZONE } from '@/lib/format';
import { isStaff, type Actor } from '@/lib/permissions';
import { summarizeQueue } from '@/lib/queue-summary';
import { ACTIVE_STATUSES } from '@/lib/ticket-workflow';
import { DomainError } from './errors';
import { listStaff } from './tickets';

const DAY = 24 * 60 * 60 * 1000;
export const CHART_DAYS = 14;

export async function getDashboard(
  db: Db,
  actor: Actor,
  now: Date = new Date(),
) {
  if (!isStaff(actor.role)) {
    throw new DomainError('forbidden', 'Only staff can see the dashboard.');
  }

  const monthAgo = new Date(now.getTime() - 30 * DAY);
  const days = lastDayKeys(CHART_DAYS, now);
  // One extra day covers the time zone offset. Days outside the chart are dropped below.
  const chartStart = new Date(now.getTime() - (CHART_DAYS + 1) * DAY);
  const localDay = sql<string>`to_char(${tickets.createdAt} at time zone ${TIME_ZONE}, 'YYYY-MM-DD')`;

  const [active, staff, [resolved], [response], [opened], perDay] =
    await Promise.all([
      db.query.tickets.findMany({
        where: inArray(tickets.status, ACTIVE_STATUSES),
        columns: {
          id: true,
          number: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          slaDueAt: true,
          resolvedAt: true,
          assigneeId: true,
        },
        with: { assignee: { columns: { name: true } } },
      }),
      listStaff(db),
      db
        .select({
          total: count(),
          met: sql<number>`count(*) filter (where ${tickets.resolvedAt} <= ${tickets.slaDueAt})`.mapWith(
            Number,
          ),
        })
        .from(tickets)
        .where(gte(tickets.resolvedAt, monthAgo)),
      db
        .select({
          tickets: count(),
          medianSeconds: sql<
            number | null
          >`percentile_cont(0.5) within group (order by extract(epoch from ${tickets.firstResponseAt} - ${tickets.createdAt}))`.mapWith(
            Number,
          ),
        })
        .from(tickets)
        .where(
          and(
            gte(tickets.createdAt, monthAgo),
            isNotNull(tickets.firstResponseAt),
          ),
        ),
      db
        .select({ total: count() })
        .from(tickets)
        .where(gte(tickets.createdAt, monthAgo)),
      db
        .select({ day: localDay, total: count() })
        .from(tickets)
        .where(gte(tickets.createdAt, chartStart))
        // By position, because the time zone is a query parameter and Postgres
        // won't match two parameterized expressions as the same one.
        .groupBy(sql`1`),
    ]);

  const queue = summarizeQueue(active, actor.id, now);
  const openedByDay = new Map(perDay.map((row) => [row.day, row.total]));

  return {
    queue,
    byPriority: PRIORITIES.map((p) => ({
      label: capitalize(p),
      value: queue.byPriority[p],
    })),
    workload: staff
      .map((s) => ({
        label: s.id === actor.id ? `${s.name} (you)` : s.name,
        value: queue.byAssignee[s.id] ?? 0,
      }))
      .sort((a, b) => b.value - a.value),
    month: {
      opened: opened.total,
      resolved: resolved.total,
      resolvedInTime: resolved.met,
      responded: response.tickets,
      medianFirstResponseSeconds: response.tickets
        ? response.medianSeconds
        : null,
    },
    openedPerDay: days.map((key) => ({
      key,
      label: formatDayKey(key),
      value: openedByDay.get(key) ?? 0,
    })),
  };
}
