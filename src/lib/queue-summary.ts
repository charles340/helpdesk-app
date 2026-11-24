import { PRIORITIES, type Priority, type Status } from './constants';
import { slaState } from './sla';
import { isActive } from './ticket-workflow';

export type QueueTicket = {
  id: string;
  number: number;
  title: string;
  status: Status;
  priority: Priority;
  createdAt: Date;
  slaDueAt: Date;
  resolvedAt: Date | null;
  assigneeId: string | null;
};

export type AttentionTicket<T extends QueueTicket> = T & {
  sla: 'breached' | 'at_risk';
};

/** Counts for the dashboard, from the tickets that still need work. */
export function summarizeQueue<T extends QueueTicket>(
  tickets: T[],
  viewerId: string,
  now: Date = new Date(),
  attentionLimit = 10,
) {
  const byPriority = Object.fromEntries(
    PRIORITIES.map((p) => [p, 0]),
  ) as Record<Priority, number>;
  const byAssignee: Record<string, number> = {};
  const attention: AttentionTicket<T>[] = [];
  let active = 0;
  let unassigned = 0;
  let mine = 0;
  let breached = 0;
  let atRisk = 0;

  for (const ticket of tickets) {
    if (!isActive(ticket.status)) continue;
    active++;
    byPriority[ticket.priority]++;

    if (!ticket.assigneeId) unassigned++;
    else {
      byAssignee[ticket.assigneeId] = (byAssignee[ticket.assigneeId] ?? 0) + 1;
      if (ticket.assigneeId === viewerId) mine++;
    }

    const sla = slaState(ticket, now);
    if (sla === 'breached') breached++;
    if (sla === 'at_risk') atRisk++;
    if (sla === 'breached' || sla === 'at_risk')
      attention.push({ ...ticket, sla });
  }

  // Most overdue first.
  attention.sort((a, b) => a.slaDueAt.getTime() - b.slaDueAt.getTime());

  return {
    active,
    unassigned,
    mine,
    breached,
    atRisk,
    byPriority,
    byAssignee,
    attention: attention.slice(0, attentionLimit),
  };
}
