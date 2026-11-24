import { describe, expect, it } from 'vitest';
import { addUser, setupTestDb } from '@/test/db';
import { assignTicket, changeStatus, createTicket, getTicket } from './tickets';
import { changeRole, listUsers } from './users';

const t = setupTestDb();

const input = {
  title: 'Printer jams',
  description: 'Every double-sided print jams.',
  priority: 'normal' as const,
  category: 'hardware' as const,
};

describe('listUsers', () => {
  it('is for admins only', async () => {
    const agent = await addUser(t.db, 'agent');
    await expect(listUsers(t.db, agent)).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('orders by role and counts tickets', async () => {
    const admin = await addUser(t.db, 'admin', 'Zora');
    const agent = await addUser(t.db, 'agent', 'Ana');
    const requester = await addUser(t.db, 'user', 'Bruno');
    const ticket = await createTicket(t.db, requester, input);
    await createTicket(t.db, requester, input);
    await assignTicket(t.db, admin, ticket.id, agent.id);

    const { rows, total } = await listUsers(t.db, admin);
    expect(total).toBe(3);
    expect(rows.map((r) => [r.name, r.filed, r.activeAssigned])).toEqual([
      ['Zora', 0, 0],
      ['Ana', 0, 1],
      ['Bruno', 2, 0],
    ]);
    expect((await listUsers(t.db, admin, { q: 'brun' })).rows).toHaveLength(1);
  });
});

describe('changeRole', () => {
  it("doesn't let admins change their own role", async () => {
    const admin = await addUser(t.db, 'admin');
    await expect(
      changeRole(t.db, admin, admin.id, 'user'),
    ).rejects.toMatchObject({
      code: 'invalid',
    });
  });

  it('is for admins only', async () => {
    const agent = await addUser(t.db, 'agent');
    const requester = await addUser(t.db, 'user');
    await expect(
      changeRole(t.db, agent, requester.id, 'agent'),
    ).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it("sends a demoted agent's active tickets back to the queue", async () => {
    const admin = await addUser(t.db, 'admin', 'Admin');
    const agent = await addUser(t.db, 'agent', 'Ana');
    const requester = await addUser(t.db, 'user');
    const active = await createTicket(t.db, requester, input);
    const done = await createTicket(t.db, requester, input);
    await assignTicket(t.db, admin, active.id, agent.id);
    await assignTicket(t.db, admin, done.id, agent.id);
    await changeStatus(t.db, admin, done.id, 'resolved');

    expect(await changeRole(t.db, admin, agent.id, 'user')).toEqual({
      unassigned: 1,
    });

    const activeNow = await getTicket(t.db, admin, active.id);
    expect(activeNow?.assigneeId).toBeNull();
    expect(activeNow?.events.at(-1)).toMatchObject({
      type: 'assignee',
      data: { from: 'Ana', to: null },
    });
    // Finished tickets keep who worked on them.
    expect((await getTicket(t.db, admin, done.id))?.assigneeId).toBe(agent.id);
  });

  it('leaves tickets alone when promoting or moving between staff roles', async () => {
    const admin = await addUser(t.db, 'admin');
    const agent = await addUser(t.db, 'agent');
    const requester = await addUser(t.db, 'user');
    const ticket = await createTicket(t.db, requester, input);
    await assignTicket(t.db, admin, ticket.id, agent.id);

    expect(await changeRole(t.db, admin, agent.id, 'admin')).toEqual({
      unassigned: 0,
    });
    expect(await changeRole(t.db, admin, requester.id, 'agent')).toEqual({
      unassigned: 0,
    });
    expect((await getTicket(t.db, admin, ticket.id))?.assigneeId).toBe(
      agent.id,
    );
  });
});
