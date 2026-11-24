// Letters that don't break down into a base letter plus an accent.
const SPECIAL: Record<string, string> = {
  đ: 'd',
  ł: 'l',
  ø: 'o',
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
};

export const SLUG_MAX_LENGTH = 80;

/** "Kako spojiti VPN?" -> "kako-spojiti-vpn" */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[đłøßæœ]/g, (c) => SPECIAL[c])
      .normalize('NFKD')
      // Drop the accents NFKD split off: "č" becomes "c" + U+030C.
      .replace(/\p{M}+/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+/, '')
      .slice(0, SLUG_MAX_LENGTH)
      .replace(/-+$/, '')
  );
}
