/**
 * Resets the database to demo data: one admin, two agents, three requesters,
 * about 30 tickets from the last two weeks, and a few knowledge-base articles.
 *
 * Stop `bun dev` first when using PGlite: only one process can open it.
 */
import 'dotenv/config';
import { hashPassword } from 'better-auth/crypto';
import { createDb, databaseUrl, isPostgresUrl } from '../src/db';
import { applyMigrations } from '../src/db/migrate';
import {
  account,
  comments,
  kbArticles,
  ticketEvents,
  tickets,
  user,
  type Category,
  type Priority,
  type Role,
  type Status,
} from '../src/db/schema';
import { slaDueAt } from '../src/lib/sla';

export const DEMO_PASSWORD = 'deskline-demo';

const HOUR = 60 * 60 * 1000;
const now = Date.now();

const people: { id: string; name: string; email: string; role: Role }[] = [
  { id: 'u-admin', name: 'Admin', email: 'admin@example.com', role: 'admin' },
  { id: 'u-ana', name: 'Ana Horvat', email: 'ana@example.com', role: 'agent' },
  {
    id: 'u-marko',
    name: 'Marko Kovač',
    email: 'marko@example.com',
    role: 'agent',
  },
  { id: 'u-luka', name: 'Luka Novak', email: 'luka@example.com', role: 'user' },
  {
    id: 'u-petra',
    name: 'Petra Marić',
    email: 'petra@example.com',
    role: 'user',
  },
  {
    id: 'u-tomo',
    name: 'Tomislav Jurić',
    email: 'tomo@example.com',
    role: 'user',
  },
];

const requesters = ['u-luka', 'u-petra', 'u-tomo'];
const agents = ['u-ana', 'u-marko'];

const ticketTemplates: {
  title: string;
  description: string;
  category: Category;
  priority: Priority;
}[] = [
  {
    title: 'Laptop will not turn on',
    description:
      'My laptop shows a black screen after the power button. The charging light is on.',
    category: 'hardware',
    priority: 'high',
  },
  {
    title: 'Cannot connect to office Wi-Fi',
    description:
      'Wi-Fi says "connected, no internet" on the 2nd floor since this morning.',
    category: 'network',
    priority: 'high',
  },
  {
    title: 'Password reset for email',
    description:
      'I forgot my email password and I am locked out after 5 attempts.',
    category: 'account',
    priority: 'urgent',
  },
  {
    title: 'Printer on 3rd floor jams',
    description:
      'The HP printer near the kitchen jams on every double-sided print.',
    category: 'hardware',
    priority: 'normal',
  },
  {
    title: 'Install Visual Studio Code',
    description:
      'Please install VS Code on my workstation, I do not have admin rights.',
    category: 'software',
    priority: 'low',
  },
  {
    title: 'VPN disconnects every 10 minutes',
    description: 'Working from home, the VPN drops roughly every 10 minutes.',
    category: 'network',
    priority: 'high',
  },
  {
    title: 'Outlook keeps asking for password',
    description: 'Outlook prompts for my password every time I open it.',
    category: 'software',
    priority: 'normal',
  },
  {
    title: 'New employee account',
    description:
      'We have a new colleague starting Monday and need an account and a laptop.',
    category: 'account',
    priority: 'normal',
  },
  {
    title: 'Second monitor not detected',
    description:
      'The docking station does not detect my second monitor anymore.',
    category: 'hardware',
    priority: 'normal',
  },
  {
    title: 'Shared drive is very slow',
    description: 'Opening files from the shared drive takes over a minute.',
    category: 'network',
    priority: 'normal',
  },
  {
    title: 'Excel crashes when opening a large file',
    description:
      'Excel closes without an error when I open the monthly report.',
    category: 'software',
    priority: 'high',
  },
  {
    title: 'Request access to finance folder',
    description: 'I need read access to the finance folder for the audit.',
    category: 'account',
    priority: 'low',
  },
  {
    title: 'Keyboard keys sticking',
    description:
      'Several keys on my keyboard stick. Could I get a replacement?',
    category: 'hardware',
    priority: 'low',
  },
  {
    title: 'Teams camera not working',
    description:
      'Camera shows a black image in Teams but works in the Camera app.',
    category: 'software',
    priority: 'normal',
  },
  {
    title: 'Phishing email received',
    description:
      'I received an email asking me to confirm my bank details. I did not click anything.',
    category: 'other',
    priority: 'urgent',
  },
];

const statusPlan: Status[] = [
  'new',
  'new',
  'new',
  'new',
  'open',
  'open',
  'open',
  'open',
  'open',
  'open',
  'pending',
  'pending',
  'pending',
  'resolved',
  'resolved',
  'resolved',
  'resolved',
  'resolved',
  'resolved',
  'resolved',
  'resolved',
  'closed',
  'closed',
  'closed',
  'closed',
  'closed',
  'open',
  'new',
  'pending',
  'resolved',
];

const replies = {
  agent: [
    'Thanks for reporting this. I am looking into it now.',
    'Could you send a photo of the error message?',
    'I have applied a fix on our side. Can you try again?',
    'I will stop by your desk in about 30 minutes.',
  ],
  user: [
    'Thanks! Here is the screenshot.',
    'It works now, thank you.',
    'Still the same problem, unfortunately.',
  ],
  internal: [
    'Looks like the same driver issue as last week.',
    'Waiting on the vendor for a replacement part.',
  ],
};

const md = (...lines: string[]) => lines.join('\n');

const articles = [
  {
    title: 'Resetting your email password',
    slug: 'reset-password',
    published: true,
    body: md(
      'After 5 wrong passwords your email account locks for 15 minutes. Trying again during that time starts the 15 minutes over, so wait it out.',
      '',
      '## Reset it yourself',
      '',
      '1. Open the email sign-in page and click **Forgot password**.',
      '2. Enter your work address. The reset link goes to the personal phone number HR has on file for you.',
      "3. Choose a new password of at least 12 characters. You can't reuse any of your last 5.",
      '4. Sign in again on your phone and laptop. Both still have the old password saved and will lock you out again if you leave them.',
      '',
      'If the text with the link never arrives, file a ticket in the Account category and say which device you are locked out on.',
    ),
  },
  {
    title: 'Connecting to the VPN',
    slug: 'vpn',
    published: true,
    body: md(
      'Outside the office you need the VPN to reach the shared drive and the finance system. Email and Teams work without it.',
      '',
      "1. Open the VPN client from the system tray. If it isn't there, install it from the Company Portal app.",
      '2. Sign in with your work email.',
      '3. Pick the Office profile and click **Connect**.',
      '',
      'The tray icon turns green once you are connected.',
      '',
      '## It keeps dropping',
      '',
      'Wi-Fi is the usual cause. Plug in a network cable if you can and try again. If it still drops more than once an hour, file a ticket in the Network category and list the times it dropped.',
    ),
  },
  {
    title: 'Printer jams and error codes',
    slug: 'printer-troubleshooting',
    published: true,
    body: md(
      'Switch the printer off, wait ten seconds and switch it back on. That fixes most problems.',
      '',
      '## Paper jams',
      '',
      '- Open the back panel and pull the stuck sheet out slowly, in the direction the paper moves.',
      '- Check that the tray guides touch the stack of paper. Loose guides cause most repeat jams.',
      '- For double-sided printing, use plain 80 g paper. Thicker paper jams in the unit that flips the page.',
      "- Close every panel firmly. The printer won't start while one is open, even slightly.",
      '',
      '## Error codes',
      '',
      'Write down the code on the display before you restart. Then file a ticket in the Hardware category with the code and where the printer is, for example "3rd floor, by the kitchen".',
    ),
  },
  {
    title: 'Spotting phishing emails',
    slug: 'phishing',
    published: true,
    body: md(
      'A phishing email tries to get you to give away a password or open a harmful file. Look out for these:',
      '',
      "- The sender's name looks right but the address after the @ doesn't.",
      '- It asks for a password, bank details or gift cards.',
      '- It says something bad happens unless you act today.',
      '- Hovering over a link shows a different address than the link text.',
      "- An attachment you didn't expect, especially a .zip, .html or .exe file.",
      '',
      '## If you get one',
      '',
      "Don't click anything in it. File an urgent ticket in the Other category with the sender's address, then delete the email.",
      '',
      'Already clicked a link or typed your password? Say so in the ticket. We can lock the account before anyone uses it.',
    ),
  },
  {
    title: 'New laptop checklist',
    slug: 'new-laptop-checklist',
    // A draft, so staff can see how unpublished articles look.
    published: false,
    body: md(
      'For agents preparing a laptop for someone who starts soon.',
      '',
      '1. Enroll it in device management before anything else.',
      '2. Install the standard apps from the Company Portal.',
      '3. Sign in once as the new employee so their profile exists on the first day.',
      '4. Put the asset tag number in the ticket and on the delivery note.',
      '5. Charge it to 100% and leave it on the shelf by the IT office.',
    ),
  },
];

function pick<T>(list: T[], i: number): T {
  return list[i % list.length];
}

const url = databaseUrl();
console.log(
  `Seeding ${isPostgresUrl(url) ? 'Postgres' : `PGlite (${url})`}...`,
);
const { db, close } = await createDb(url);
await applyMigrations(db, url);

await db.transaction(async (tx) => {
  // Start clean. Cascades remove sessions, accounts, tickets and comments.
  await tx.delete(kbArticles);
  await tx.delete(user);

  const password = await hashPassword(DEMO_PASSWORD);
  const joined = new Date(now - 30 * 24 * HOUR);
  await tx
    .insert(user)
    .values(
      people.map((p) => ({
        ...p,
        emailVerified: true,
        createdAt: joined,
        updatedAt: joined,
      })),
    );
  await tx.insert(account).values(
    people.map((p) => ({
      id: `acc-${p.id}`,
      accountId: p.id,
      providerId: 'credential',
      userId: p.id,
      password,
    })),
  );

  for (let i = 0; i < statusPlan.length; i++) {
    const template = pick(ticketTemplates, i);
    const status = statusPlan[i];
    const requesterId = pick(requesters, i);
    const assigneeId = status === 'new' ? null : pick(agents, i);

    // Spread tickets over the last 14 days; new ones are the most recent.
    const ageHours =
      status === 'new' ? 1 + i * 2.5 : 6 + ((i * 37) % (14 * 24));
    const createdAt = new Date(now - ageHours * HOUR);
    const dueAt = slaDueAt(template.priority, createdAt);
    const firstResponseAt =
      status === 'new'
        ? null
        : new Date(createdAt.getTime() + (0.5 + (i % 4)) * HOUR);
    const done = status === 'resolved' || status === 'closed';
    // Most resolved tickets meet the SLA; every fourth one misses it.
    const resolvedAt = done
      ? new Date(
          i % 4 === 0
            ? dueAt.getTime() + 3 * HOUR
            : createdAt.getTime() +
                (dueAt.getTime() - createdAt.getTime()) * 0.6,
        )
      : null;

    const [ticket] = await tx
      .insert(tickets)
      .values({
        ...template,
        status,
        requesterId,
        assigneeId,
        createdAt,
        updatedAt: resolvedAt ?? firstResponseAt ?? createdAt,
        slaDueAt: dueAt,
        firstResponseAt,
        resolvedAt,
      })
      .returning();

    const events: (typeof ticketEvents.$inferInsert)[] = [
      {
        ticketId: ticket.id,
        actorId: requesterId,
        type: 'created',
        data: { to: 'new' },
        createdAt,
      },
    ];
    const thread: (typeof comments.$inferInsert)[] = [];

    if (firstResponseAt && assigneeId) {
      const agent = people.find((p) => p.id === assigneeId)!;
      events.push({
        ticketId: ticket.id,
        actorId: assigneeId,
        type: 'assignee',
        data: { from: null, to: agent.name },
        createdAt: firstResponseAt,
      });
      thread.push({
        ticketId: ticket.id,
        authorId: assigneeId,
        body: pick(replies.agent, i),
        createdAt: firstResponseAt,
      });
      events.push({
        ticketId: ticket.id,
        actorId: assigneeId,
        type: 'status',
        data: { from: 'new', to: 'open' },
        createdAt: firstResponseAt,
      });

      const later = new Date(firstResponseAt.getTime() + HOUR);
      if (i % 3 === 0) {
        thread.push({
          ticketId: ticket.id,
          authorId: assigneeId,
          body: pick(replies.internal, i),
          internal: true,
          createdAt: later,
        });
      }
      if (status === 'pending') {
        events.push({
          ticketId: ticket.id,
          actorId: assigneeId,
          type: 'status',
          data: { from: 'open', to: 'pending' },
          createdAt: later,
        });
      }
      if (resolvedAt) {
        thread.push({
          ticketId: ticket.id,
          authorId: requesterId,
          body: pick(replies.user, i),
          createdAt: new Date(resolvedAt.getTime() - HOUR / 2),
        });
        events.push({
          ticketId: ticket.id,
          actorId: assigneeId,
          type: 'status',
          data: { from: 'open', to: 'resolved' },
          createdAt: resolvedAt,
        });
        if (status === 'closed') {
          events.push({
            ticketId: ticket.id,
            actorId: requesterId,
            type: 'status',
            data: { from: 'resolved', to: 'closed' },
            createdAt: new Date(resolvedAt.getTime() + 2 * HOUR),
          });
        }
      }
    }

    await tx.insert(ticketEvents).values(events);
    if (thread.length) await tx.insert(comments).values(thread);
  }

  await tx.insert(kbArticles).values(
    articles.map((a, i) => {
      // Written over the last few weeks, edited a few days apart.
      const updatedAt = new Date(now - (2 + i * 4) * 24 * HOUR);
      return {
        ...a,
        authorId: 'u-ana',
        createdAt: new Date(updatedAt.getTime() - 7 * 24 * HOUR),
        updatedAt,
      };
    }),
  );
});

await close();

console.log(`Done. Sign in with any of these (password: ${DEMO_PASSWORD}):`);
for (const p of people) console.log(`  ${p.role.padEnd(5)}  ${p.email}`);
