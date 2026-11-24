import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  critical: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

/**
 * One headline number. `value` null means there is no data yet.
 * A tone colors the icon only; the number stays in the text color.
 */
export function StatTile({
  label,
  value,
  note,
  href,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number | null;
  note?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
}) {
  const body = (
    <>
      <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {Icon && (
          <Icon
            className={cn('size-4', tone && TONES[tone])}
            aria-hidden="true"
          />
        )}
        {label}
      </span>
      {value === null ? (
        <span className="text-muted-foreground text-base">No data yet</span>
      ) : (
        <span className="text-3xl font-semibold tracking-tight">
          {typeof value === 'number' ? value.toLocaleString('en') : value}
        </span>
      )}
      {note && <span className="text-muted-foreground text-xs">{note}</span>}
    </>
  );

  const className = 'flex flex-col gap-1 rounded-xl border p-4';
  return href ? (
    <Link
      href={href}
      className={cn(className, 'hover:bg-muted/50 transition-colors')}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
