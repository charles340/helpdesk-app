export type Search = Record<string, string | string[] | undefined>;

/** The first value of a search param, or undefined when it is missing or empty. */
export function param(sp: Search, key: string): string | undefined {
  const value = sp[key];
  return (Array.isArray(value) ? value[0] : value) || undefined;
}
