const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checked before querying, because Postgres rejects a malformed uuid with an error. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** A `%term%` pattern for ILIKE, with the user's own % and _ matched literally. */
export function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
