/**
 * Calendar-day helpers.
 *
 * Every day in the app is identified by a local-time "date key" (`YYYY-MM-DD`).
 * Arithmetic on keys is done in UTC so daylight-saving shifts can never
 * produce a 23- or 25-hour "day".
 */

export type DateKey = string;

const MS_PER_DAY = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseKey(key: DateKey): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m, d];
}

/** The local calendar day that `date` falls on. */
export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A `Date` at local noon on the given day (safe for display formatting). */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = parseKey(key);
  return new Date(y, m - 1, d, 12);
}

function toUtcDay(key: DateKey): number {
  const [y, m, d] = parseKey(key);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

function fromUtcDay(day: number): DateKey {
  const date = new Date(day * MS_PER_DAY);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(key: DateKey, days: number): DateKey {
  return fromUtcDay(toUtcDay(key) + days);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  return toUtcDay(to) - toUtcDay(from);
}

/** Every day from `from` to `to`, inclusive. Empty when `to` is before `from`. */
export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  const days: DateKey[] = [];
  const start = toUtcDay(from);
  const end = toUtcDay(to);
  for (let day = start; day <= end; day++) {
    days.push(fromUtcDay(day));
  }
  return days;
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function startOfYear(key: DateKey): DateKey {
  return `${key.slice(0, 4)}-01-01`;
}

export function minKey(a: DateKey, b: DateKey): DateKey {
  return a < b ? a : b;
}

export function maxKey(a: DateKey, b: DateKey): DateKey {
  return a > b ? a : b;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(key: DateKey): number {
  // 1970-01-01 was a Thursday (4).
  return (((toUtcDay(key) + 4) % 7) + 7) % 7;
}

/** Milliseconds from `now` until the next local midnight. */
export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function formatDay(key: DateKey, options: Intl.DateTimeFormatOptions): string {
  return fromDateKey(key).toLocaleDateString(undefined, options);
}

/** "Today", "Yesterday", or a short weekday/date label. */
export function relativeDayLabel(key: DateKey, todayKey: DateKey): string {
  const diff = daysBetween(key, todayKey);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return formatDay(key, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(hour: number, minute: number): string {
  const date = new Date(2000, 0, 1, hour, minute);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
