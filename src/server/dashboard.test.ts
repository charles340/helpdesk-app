import { describe, expect, it } from 'vitest';
import { addUser, setupTestDb } from '@/test/db';
import { CHART_DAYS, getDashboard } from './dashboard';
import {
  addComment,
  assignTicket,
  changeStatus,
  createTicket,
} from './tickets';

const t = setupTestDb();
const HOUR = 60 * 60 * 1000;
// 10:00 in Zagreb.
const now = new Date('2026-11-24T09:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * HOUR);

const input = {
  title: 'Outlook asks for a password',
  description: 'Every time I open it.',
  category: 'software' as const,
};

describe('getDashboard', () => {
  it('is for staff only', async () => {
    const requester = await addUser(t.db, 'user');
    await expect(getDashboard(t.db, requester, now)).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('summarizes the queue and the last 30 days', async () => {
    const agent = await addUser(t.db, 'agent', 'Ana');
    const requester = await addUser(t.db, 'user');

    // Resolved within its 24h window, after a reply 2 hours in.
    const onTime = await createTicket(
      t.db,
      requester,
      { ...input, priority: 'normal' },
      hoursAgo(48),
    );
    await addComment(
      t.db,
      agent,
      onTime.id,
      { body: 'On it.', internal: false },
      hoursAgo(46),
    );
    await changeStatus(t.db, agent, onTime.id, 'resolved', hoursAgo(40));

    // Resolved after its 4h window, after a reply 4 hours in.
    const late = await createTicket(
      t.db,
      requester,
      { ...input, priority: 'urgent' },
      hoursAgo(30),
    );
    await addComment(
      t.db,
      agent,
      late.id,
      { body: 'Looking.', internal: false },
      hoursAgo(26),
    );
    await changeStatus(t.db, agent, late.id, 'resolved', hoursAgo(20));

    // Still open: one past its deadline and assigned, one fresh and unassigned.
    const overdue = await createTicket(
      t.db,
      requester,
      { ...input, priority: 'high' },
      hoursAgo(10),
    );
    await assignTicket(t.db, agent, overdue.id, agent.id);
    await createTicket(
      t.db,
      requester,
      { ...input, priority: 'low' },
      hoursAgo(1),
    );

    const d = await getDashboard(t.db, agent, now);

    expect(d.queue).toMatchObject({
      active: 2,
      unassigned: 1,
      mine: 1,
      breached: 1,
      atRisk: 0,
    });
    expect(d.queue.attention.map((x) => x.id)).toEqual([overdue.id]);
    expect(d.byPriority.map((p) => p.value)).toEqual([1, 0, 1, 0]);
    expect(d.workload).toEqual([{ label: 'Ana (you)', value: 1 }]);

    expect(d.month).toEqual({
      opened: 4,
      resolved: 2,
      resolvedInTime: 1,
      responded: 2,
      medianFirstResponseSeconds: 3 * 3600,
    });

    expect(d.openedPerDay).toHaveLength(CHART_DAYS);
    expect(d.openedPerDay.at(-1)).toMatchObject({
      key: '2026-11-24',
      value: 2,
    });
    expect(d.openedPerDay.at(-2)).toMatchObject({
      key: '2026-11-23',
      value: 1,
    });
    expect(d.openedPerDay.at(-3)).toMatchObject({
      key: '2026-11-22',
      value: 1,
    });
    expect(d.openedPerDay.reduce((sum, p) => sum + p.value, 0)).toBe(4);
  });

  it('reports no data instead of zero when nothing was answered', async () => {
    const agent = await addUser(t.db, 'agent');
    const d = await getDashboard(t.db, agent, now);
    expect(d.month.medianFirstResponseSeconds).toBeNull();
    expect(d.openedPerDay.every((p) => p.value === 0)).toBe(true);
  });
});
