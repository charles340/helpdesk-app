import { describe, expect, it } from 'vitest';
import { addUser, setupTestDb } from '@/test/db';
import {
  addComment,
  assignTicket,
  changePriority,
  changeStatus,
  createTicket,
  getTicket,
  listTickets,
  TicketError,
} from './tickets';

const t = setupTestDb();
const HOUR = 60 * 60 * 1000;
const now = new Date('2026-11-24T08:00:00Z');

async function setup() {
  const requester = await addUser(t.db, 'user', 'Luka');
  const other = await addUser(t.db, 'user', 'Petra');
  const agent = await addUser(t.db, 'agent', 'Ana');
  const ticket = await createTicket(
    t.db,
    requester,
    {
      title: 'VPN drops',
      description: 'The VPN drops every 10 minutes.',
      priority: 'high',
      category: 'network',
    },
    now,
  );
  return { requester, other, agent, ticket };
}

describe('createTicket', () => {
  it('sets the SLA deadline from the priority and logs the event', async () => {
    const { requester, ticket } = await setup();
    expect(ticket.status).toBe('new');
    expect(ticket.slaDueAt).toEqual(new Date(now.getTime() + 8 * HOUR));

    const full = await getTicket(t.db, requester, ticket.id);
    expect(full?.events.map((e) => e.type)).toEqual(['created']);
  });
});

describe('visibility', () => {
  it("hides other people's tickets from requesters", async () => {
    const { other, agent, ticket } = await setup();
    expect(await getTicket(t.db, other, ticket.id)).toBeNull();
    expect(await getTicket(t.db, agent, ticket.id)).not.toBeNull();

    expect((await listTickets(t.db, other)).total).toBe(0);
    expect((await listTickets(t.db, agent)).total).toBe(1);
  });

  it('treats a malformed id as not found', async () => {
    const { agent } = await setup();
    expect(await getTicket(t.db, agent, 'not-a-uuid')).toBeNull();
    await expect(
      changeStatus(t.db, agent, 'not-a-uuid', 'open'),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('never returns internal notes to the requester', async () => {
    const { requester, agent, ticket } = await setup();
    await addComment(t.db, agent, ticket.id, {
      body: 'Driver issue again.',
      internal: true,
    });
    await addComment(t.db, agent, ticket.id, {
      body: 'Looking into it.',
      internal: false,
    });

    const forRequester = await getTicket(t.db, requester, ticket.id);
    expect(forRequester?.comments.map((c) => c.body)).toEqual([
      'Looking into it.',
    ]);
    const forAgent = await getTicket(t.db, agent, ticket.id);
    expect(forAgent?.comments).toHaveLength(2);
  });

  it('refuses internal notes from requesters', async () => {
    const { requester, ticket } = await setup();
    await expect(
      addComment(t.db, requester, ticket.id, {
        body: 'Secret',
        internal: true,
      }),
    ).rejects.toBeInstanceOf(TicketError);
  });
});

describe('replies move the ticket along', () => {
  it('opens a new ticket and records the first response on a public staff reply', async () => {
    const { agent, ticket } = await setup();
    const replyAt = new Date(now.getTime() + HOUR);
    await addComment(
      t.db,
      agent,
      ticket.id,
      { body: 'On it.', internal: false },
      replyAt,
    );

    const full = await getTicket(t.db, agent, ticket.id);
    expect(full?.status).toBe('open');
    expect(full?.firstResponseAt).toEqual(replyAt);
  });

  it('does not count an internal note as a response', async () => {
    const { agent, ticket } = await setup();
    await addComment(t.db, agent, ticket.id, { body: 'Note', internal: true });
    const full = await getTicket(t.db, agent, ticket.id);
    expect(full?.status).toBe('new');
    expect(full?.firstResponseAt).toBeNull();
  });

  it('reopens a pending ticket when the requester answers', async () => {
    const { requester, agent, ticket } = await setup();
    await changeStatus(t.db, agent, ticket.id, 'pending');
    await addComment(t.db, requester, ticket.id, {
      body: 'Here is the log.',
      internal: false,
    });
    expect((await getTicket(t.db, agent, ticket.id))?.status).toBe('open');
  });

  it('blocks replies on a closed ticket', async () => {
    const { requester, ticket } = await setup();
    await changeStatus(t.db, requester, ticket.id, 'closed');
    await expect(
      addComment(t.db, requester, ticket.id, {
        body: 'Hello?',
        internal: false,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('changeStatus', () => {
  it('rejects moves the role may not make', async () => {
    const { requester, ticket } = await setup();
    await expect(
      changeStatus(t.db, requester, ticket.id, 'resolved'),
    ).rejects.toMatchObject({ code: 'invalid' });
  });

  it('keeps the first resolution time when a resolved ticket is closed', async () => {
    const { requester, agent, ticket } = await setup();
    const resolvedAt = new Date(now.getTime() + 2 * HOUR);
    await changeStatus(t.db, agent, ticket.id, 'resolved', resolvedAt);
    await changeStatus(
      t.db,
      requester,
      ticket.id,
      'closed',
      new Date(now.getTime() + 5 * HOUR),
    );
    expect((await getTicket(t.db, agent, ticket.id))?.resolvedAt).toEqual(
      resolvedAt,
    );
  });
});

describe('staff-only changes', () => {
  it('assigns only to staff', async () => {
    const { other, agent, ticket } = await setup();
    await expect(
      assignTicket(t.db, agent, ticket.id, other.id),
    ).rejects.toMatchObject({ code: 'invalid' });

    await assignTicket(t.db, agent, ticket.id, agent.id);
    const full = await getTicket(t.db, agent, ticket.id);
    expect(full?.assignee?.name).toBe('Ana');
    expect(full?.events.at(-1)?.data).toEqual({ from: null, to: 'Ana' });
  });

  it('moves the deadline when the priority changes', async () => {
    const { agent, ticket } = await setup();
    await changePriority(t.db, agent, ticket.id, 'urgent');
    const full = await getTicket(t.db, agent, ticket.id);
    expect(full?.slaDueAt).toEqual(new Date(now.getTime() + 4 * HOUR));
  });

  it('refuses requesters', async () => {
    const { requester, ticket } = await setup();
    await expect(
      changePriority(t.db, requester, ticket.id, 'urgent'),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('listTickets search', () => {
  it('finds tickets by number and treats % literally', async () => {
    const { agent, ticket } = await setup();
    expect(
      (await listTickets(t.db, agent, { q: `HD-${ticket.number}` })).total,
    ).toBe(1);
    expect((await listTickets(t.db, agent, { q: 'vpn' })).total).toBe(1);
    expect((await listTickets(t.db, agent, { q: '%' })).total).toBe(0);
  });
});
