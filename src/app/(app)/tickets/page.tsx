import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { InboxIcon, PlusIcon } from 'lucide-react';
import {
  PriorityBadge,
  SlaLabel,
  StatusBadge,
} from '@/components/ticket-badges';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDb } from '@/db';
import {
  PRIORITIES,
  STATUSES,
  type Priority,
  type Status,
} from '@/lib/constants';
import { capitalize, ticketNumber, timeAgo } from '@/lib/format';
import { isStaff } from '@/lib/permissions';
import { param, type Search } from '@/lib/search-params';
import { requireUser } from '@/lib/session';
import { STATUS_LABELS } from '@/lib/ticket-workflow';
import { listStaff, listTickets, type TicketFilters } from '@/server/tickets';

export const metadata: Metadata = { title: 'Tickets' };

function parseFilters(sp: Search, staff: boolean): TicketFilters {
  const status = param(sp, 'status');
  const priority = param(sp, 'priority');
  return {
    // Agents start on what still needs work; requesters see everything they filed.
    status:
      status === 'all'
        ? undefined
        : status === 'active' || STATUSES.includes(status as Status)
          ? (status as TicketFilters['status'])
          : staff
            ? 'active'
            : undefined,
    priority: PRIORITIES.includes(priority as Priority)
      ? (priority as Priority)
      : undefined,
    assignee: param(sp, 'assignee'),
    q: param(sp, 'q'),
    page: Number(param(sp, 'page')) || 1,
  };
}

export default async function TicketsPage({
  searchParams,
}: PageProps<'/tickets'>) {
  const user = await requireUser();
  const staff = isStaff(user.role);
  const sp = await searchParams;
  const filters = parseFilters(sp, staff);

  const db = await getDb();
  const [{ rows, total, page, pageCount }, agents] = await Promise.all([
    listTickets(db, user, filters),
    staff ? listStaff(db) : Promise.resolve([]),
  ]);

  const pageHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const value = Array.isArray(v) ? v[0] : v;
      if (value && k !== 'page') next.set(k, value);
    }
    next.set('page', String(p));
    return `/tickets?${next}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {staff ? 'Ticket queue' : 'My tickets'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>
        <Link href="/tickets/new" className={buttonVariants()}>
          <PlusIcon /> New ticket
        </Link>
      </header>

      <Form action="/tickets" className="flex flex-wrap items-end gap-2">
        <Input
          name="q"
          type="search"
          placeholder="Search title, text or HD-0001"
          defaultValue={filters.q}
          className="w-full sm:w-64"
          aria-label="Search tickets"
        />
        <NativeSelect
          name="status"
          defaultValue={param(sp, 'status') ?? (staff ? 'active' : 'all')}
          aria-label="Status"
        >
          <NativeSelectOption value="all">All statuses</NativeSelectOption>
          <NativeSelectOption value="active">Active</NativeSelectOption>
          {STATUSES.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {STATUS_LABELS[s]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          name="priority"
          defaultValue={filters.priority ?? ''}
          aria-label="Priority"
        >
          <NativeSelectOption value="">All priorities</NativeSelectOption>
          {PRIORITIES.map((p) => (
            <NativeSelectOption key={p} value={p}>
              {capitalize(p)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {staff && (
          <NativeSelect
            name="assignee"
            defaultValue={filters.assignee ?? ''}
            aria-label="Assignee"
          >
            <NativeSelectOption value="">Anyone</NativeSelectOption>
            <NativeSelectOption value="me">Assigned to me</NativeSelectOption>
            <NativeSelectOption value="unassigned">
              Unassigned
            </NativeSelectOption>
            {agents.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>
                {a.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </Form>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <InboxIcon className="text-muted-foreground size-8" />
          <p className="font-medium">No tickets here</p>
          <p className="text-muted-foreground text-sm">
            {staff
              ? 'Try a different filter.'
              : 'When something breaks, file a ticket and follow it here.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Ticket</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                {staff && <TableHead>Requester</TableHead>}
                {staff && <TableHead>Assignee</TableHead>}
                <TableHead>SLA</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {ticketNumber(t.number)}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <Link
                      href={`/tickets/${t.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {t.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={t.priority} />
                  </TableCell>
                  {staff && <TableCell>{t.requester.name}</TableCell>}
                  {staff && (
                    <TableCell
                      className={t.assignee ? '' : 'text-muted-foreground'}
                    >
                      {t.assignee?.name ?? 'Unassigned'}
                    </TableCell>
                  )}
                  <TableCell>
                    <SlaLabel ticket={t} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs">
                    {timeAgo(t.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pageCount > 1 && (
        <nav
          className="flex items-center justify-between text-sm"
          aria-label="Pages"
        >
          <span className="text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Previous
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={pageHref(page + 1)}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
