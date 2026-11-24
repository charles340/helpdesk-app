import 'server-only';
import { and, asc, eq, ilike, ne, or, type SQL } from 'drizzle-orm';
import type { Db } from '@/db';
import { kbArticles } from '@/db/schema';
import { canManageKnowledgeBase, type Actor } from '@/lib/permissions';
import { slugify } from '@/lib/slug';
import { DomainError } from './errors';
import { containsPattern, isUuid } from './sql';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export class KbError extends DomainError {}

/** Addresses used by pages under /kb, so no article can take them. */
const RESERVED_SLUGS = new Set(['new']);

// ---------- Reads ----------

/** Requesters only see published articles. Staff also see drafts. */
export async function listArticles(
  db: Db,
  actor: Actor,
  filters: { q?: string } = {},
) {
  const where: SQL[] = [];
  if (!canManageKnowledgeBase(actor))
    where.push(eq(kbArticles.published, true));

  const q = filters.q?.trim();
  if (q) {
    const pattern = containsPattern(q);
    where.push(
      or(ilike(kbArticles.title, pattern), ilike(kbArticles.body, pattern))!,
    );
  }

  return db.query.kbArticles.findMany({
    where: where.length ? and(...where) : undefined,
    columns: {
      id: true,
      title: true,
      slug: true,
      body: true,
      published: true,
      updatedAt: true,
    },
    orderBy: asc(kbArticles.title),
  });
}

/** Returns null when the article doesn't exist or is a draft the actor can't see. */
export async function getArticle(db: Db, actor: Actor, slug: string) {
  const article = await db.query.kbArticles.findFirst({
    where: eq(kbArticles.slug, slug),
    with: { author: { columns: { name: true } } },
  });
  if (!article) return null;
  if (!article.published && !canManageKnowledgeBase(actor)) return null;
  return article;
}

// ---------- Writes ----------

export type ArticleInput = {
  title: string;
  /** Leave empty to make one from the title. */
  slug?: string;
  body: string;
  published: boolean;
};

/** Creates an article when `id` is null, otherwise updates that article. */
export async function saveArticle(
  db: Db,
  actor: Actor,
  id: string | null,
  input: ArticleInput,
) {
  requireEditor(actor);
  if (id !== null && !isUuid(id)) {
    throw new KbError('not_found', 'Article not found.');
  }

  return db.transaction(async (tx) => {
    const slug = await pickSlug(tx, id, input);
    const values = {
      title: input.title,
      slug,
      body: input.body,
      published: input.published,
    };

    if (id) {
      const [article] = await tx
        .update(kbArticles)
        .set(values)
        .where(eq(kbArticles.id, id))
        .returning();
      if (!article) throw new KbError('not_found', 'Article not found.');
      return article;
    }

    const [article] = await tx
      .insert(kbArticles)
      .values({ ...values, authorId: actor.id })
      .returning();
    return article;
  });
}

export async function deleteArticle(db: Db, actor: Actor, id: string) {
  requireEditor(actor);
  const deleted = isUuid(id)
    ? await db
        .delete(kbArticles)
        .where(eq(kbArticles.id, id))
        .returning({ id: kbArticles.id })
    : [];
  if (!deleted.length) throw new KbError('not_found', 'Article not found.');
}

// ---------- Helpers ----------

function requireEditor(actor: Actor) {
  if (!canManageKnowledgeBase(actor)) {
    throw new KbError('forbidden', 'Only staff can edit the knowledge base.');
  }
}

/**
 * A slug typed by the editor must be free. One made from the title gets a
 * number added until it is, so two articles can share a title.
 */
async function pickSlug(tx: Tx, id: string | null, input: ArticleInput) {
  const typed = input.slug?.trim();
  const base = slugify(typed || input.title);
  if (!base) {
    throw new KbError(
      'invalid',
      'Use at least one letter or number.',
      typed ? 'slug' : 'title',
    );
  }

  if (typed) {
    if (RESERVED_SLUGS.has(base)) {
      throw new KbError(
        'invalid',
        `/kb/${base} is reserved. Pick another address.`,
        'slug',
      );
    }
    if (await slugTaken(tx, base, id)) {
      throw new KbError(
        'invalid',
        `Another article already uses /kb/${base}.`,
        'slug',
      );
    }
    return base;
  }

  let slug = base;
  for (let n = 2; await slugTaken(tx, slug, id); n++) slug = `${base}-${n}`;
  return slug;
}

async function slugTaken(tx: Tx, slug: string, exceptId: string | null) {
  if (RESERVED_SLUGS.has(slug)) return true;
  const match = await tx.query.kbArticles.findFirst({
    where: exceptId
      ? and(eq(kbArticles.slug, slug), ne(kbArticles.id, exceptId))
      : eq(kbArticles.slug, slug),
    columns: { id: true },
  });
  return !!match;
}
