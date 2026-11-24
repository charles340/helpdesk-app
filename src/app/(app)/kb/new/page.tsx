import type { Metadata } from 'next';
import { ArticleForm } from '@/components/kb/article-form';
import { requireRole } from '@/lib/session';
import { saveArticleAction } from '../actions';

export const metadata: Metadata = { title: 'New article' };

export default async function NewArticlePage() {
  await requireRole('agent', 'admin');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New article</h1>
        <p className="text-muted-foreground text-sm">
          Write a fix down once and requesters can find it themselves.
        </p>
      </header>
      <ArticleForm action={saveArticleAction.bind(null, null)} />
    </div>
  );
}
