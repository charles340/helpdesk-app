import { describe, expect, it } from 'vitest';
import type { Priority, Status } from './constants';
import { summarizeQueue, type QueueTicket } from './queue-summary';
import { slaDueAt } from './sla';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-11-24T12:00:00Z');

let n = 0;
function ticket(
  ageHours: number,
  priority: Priority,
  assigneeId: string | null,
  status: Status = 'open',
): QueueTicket {
  const createdAt = new Date(now.getTime() - ageHours * HOUR);
  n++;
  return {
    id: `t${n}`,
    number: n,
    title: `Ticket ${n}`,
    status,
    priority,
    createdAt,
    slaDueAt: slaDueAt(priority, createdAt),
    resolvedAt: null,
    assigneeId,
  };
}

describe('summarizeQueue', () => {
  const tickets = [
    ticket(1, 'normal', 'ana'), // on track
    ticket(20, 'normal', 'ana'), // 4h of 24h left: at risk
    ticket(30, 'normal', null), // 6h overdue
    ticket(12, 'urgent', 'me'), // 4h target, so 8h overdue
    ticket(1, 'low', null, 'new'), // on track
    ticket(100, 'high', 'ana', 'resolved'), // finished, ignored
  ];
  const summary = summarizeQueue(tickets, 'me', now);

  it('counts only tickets that still need work', () => {
    expect(summary.active).toBe(5);
    expect(summary.byPriority).toEqual({
      low: 1,
      normal: 3,
      high: 0,
      urgent: 1,
    });
  });

  it('counts assignment', () => {
    expect(summary.unassigned).toBe(2);
    expect(summary.mine).toBe(1);
    expect(summary.byAssignee).toEqual({ ana: 2, me: 1 });
  });

  it('lists breached and at-risk tickets, most overdue first', () => {
    expect(summary.breached).toBe(2);
    expect(summary.atRisk).toBe(1);
    expect(summary.attention.map((t) => [t.number, t.sla])).toEqual([
      [4, 'breached'],
      [3, 'breached'],
      [2, 'at_risk'],
    ]);
  });

  it('limits the attention list', () => {
    expect(summarizeQueue(tickets, 'me', now, 1).attention).toHaveLength(1);
  });
});
