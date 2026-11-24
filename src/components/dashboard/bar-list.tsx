import { cn } from '@/lib/utils';

/** Rows of name, bar and count, all bars on one scale. */
export function BarList({
  items,
  label,
}: {
  items: { label: string; value: number; muted?: boolean }[];
  /** Names the list for assistive technology. */
  label: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul aria-label={label} className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="grid grid-cols-[minmax(0,8rem)_1fr_2.5rem] items-center gap-3 text-sm"
        >
          <span
            className={cn('truncate', item.muted && 'text-muted-foreground')}
          >
            {item.label}
          </span>
          <span className="h-3" aria-hidden="true">
            <span
              className={cn(
                'block h-full rounded-r-[4px]',
                item.muted ? 'bg-muted-foreground/40' : 'bg-viz-1',
              )}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right tabular-nums">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
