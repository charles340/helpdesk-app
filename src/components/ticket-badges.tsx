import { Badge } from '@/components/ui/badge';
import type { Priority, Status } from '@/lib/constants';
import { capitalize } from '@/lib/format';
import { formatSlaRemaining, slaState, type SlaState } from '@/lib/sla';
import { STATUS_LABELS } from '@/lib/ticket-workflow';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<Status, string> = {
  new: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  open: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  resolved:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  closed: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  urgent: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400',
  high: 'border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-400',
  normal: '',
  low: 'text-muted-foreground',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={PRIORITY_STYLES[priority]}>
      {capitalize(priority)}
    </Badge>
  );
}

const SLA_STYLES: Record<SlaState, string> = {
  on_track: 'text-muted-foreground',
  at_risk: 'text-amber-700 dark:text-amber-400 font-medium',
  breached: 'text-red-700 dark:text-red-400 font-medium',
  met: 'text-emerald-700 dark:text-emerald-400',
  missed: 'text-red-700 dark:text-red-400',
};

export function SlaLabel({
  ticket,
  className,
}: {
  ticket: Parameters<typeof slaState>[0];
  className?: string;
}) {
  const state = slaState(ticket);
  const text =
    state === 'met'
      ? 'SLA met'
      : state === 'missed'
        ? 'SLA missed'
        : formatSlaRemaining(ticket.slaDueAt);
  return (
    <span className={cn('text-xs', SLA_STYLES[state], className)}>{text}</span>
  );
}
