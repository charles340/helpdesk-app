import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, LockIcon } from 'lucide-react';
import {
  PriorityBadge,
  SlaLabel,
  StatusBadge,
} from '@/components/ticket-badges';
import { SelectField, StatusButtons } from '@/components/tickets/field-forms';
import { ReplyForm } from '@/components/tickets/reply-form';
import { Separator } from '@/components/ui/separator';
import { getDb } from '@/db';
import { PRIORITIES } from '@/lib/constants';
import {
  capitalize,
  formatDateTime,
  ticketNumber,
  timeAgo,
} from '@/lib/format';
import { canComment, canSeeInternalNotes, isStaff } from '@/lib/permissions';
import { requireUser } from '@/lib/session';
import { SLA_TARGET_HOURS } from '@/lib/sla';
import { allowedTransitions, STATUS_LABELS } from '@/lib/ticket-workflow';
import { cn } from '@/lib/utils';
import { getTicket, listStaff } from '@/server/tickets';
import {
  addCommentAction,
  assignAction,
  changePriorityAction,
  changeStatusAction,
} from '../actions';

export const metadata: Metadata = { title: 'Ticket' };

const REQUESTER_LABELS: Partial<Record<string, string>> = {
  open: 'Reopen ticket',
  closed: 'Close ticket',
};

export default async function TicketPage({ params }: PageProps<'/tickets/[id]'>) {
  const { id } = await params;
  const user = await requireUser();
  const db = await getDb();
  const ticket = await getTicket(db, user, id);
  // Same page for "doesn't exist" and "not yours".
  if (!ticket) notFound();

  const staff = isStaff(user.role);
  const agents = staff ? await listStaff(db) : [];
  const transitions = allowedTransitions(ticket.status, user.role);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/tickets"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> All tickets
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">
            {ticketNumber(ticket.number)}
          </span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <SlaLabel ticket={ticket} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{ticket.title}</h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="flex flex-col gap-4" aria-label="Conversation">
          <Message
            author={ticket.requester.name}
            label="Requester"
            date={ticket.createdAt}
            body={ticket.description}
          />
          {ticket.comments.map((c) => (
            <Message
              key={c.id}
              author={c.author.name}
              label={isStaff(c.author.role) ? 'Support' : 'Requester'}
              date={c.createdAt}
              body={c.body}
              internal={c.internal}
            />
          ))}

          {canComment(user, ticket) ? (
            <ReplyForm
              action={addCommentAction.bind(null, ticket.id)}
              canWriteInternal={canSeeInternalNotes(user)}
            />
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              This ticket is closed.{' '}
              {transitions.includes('open') && 'Reopen it to reply.'}
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          {staff ? (
            <div className="flex flex-col gap-4 rounded-xl border p-4">
              <SelectField
                action={changeStatusAction.bind(null, ticket.id)}
                name="status"
                label="Status"
                value={ticket.status}
                options={[ticket.status, ...transitions].map((s) => ({
                  value: s,
                  label: STATUS_LABELS[s],
                }))}
              />
              <SelectField
                action={changePriorityAction.bind(null, ticket.id)}
                name="priority"
                label="Priority"
                value={ticket.priority}
                options={PRIORITIES.map((p) => ({
                  value: p,
                  label: `${capitalize(p)} (${SLA_TARGET_HOURS[p]}h)`,
                }))}
              />
              <SelectField
                action={assignAction.bind(null, ticket.id)}
                name="assigneeId"
                label="Assignee"
                value={ticket.assigneeId ?? ''}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...agents.map((a) => ({
                    value: a.id,
                    label: a.id === user.id ? `${a.name} (me)` : a.name,
                  })),
                ]}
              />
            </div>
          ) : (
            <StatusButtons
              action={changeStatusAction.bind(null, ticket.id)}
              options={transitions.map((s) => ({
                value: s,
                label: REQUESTER_LABELS[s] ?? STATUS_LABELS[s],
              }))}
            />
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Requester</dt>
            <dd>{ticket.requester.name}</dd>
            {!staff && (
              <>
                <dt className="text-muted-foreground">Assignee</dt>
                <dd>{ticket.assignee?.name ?? 'Not assigned yet'}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Category</dt>
            <dd>{capitalize(ticket.category)}</dd>
            <dt className="text-muted-foreground">Opened</dt>
            <dd>{formatDateTime(ticket.createdAt)}</dd>
            <dt className="text-muted-foreground">Due</dt>
            <dd>{formatDateTime(ticket.slaDueAt)}</dd>
            <dt className="text-muted-foreground">First reply</dt>
            <dd>
              {ticket.firstResponseAt
                ? formatDateTime(ticket.firstResponseAt)
                : 'Waiting'}
            </dd>
            {ticket.resolvedAt && (
              <>
                <dt className="text-muted-foreground">Resolved</dt>
                <dd>{formatDateTime(ticket.resolvedAt)}</dd>
              </>
            )}
          </dl>

          <Separator />

          <section aria-label="Activity" className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Activity</h2>
            <ol className="flex flex-col gap-2 text-xs text-muted-foreground">
              {ticket.events.map((e) => (
                <li key={e.id}>
                  <span className="text-foreground">{e.actor?.name ?? 'Someone'}</span>{' '}
                  {describeEvent(e.type, e.data)}{' '}
                  <time dateTime={e.createdAt.toISOString()} title={formatDateTime(e.createdAt)}>
                    {timeAgo(e.createdAt)}
                  </time>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Message({
  author,
  label,
  date,
  body,
  internal = false,
}: {
  author: string;
  label: string;
  date: Date;
  body: string;
  internal?: boolean;
}) {
  return (
    <article
      className={cn(
        'rounded-xl border p-4',
        internal &&
          'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
      )}
    >
      <header className="mb-2 flex flex-wrap items-center gap-x-2 text-sm">
        <span className="font-medium">{author}</span>
        <span className="text-muted-foreground">{label}</span>
        {internal && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <LockIcon className="size-3" /> Internal note
          </span>
        )}
        <time
          dateTime={date.toISOString()}
          className="ml-auto text-xs text-muted-foreground"
        >
          {formatDateTime(date)}
        </time>
      </header>
      <p className="text-sm whitespace-pre-wrap">{body}</p>
    </article>
  );
}

function describeEvent(
  type: string,
  data: { from?: string | null; to?: string | null } | null,
): string {
  switch (type) {
    case 'created':
      return 'opened the ticket';
    case 'status':
      return `changed status to ${STATUS_LABELS[data?.to as keyof typeof STATUS_LABELS] ?? data?.to}`;
    case 'priority':
      return `changed priority from ${data?.from} to ${data?.to}`;
    case 'assignee':
      return data?.to ? `assigned it to ${data.to}` : 'unassigned it';
    default:
      return type;
  }
}
