import type { Frequency, TenancyView } from '@/db/types';

import { addDays, addMonths, daysBetween, fromISODate, todayISO } from './dates';

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export const FREQUENCY_UNIT: Record<Frequency, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
};

/** Date on which the n-th rent period (0-based) starts. Rent is due at the start of each period. */
export function periodStart(start: Date, frequency: Frequency, n: number) {
  switch (frequency) {
    case 'daily':
      return addDays(start, n);
    case 'weekly':
      return addDays(start, n * 7);
    case 'monthly':
      return addMonths(start, n);
  }
}

/** Number of rent periods that have become due between `start` and `asOf` (both inclusive). */
export function periodsDue(start: Date, asOf: Date, frequency: Frequency) {
  const days = daysBetween(start, asOf);
  if (days < 0) return 0;
  switch (frequency) {
    case 'daily':
      return days + 1;
    case 'weekly':
      return Math.floor(days / 7) + 1;
    case 'monthly': {
      let months =
        (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth());
      // If this month's due date hasn't arrived yet, the current period isn't due.
      if (periodStart(start, 'monthly', months) > asOf) months -= 1;
      return months + 1;
    }
  }
}

export type DueStatus = 'paid' | 'partial' | 'unpaid';

export type DueItem = {
  /** 0-based period number. */
  index: number;
  /** First day of the period (rent is due on this day). */
  from: Date;
  /** Last day of the period. */
  to: Date;
  amount: number;
  paid: number;
  status: DueStatus;
};

/**
 * One row per rent period that has become due, newest first. Payments are
 * applied to the oldest unpaid periods first.
 */
export function dueSchedule(t: TenancyView, today = todayISO()): DueItem[] {
  const start = fromISODate(t.start_date);
  const { periods } = rentStatus(t, today);
  let remaining = t.total_paid;
  const items: DueItem[] = [];
  for (let i = 0; i < periods; i++) {
    const paid = Math.min(t.rent_amount, Math.max(0, remaining));
    remaining -= paid;
    items.push({
      index: i,
      from: periodStart(start, t.frequency, i),
      to: addDays(periodStart(start, t.frequency, i + 1), -1),
      amount: t.rent_amount,
      paid,
      status: paid >= t.rent_amount ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
    });
  }
  return items.reverse();
}

export type RentStatus = {
  periods: number;
  expected: number;
  paid: number;
  /** Positive = still owed, negative = paid in advance. */
  balance: number;
  /** Next due date, or null if the tenancy has ended. */
  nextDue: Date | null;
};

export function rentStatus(t: TenancyView, today = todayISO()): RentStatus {
  const start = fromISODate(t.start_date);
  const endISO = t.end_date && t.end_date < today ? t.end_date : today;
  const periods = periodsDue(start, fromISODate(endISO), t.frequency);
  const expected = periods * t.rent_amount;
  const paid = t.total_paid;
  const ended = !t.active || (t.end_date !== null && t.end_date < today);
  return {
    periods,
    expected,
    paid,
    balance: expected - paid,
    nextDue: ended ? null : periodStart(start, t.frequency, periods),
  };
}
