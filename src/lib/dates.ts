/** Dates are stored as local calendar days in `YYYY-MM-DD` form. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayISO() {
  return toISODate(new Date());
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return fromISODate(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function startOfMonthISO(date = new Date()) {
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonthISO(date = new Date()) {
  return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

/** Whole days from `a` to `b` (b - a), ignoring time of day / DST. */
export function daysBetween(a: Date, b: Date) {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

/** Adds months, clamping the day to the end of the target month (31 Jan + 1 → 28/29 Feb). */
export function addMonths(date: Date, months: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
