import type { Priority, Status } from '@/lib/constants';

const HOUR = 60 * 60 * 1000;

/** Time to resolve, per priority. */
export const SLA_TARGET_HOURS: Record<Priority, number> = {
  urgent: 4,
  high: 8,
  normal: 24,
  low: 72,
};

/** Share of the window left when a ticket counts as "at risk". */
const AT_RISK_SHARE = 0.25;

export type SlaState = 'on_track' | 'at_risk' | 'breached' | 'met' | 'missed';

export function slaDueAt(priority: Priority, createdAt: Date): Date {
  return new Date(createdAt.getTime() + SLA_TARGET_HOURS[priority] * HOUR);
}

export function slaState(
  ticket: {
    status: Status;
    priority: Priority;
    createdAt: Date;
    slaDueAt: Date;
    resolvedAt: Date | null;
  },
  now: Date = new Date(),
): SlaState {
  const due = ticket.slaDueAt.getTime();

  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    const done = (ticket.resolvedAt ?? now).getTime();
    return done <= due ? 'met' : 'missed';
  }

  const left = due - now.getTime();
  if (left < 0) return 'breached';

  const windowMs = due - ticket.createdAt.getTime();
  return left <= windowMs * AT_RISK_SHARE ? 'at_risk' : 'on_track';
}

/** "3h 20m left" / "2h overdue" */
export function formatSlaRemaining(slaDue: Date, now: Date = new Date()): string {
  const diff = slaDue.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / HOUR);
  const minutes = Math.floor((abs % HOUR) / 60_000);
  const span =
    hours >= 24
      ? `${Math.floor(hours / 24)}d ${hours % 24}h`
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;
  return diff >= 0 ? `${span} left` : `${span} overdue`;
}
