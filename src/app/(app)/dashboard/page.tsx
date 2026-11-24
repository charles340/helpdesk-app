import type { Metadata } from 'next';
import Link from 'next/link';
import { ClockAlertIcon, SirenIcon } from 'lucide-react';
import { BarList } from '@/components/dashboard/bar-list';
import { ColumnChart } from '@/components/dashboard/column-chart';
import { StatTile } from '@/components/dashboard/stat-tile';
import { PriorityBadge, SlaLabel } from '@/components/ticket-badges';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDb } from '@/db';
import { formatDuration, ticketNumber } from '@/lib/format';
import { requireRole } from '@/lib/session';
import { CHART_DAYS, getDashboard } from '@/server/dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireRole('agent', 'admin');
  const { queue, byPriority, workload, month, openedPerDay } =
    await getDashboard(await getDb(), user);

  const inTimeShare = month.resolved
    ? `${Math.round((month.resolvedInTime / month.resolved) * 100)}%`
    : null;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          The queue right now, and how the last 30 days went.
        </p>
      </header>

      <section aria-labelledby="now-heading" className="flex flex-col gap-3">
        <h2 id="now-heading" className="text-sm font-medium">
          Right now
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile
            label="Active tickets"
            value={queue.active}
            href="/tickets?status=active"
          />
          <StatTile
            label="Unassigned"
            value={queue.unassigned}
            href="/tickets?status=active&assignee=unassigned"
          />
          <StatTile
            label="Assigned to you"
            value={queue.mine}
            href="/tickets?status=active&assignee=me"
          />
          <StatTile
            label="Past SLA"
            value={queue.breached}
            icon={SirenIcon}
            tone={queue.breached ? 'critical' : undefined}
            href="#attention"
          />
          <StatTile
            label="At risk"
            value={queue.atRisk}
            icon={ClockAlertIcon}
            tone={queue.atRisk ? 'warning' : undefined}
            note="Less than a quarter of the time left"
            href="#attention"
          />
        </div>
      </section>

      <section aria-labelledby="month-heading" className="flex flex-col gap-3">
        <h2 id="month-heading" className="text-sm font-medium">
          Last 30 days
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Resolved within SLA"
            value={inTimeShare}
            note={
              month.resolved
                ? `${month.resolvedInTime} of ${month.resolved} resolved tickets`
                : undefined
            }
          />
          <StatTile
            label="Median first response"
            value={
              month.medianFirstResponseSeconds === null
                ? null
                : formatDuration(month.medianFirstResponseSeconds)
            }
            note={
              month.responded
                ? `From ${month.responded} tickets with a reply`
                : undefined
            }
          />
          <StatTile label="Tickets opened" value={month.opened} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          aria-labelledby="opened-heading"
          className="flex flex-col gap-4 rounded-xl border p-4"
        >
          <div>
            <h2 id="opened-heading" className="font-medium">
              Tickets opened per day
            </h2>
            <p className="text-muted-foreground text-sm">
              Last {CHART_DAYS} days
            </p>
          </div>
          <ColumnChart
            data={openedPerDay}
            label="Tickets opened per day"
            unit={['ticket', 'tickets']}
          />
          <details className="text-sm">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer">
              Show as a table
            </summary>
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openedPerDay.map((d) => (
                  <TableRow key={d.key}>
                    <TableCell>{d.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
        </section>

        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="priority-heading"
            className="flex flex-col gap-4 rounded-xl border p-4"
          >
            <h2 id="priority-heading" className="font-medium">
              Active tickets by priority
            </h2>
            <BarList items={byPriority} label="Active tickets by priority" />
          </section>

          <section
            aria-labelledby="workload-heading"
            className="flex flex-col gap-4 rounded-xl border p-4"
          >
            <h2 id="workload-heading" className="font-medium">
              Active tickets per agent
            </h2>
            <BarList
              items={[
                ...workload,
                { label: 'Unassigned', value: queue.unassigned, muted: true },
              ]}
              label="Active tickets per agent"
            />
          </section>
        </div>
      </div>

      <section
        id="attention"
        aria-labelledby="attention-heading"
        className="flex scroll-mt-6 flex-col gap-3"
      >
        <div>
          <h2 id="attention-heading" className="font-medium">
            Needs attention
          </h2>
          <p className="text-muted-foreground text-sm">
            Active tickets past their SLA or close to it, most overdue first.
          </p>
        </div>

        {queue.attention.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            Every active ticket is on track.
          </p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Ticket</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.attention.map((t) => (
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
                      <PriorityBadge priority={t.priority} />
                    </TableCell>
                    <TableCell
                      className={t.assignee ? '' : 'text-muted-foreground'}
                    >
                      {t.assignee?.name ?? 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <SlaLabel ticket={t} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
