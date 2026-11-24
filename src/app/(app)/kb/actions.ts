'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getDb } from '@/db';
import type { FormState } from '@/lib/form-state';
import { requireRole } from '@/lib/session';
import { SLUG_MAX_LENGTH } from '@/lib/slug';
import { DomainError } from '@/server/errors';
import { deleteArticle, saveArticle } from '@/server/kb';
import { errorState } from '@/server/mutation';

const articleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Give the article a title (at least 3 characters).')
    .max(120, 'Keep the title under 120 characters.'),
  slug: z
    .string()
    .trim()
    .max(
      SLUG_MAX_LENGTH,
      `Keep the address under ${SLUG_MAX_LENGTH} characters.`,
    )
    .optional(),
  body: z
    .string()
    .trim()
    .min(10, 'Write the article first.')
    .max(20_000, 'Keep articles under 20,000 characters.'),
  published: z.literal('on').optional(),
});

/** `articleId` is null for a new article. */
export async function saveArticleAction(
  articleId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireRole('agent', 'admin');
  const parsed = articleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  let slug: string;
  try {
    const article = await saveArticle(await getDb(), user, articleId, {
      ...parsed.data,
      published: parsed.data.published === 'on',
    });
    slug = article.slug;
  } catch (error) {
    if (error instanceof DomainError) return errorState(error);
    throw error;
  }
  redirect(`/kb/${slug}`);
}

// Used with useActionState, which also passes the previous state. It isn't needed here.
export async function deleteArticleAction(
  articleId: string,
): Promise<FormState> {
  const user = await requireRole('agent', 'admin');
  try {
    await deleteArticle(await getDb(), user, articleId);
  } catch (error) {
    if (error instanceof DomainError) return errorState(error);
    throw error;
  }
  redirect('/kb');
}
