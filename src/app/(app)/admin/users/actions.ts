'use server';

import { z } from 'zod';
import { ROLES } from '@/lib/constants';
import type { FormState } from '@/lib/form-state';
import { requireRole } from '@/lib/session';
import { runMutation } from '@/server/mutation';
import { changeRole } from '@/server/users';

export async function changeRoleAction(
  userId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireRole('admin');
  const role = z.enum(ROLES).safeParse(formData.get('role'));
  if (!role.success) return { error: 'Pick a valid role.' };

  return runMutation(
    (db) => changeRole(db, admin, userId, role.data),
    ({ unassigned }) =>
      unassigned
        ? `${unassigned} active ${unassigned === 1 ? 'ticket' : 'tickets'} went back to the unassigned queue.`
        : undefined,
  );
}
