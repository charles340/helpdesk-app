'use client';

import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MarkdownBody } from '@/components/markdown';
import { FieldError } from '@/components/tickets/new-ticket-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/lib/form-state';

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function ArticleForm({
  action,
  article,
}: {
  action: Action;
  /** Missing for a new article. */
  article?: { title: string; slug: string; body: string; published: boolean };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [body, setBody] = useState(article?.body ?? '');
  const errors = state?.fieldErrors;

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          defaultValue={article?.title}
          placeholder="e.g. Connecting to the VPN"
          aria-invalid={!!errors?.title}
          aria-describedby={errors?.title ? 'title-error' : undefined}
          required
        />
        <FieldError id="title-error" messages={errors?.title} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Address</Label>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-sm">/kb/</span>
          <Input
            id="slug"
            name="slug"
            defaultValue={article?.slug}
            placeholder="made from the title if left empty"
            aria-invalid={!!errors?.slug}
            aria-describedby={
              errors?.slug ? 'slug-error' : article ? 'slug-hint' : undefined
            }
          />
        </div>
        {errors?.slug ? (
          <FieldError id="slug-error" messages={errors.slug} />
        ) : (
          article && (
            <p id="slug-hint" className="text-muted-foreground text-xs">
              Changing it breaks links to the old address.
            </p>
          )
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="body">Article</Label>
        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          {/* Stays mounted so the text is submitted from either tab. */}
          <TabsContent value="write" keepMounted>
            <Textarea
              id="body"
              name="body"
              rows={16}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="font-mono text-sm"
              aria-invalid={!!errors?.body}
              aria-describedby={errors?.body ? 'body-error' : 'body-hint'}
              required
            />
          </TabsContent>
          <TabsContent
            value="preview"
            className="min-h-48 rounded-lg border p-4"
          >
            {body.trim() ? (
              <MarkdownBody>{body}</MarkdownBody>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nothing to preview yet.
              </p>
            )}
          </TabsContent>
        </Tabs>
        {errors?.body ? (
          <FieldError id="body-error" messages={errors.body} />
        ) : (
          <p id="body-hint" className="text-muted-foreground text-xs">
            Markdown: ## for headings, - for lists, **bold**, [link text](url).
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="published"
          defaultChecked={article?.published ?? true}
          className="size-4"
        />
        Published (requesters can read it)
      </label>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : article ? 'Save changes' : 'Create article'}
        </Button>
      </div>
    </form>
  );
}

export function DeleteArticleButton({
  action,
}: {
  action: (state: FormState) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm('Delete this article? This cannot be undone.')) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? 'Deleting…' : 'Delete article'}
      </Button>
    </form>
  );
}
