import 'server-only';
import { refresh } from 'next/cache';
import { getDb, type Db } from '@/db';
import type { FormState } from '@/lib/form-state';
import { DomainError } from './errors';

/**
 * Runs a mutation from a server action, refreshes the page, and turns expected
 * errors into messages for the form. Unexpected errors still throw.
 */
export async function runMutation<T>(
  mutation: (db: Db) => Promise<T>,
  describe?: (result: T) => string | undefined,
): Promise<FormState> {
  let result: T;
  try {
    result = await mutation(await getDb());
  } catch (error) {
    if (error instanceof DomainError) return errorState(error);
    throw error;
  }
  refresh();
  return { ok: true, message: describe?.(result), submittedAt: Date.now() };
}

export function errorState(error: DomainError): FormState {
  return error.field
    ? { fieldErrors: { [error.field]: [error.message] } }
    : { error: error.message };
}
