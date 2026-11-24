/** Plain-text preview of a Markdown article, for lists and search results. */
export function excerpt(markdown: string, maxLength = 160): string {
  const text = markdown
    .split('\n')
    // Headings usually repeat the title.
    .filter((line) => !/^\s*#/.test(line))
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/\s(?:[-*+]|\d+\.)\s+/g, ' ')
    .replace(/[*_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, '')}…`;
}
