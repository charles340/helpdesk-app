import type { Role, Status } from '@/lib/constants';
import { isStaff } from './permissions';

/** Where a ticket can go next, for agents and admins. */
const STAFF_TRANSITIONS: Record<Status, readonly Status[]> = {
  new: ['open', 'pending', 'resolved', 'closed'],
  open: ['pending', 'resolved', 'closed'],
  pending: ['open', 'resolved', 'closed'],
  resolved: ['open', 'closed'],
  closed: ['open'],
};

/**
 * Requesters can only reopen a resolved ticket or confirm it by closing it,
 * or withdraw their own ticket before anyone has solved it.
 */
const REQUESTER_TRANSITIONS: Record<Status, readonly Status[]> = {
  new: ['closed'],
  open: ['closed'],
  pending: ['closed'],
  resolved: ['open', 'closed'],
  closed: [],
};

export function allowedTransitions(from: Status, role: Role): Status[] {
  const table = isStaff(role) ? STAFF_TRANSITIONS : REQUESTER_TRANSITIONS;
  return [...table[from]];
}

export function canTransition(from: Status, to: Status, role: Role): boolean {
  return allowedTransitions(from, role).includes(to);
}

/** Statuses that still need work. */
export const ACTIVE_STATUSES = [
  'new',
  'open',
  'pending',
] as const satisfies readonly Status[];

export function isActive(status: Status): boolean {
  return (ACTIVE_STATUSES as readonly Status[]).includes(status);
}

export const STATUS_LABELS: Record<Status, string> = {
  new: 'New',
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
};
