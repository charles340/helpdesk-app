'use client';

import { useActionState } from 'react';
import { createTicketAction } from '@/app/(app)/tickets/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/lib/form-state';
import { CATEGORIES, PRIORITIES } from '@/lib/constants';
import { capitalize } from '@/lib/format';
import { SLA_TARGET_HOURS } from '@/lib/sla';

export function NewTicketForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createTicketAction,
    undefined,
  );
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Laptop will not turn on"
          aria-invalid={!!errors?.title}
          aria-describedby={errors?.title ? 'title-error' : undefined}
          required
        />
        <FieldError id="title-error" messages={errors?.title} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <NativeSelect
            id="category"
            name="category"
            defaultValue="other"
            className="w-full"
          >
            {CATEGORIES.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {capitalize(c)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="priority">Priority</Label>
          <NativeSelect
            id="priority"
            name="priority"
            defaultValue="normal"
            className="w-full"
          >
            {PRIORITIES.map((p) => (
              <NativeSelectOption key={p} value={p}>
                {capitalize(p)} (fix within {SLA_TARGET_HOURS[p]}h)
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">What happened?</Label>
        <Textarea
          id="description"
          name="description"
          rows={7}
          placeholder="What were you doing, what did you expect, and what happened instead?"
          aria-invalid={!!errors?.description}
          aria-describedby={
            errors?.description ? 'description-error' : undefined
          }
          required
        />
        <FieldError id="description-error" messages={errors?.description} />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit ticket'}
        </Button>
      </div>
    </form>
  );
}

export function FieldError({
  id,
  messages,
}: {
  id: string;
  messages?: string[];
}) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="text-destructive text-sm">
      {messages[0]}
    </p>
  );
}
