import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { BookOpenIcon, PlusIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getDb } from '@/db';
import { timeAgo } from '@/lib/format';
import { excerpt } from '@/lib/markdown';
import { canManageKnowledgeBase } from '@/lib/permissions';
import { param } from '@/lib/search-params';
import { requireUser } from '@/lib/session';
import { listArticles } from '@/server/kb';

export const metadata: Metadata = { title: 'Knowledge base' };

export default async function KnowledgeBasePage({
  searchParams,
}: PageProps<'/kb'>) {
  const user = await requireUser();
  const editor = canManageKnowledgeBase(user);
  const q = param(await searchParams, 'q');
  const articles = await listArticles(await getDb(), user, { q });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Knowledge base
          </h1>
          <p className="text-muted-foreground text-sm">
            Fixes for common problems. Try these before filing a ticket.
          </p>
        </div>
        {editor && (
          <Link href="/kb/new" className={buttonVariants()}>
            <PlusIcon /> New article
          </Link>
        )}
      </header>

      <Form action="/kb" className="flex gap-2">
        <Input
          name="q"
          type="search"
          placeholder="Search articles"
          defaultValue={q}
          className="w-full sm:w-72"
          aria-label="Search articles"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </Form>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <BookOpenIcon className="text-muted-foreground size-8" />
          <p className="font-medium">
            {q ? `No articles match "${q}"` : 'No articles yet'}
          </p>
          <p className="text-muted-foreground text-sm">
            {editor && !q ? (
              <Link href="/kb/new" className="underline underline-offset-4">
                Write the first one
              </Link>
            ) : (
              <>
                Can&apos;t find an answer?{' '}
                <Link
                  href="/tickets/new"
                  className="underline underline-offset-4"
                >
                  File a ticket
                </Link>
                .
              </>
            )}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {articles.map((a) => (
            <li key={a.id}>
              <Link
                href={`/kb/${a.slug}`}
                className="hover:bg-muted/50 flex h-full flex-col gap-1.5 rounded-xl border p-4 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  {a.title}
                  {!a.published && <Badge variant="outline">Draft</Badge>}
                </span>
                <span className="text-muted-foreground text-sm">
                  {excerpt(a.body)}
                </span>
                <span className="text-muted-foreground mt-auto pt-1 text-xs">
                  Updated {timeAgo(a.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
