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

/** Number of rent periods that have started on or before `asOf`. */
function periodsStarted(start: Date, asOf: Date, frequency: Frequency) {
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
      // If this month's period hasn't started yet, don't count it.
      if (periodStart(start, 'monthly', months) > asOf) months -= 1;
      return months + 1;
    }
  }
}

/**
 * Number of rent periods that have been fully completed before `asOf`.
 * Rent is charged in arrears: a day/week/month becomes due once it has ended,
 * i.e. on the day the next period starts.
 */
export function periodsDue(start: Date, asOf: Date, frequency: Frequency) {
  return Math.max(0, periodsStarted(start, asOf, frequency) - 1);
}

export type DueStatus = 'paid' | 'partial' | 'unpaid';

export type DueItem = {
  /** 0-based period number. */
  index: number;
  /** First day of the period. */
  from: Date;
  /** Last day of the period; its rent becomes due the day after. */
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
  /**
   * Date the current period's rent becomes due (the day after it completes),
   * or null if the tenancy has ended.
   */
  nextDue: Date | null;
};

export function rentStatus(t: TenancyView, today = todayISO()): RentStatus {
  const start = fromISODate(t.start_date);
  const ended = !t.active || (t.end_date !== null && t.end_date < today);
  // The end date is the last day of the tenancy, so it counts as completed.
  const asOf =
    ended && t.end_date ? addDays(fromISODate(t.end_date), 1) : fromISODate(today);
  const periods = periodsDue(start, asOf, t.frequency);
  const expected = periods * t.rent_amount;
  const paid = t.total_paid;
  return {
    periods,
    expected,
    paid,
    balance: expected - paid,
    nextDue: ended ? null : periodStart(start, t.frequency, periods + 1),
  };
}
