'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FormState } from '@/lib/form-state';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from './new-ticket-form';

export function ReplyForm({
  action,
  canWriteInternal,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  canWriteInternal: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <Label htmlFor="body" className="sr-only">
        Reply
      </Label>
      <Textarea
        id="body"
        name="body"
        rows={4}
        placeholder="Write a reply…"
        aria-invalid={!!state?.fieldErrors?.body}
        required
      />
      <FieldError id="body-error" messages={state?.fieldErrors?.body} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canWriteInternal ? (
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="internal"
              className="size-4 accent-amber-600"
            />
            Internal note (hidden from the requester)
          </label>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </form>
  );
}
