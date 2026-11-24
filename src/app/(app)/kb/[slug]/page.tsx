import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, PencilIcon } from 'lucide-react';
import { MarkdownBody } from '@/components/markdown';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getDb } from '@/db';
import { formatDateTime } from '@/lib/format';
import { canManageKnowledgeBase } from '@/lib/permissions';
import { requireUser } from '@/lib/session';
import { getArticle } from '@/server/kb';

export const metadata: Metadata = { title: 'Knowledge base' };

export default async function ArticlePage({ params }: PageProps<'/kb/[slug]'>) {
  const { slug } = await params;
  const user = await requireUser();
  const article = await getArticle(await getDb(), user, slug);
  // Requesters get the same page for a draft as for a missing article.
  if (!article) notFound();

  return (
    <article className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/kb"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" /> Knowledge base
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {article.title}
          </h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {!article.published && <Badge variant="outline">Draft</Badge>}
            Updated {formatDateTime(article.updatedAt)}
            {article.author && ` by ${article.author.name}`}
          </p>
        </div>
        {canManageKnowledgeBase(user) && (
          <Link
            href={`/kb/${article.slug}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <PencilIcon /> Edit
          </Link>
        )}
      </header>

      <MarkdownBody>{article.body}</MarkdownBody>

      <Separator />

      <p className="text-muted-foreground text-sm">
        Still stuck?{' '}
        <Link
          href="/tickets/new"
          className="text-foreground underline underline-offset-4"
        >
          File a ticket
        </Link>{' '}
        and say which steps you tried.
      </p>
    </article>
  );
}
