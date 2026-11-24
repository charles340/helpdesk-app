// Plain values shared by the database schema and the browser.
// Kept out of schema.ts so client components don't bundle Drizzle.

export const ROLES = ['user', 'agent', 'admin'] as const;
export const STATUSES = [
  'new',
  'open',
  'pending',
  'resolved',
  'closed',
] as const;
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const CATEGORIES = [
  'hardware',
  'software',
  'network',
  'account',
  'other',
] as const;

export type Role = (typeof ROLES)[number];

/** In the interface a plain user is a requester. */
export const ROLE_LABELS: Record<Role, string> = {
  user: 'Requester',
  agent: 'Agent',
  admin: 'Admin',
};
export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Category = (typeof CATEGORIES)[number];
