/** All dates are shown in the team's time zone, whatever the server's is. */
export const TIME_ZONE = 'Europe/Zagreb';

export function ticketNumber(n: number): string {
  return `HD-${String(n).padStart(4, '0')}`;
}

const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});

export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 hours ago", "in 2 days" */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return relative.format(Math.round(seconds / size), unit);
    }
  }
  return 'just now';
}

/** "45m", "3h 20m", "2d 4h" */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ---------- Calendar days in the team's time zone ----------

const isoDay = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TIME_ZONE,
});

/** The local calendar day of a moment, as "2026-11-24". */
export function dayKey(date: Date): string {
  return isoDay.format(date);
}

/**
 * The last `count` calendar days up to and including today, oldest first.
 * Steps over calendar dates, so daylight saving changes can't skip or repeat a day.
 */
export function lastDayKeys(count: number, now: Date = new Date()): string[] {
  const [y, m, d] = dayKey(now).split('-').map(Number);
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (count - 1 - i)))
      .toISOString()
      .slice(0, 10),
  );
}

const dayLabel = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** "2026-11-24" -> "24 Nov" */
export function formatDayKey(key: string): string {
  return dayLabel.format(new Date(`${key}T00:00:00Z`));
}
