import { niceTicks } from '@/lib/chart';
import { cn } from '@/lib/utils';

type Point = { key: string; label: string; value: number };

/**
 * A single-series column chart drawn with plain elements. Each column shows
 * its value on hover or keyboard focus. Pair it with a table for screen readers
 * that skip the list.
 */
export function ColumnChart({
  data,
  label,
  unit,
  labelEvery = 4,
}: {
  data: Point[];
  /** Names the chart for assistive technology. */
  label: string;
  /** Singular and plural, e.g. ['ticket', 'tickets']. */
  unit: [string, string];
  /** Label every nth day on the x axis, counting back from the last one. */
  labelEvery?: number;
}) {
  const ticks = niceTicks(Math.max(0, ...data.map((d) => d.value)));
  const top = ticks[ticks.length - 1];
  const pct = (v: number) => `${(v / top) * 100}%`;
  const last = data.length - 1;

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div
          className="text-muted-foreground relative h-56 w-6 shrink-0 text-right text-xs tabular-nums"
          aria-hidden="true"
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: pct(t) }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="relative h-56 flex-1">
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden="true"
              className="absolute inset-x-0 border-t"
              style={{ bottom: pct(t) }}
            />
          ))}
          <ol
            aria-label={label}
            className="absolute inset-0 flex items-end gap-0.5"
          >
            {data.map((d, i) => (
              <li
                key={d.key}
                tabIndex={0}
                aria-label={`${d.label}: ${d.value} ${d.value === 1 ? unit[0] : unit[1]}`}
                className="group focus-visible:ring-ring/50 flex h-full flex-1 items-end justify-center rounded-sm outline-none focus-visible:ring-2"
              >
                <div
                  className="bg-viz-1 relative w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-75 group-focus-visible:opacity-75"
                  style={{ height: pct(d.value) }}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'bg-popover text-popover-foreground pointer-events-none absolute bottom-full z-10 mb-1.5 hidden rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-sm group-hover:block group-focus-visible:block',
                      // Keep the first and last tooltips inside the chart.
                      i < 2
                        ? 'left-0'
                        : i > last - 2
                          ? 'right-0'
                          : 'left-1/2 -translate-x-1/2',
                    )}
                  >
                    <span className="text-muted-foreground">{d.label}</span>{' '}
                    <span className="font-medium tabular-nums">{d.value}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div
        className="text-muted-foreground ml-8 flex gap-0.5 text-xs"
        aria-hidden="true"
      >
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center whitespace-nowrap">
            {(last - i) % labelEvery === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </figure>
  );
}
