/**
 * Round axis ticks for whole-number counts, starting at 0, with about
 * `target` steps: max 7 gives 0, 2, 4, 6, 8.
 */
export function niceTicks(max: number, target = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(
    1,
    [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!,
  );
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}
