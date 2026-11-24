import type { Role, Status } from '@/lib/constants';

export type Actor = { id: string; role: Role };
type TicketLike = { requesterId: string; status: Status };

export function isStaff(role: Role): boolean {
  return role === 'agent' || role === 'admin';
}

export function canViewTicket(actor: Actor, ticket: TicketLike): boolean {
  return isStaff(actor.role) || ticket.requesterId === actor.id;
}

/** Internal notes are only for agents and admins. */
export function canSeeInternalNotes(actor: Actor): boolean {
  return isStaff(actor.role);
}

export function canComment(actor: Actor, ticket: TicketLike): boolean {
  return canViewTicket(actor, ticket) && ticket.status !== 'closed';
}

/** Assigning, priority changes and the agent queue are staff-only. */
export function canManageTickets(actor: Actor): boolean {
  return isStaff(actor.role);
}

export function canManageUsers(actor: Actor): boolean {
  return actor.role === 'admin';
}

export function canManageKnowledgeBase(actor: Actor): boolean {
  return isStaff(actor.role);
}
