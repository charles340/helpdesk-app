'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import type { FormState } from '@/lib/form-state';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function useResultToast(state: FormState) {
  useEffect(() => {
    if (state?.error) toast.error(state.error);
    else if (state?.message) toast.success(state.message);
  }, [state]);
}

/** A select that saves as soon as it changes. */
export function SelectField({
  action,
  name,
  label,
  value,
  options,
  id = `field-${name}`,
  hideLabel = false,
}: {
  action: Action;
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  /** Needed when several of these share a page, such as one per table row. */
  id?: string;
  hideLabel?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useResultToast(state);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'text-muted-foreground text-xs'}
      >
        {label}
      </Label>
      <NativeSelect
        // Remount when the saved value changes, so the select shows it.
        key={value}
        id={id}
        name={name}
        defaultValue={value}
        disabled={pending}
        className="w-full"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {options.map((o) => (
          <NativeSelectOption key={o.value} value={o.value}>
            {o.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {/* Lets the form work before JavaScript loads. */}
      <noscript>
        <Button type="submit" size="sm" variant="outline">
          Save
        </Button>
      </noscript>
    </form>
  );
}

/** One button per allowed status change, for requesters. */
export function StatusButtons({
  action,
  options,
}: {
  action: Action;
  options: { value: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useResultToast(state);
  if (!options.length) return null;

  return (
    <form action={formAction} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button
          key={o.value}
          type="submit"
          name="status"
          value={o.value}
          variant="outline"
          size="sm"
          disabled={pending}
        >
          {o.label}
        </Button>
      ))}
    </form>
  );
}
