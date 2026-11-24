'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb } from '@/db';
import { CATEGORIES, PRIORITIES, STATUSES } from '@/lib/constants';
import type { FormState } from '@/lib/form-state';
import { requireUser } from '@/lib/session';
import { runMutation } from '@/server/mutation';
import {
  addComment,
  assignTicket,
  changePriority,
  changeStatus,
  createTicket,
} from '@/server/tickets';

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Give the ticket a short title (at least 5 characters).')
    .max(120, 'Keep the title under 120 characters.'),
  description: z
    .string()
    .trim()
    .min(10, 'Describe the problem in a sentence or two.')
    .max(5000, 'Keep the description under 5000 characters.'),
  priority: z.enum(PRIORITIES),
  category: z.enum(CATEGORIES),
});

export async function createTicketAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const ticket = await createTicket(await getDb(), user, parsed.data);
  redirect(`/tickets/${ticket.id}`);
}

const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write a reply first.')
    .max(5000, 'Keep replies under 5000 characters.'),
  internal: z.literal('on').optional(),
});

export async function addCommentAction(
  ticketId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  return runMutation((db) =>
    addComment(db, user, ticketId, {
      body: parsed.data.body,
      internal: parsed.data.internal === 'on',
    }),
  );
}

export async function changeStatusAction(
  ticketId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const status = z.enum(STATUSES).safeParse(formData.get('status'));
  if (!status.success) return { error: 'Pick a valid status.' };
  return runMutation((db) => changeStatus(db, user, ticketId, status.data));
}

export async function changePriorityAction(
  ticketId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const priority = z.enum(PRIORITIES).safeParse(formData.get('priority'));
  if (!priority.success) return { error: 'Pick a valid priority.' };
  return runMutation((db) => changePriority(db, user, ticketId, priority.data));
}

export async function assignAction(
  ticketId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const value = String(formData.get('assigneeId') ?? '');
  const assigneeId = value === 'me' ? user.id : value || null;
  return runMutation((db) => assignTicket(db, user, ticketId, assigneeId));
}
