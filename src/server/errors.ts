/**
 * An expected failure with a message that is safe to show the user.
 * Server actions turn these into form errors; anything else is a bug and throws.
 */
export class DomainError extends Error {
  constructor(
    public code: 'not_found' | 'forbidden' | 'invalid',
    message: string,
    /** The form field the message belongs to, when there is one. */
    public field?: string,
  ) {
    super(message);
  }
}
