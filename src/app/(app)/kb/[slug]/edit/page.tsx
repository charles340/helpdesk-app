import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { ArticleForm, DeleteArticleButton } from '@/components/kb/article-form';
import { Separator } from '@/components/ui/separator';
import { getDb } from '@/db';
import { requireRole } from '@/lib/session';
import { getArticle } from '@/server/kb';
import { deleteArticleAction, saveArticleAction } from '../../actions';

export const metadata: Metadata = { title: 'Edit article' };

export default async function EditArticlePage({
  params,
}: PageProps<'/kb/[slug]/edit'>) {
  const { slug } = await params;
  const user = await requireRole('agent', 'admin');
  const article = await getArticle(await getDb(), user, slug);
  if (!article) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/kb/${article.slug}`}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" /> Back to the article
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Edit article</h1>

      <ArticleForm
        action={saveArticleAction.bind(null, article.id)}
        article={article}
      />

      <Separator className="max-w-3xl" />

      <div className="flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Deleting removes the article for everyone.
        </p>
        <DeleteArticleButton
          action={deleteArticleAction.bind(null, article.id)}
        />
      </div>
    </div>
  );
}
