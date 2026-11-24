import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import type { Role } from '@/lib/constants';

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/** Reads the session once per request. Returns null when signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role: role as Role };
});

/** For pages and actions that need a signed-in user. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  return user;
}

/** For pages and actions limited to some roles. Others go back to their tickets. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect('/tickets');
  return user;
}
