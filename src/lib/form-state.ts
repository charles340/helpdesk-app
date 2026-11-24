/** What a server action returns to a form that uses useActionState. */
export type FormState =
  | {
      ok?: boolean;
      error?: string;
      /** Shown as a success toast. */
      message?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      /** Changes after each success, so forms know to clear themselves. */
      submittedAt?: number;
    }
  | undefined;
