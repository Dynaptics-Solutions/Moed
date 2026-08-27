import type { Recurrence, RecurrenceLabels } from '@moed/core';

import { weekdayShort } from './day';

/**
 * The recurrence editor is its own route, so the rule travels in and out of it as route
 * parameters rather than through a shared store.
 *
 * That keeps the editor stateless and makes the back gesture do the right thing for
 * free: leaving without pressing Done simply never writes the rule back.
 */

export type RecurrenceParams = {
  freq?: string;
  interval?: string;
  byWeekday?: string;
  ends?: string;
  endsOn?: string;
  endsAfter?: string;
};

export function toParams(recurrence: Recurrence | null): Record<string, string> {
  if (!recurrence) return { freq: '' };
  return {
    freq: recurrence.freq,
    interval: String(recurrence.interval),
    byWeekday: (recurrence.byWeekday ?? []).join(','),
    ends: recurrence.ends,
    endsOn: recurrence.endsOn !== undefined ? String(recurrence.endsOn) : '',
    endsAfter: recurrence.endsAfter !== undefined ? String(recurrence.endsAfter) : '',
  };
}

export function fromParams(params: RecurrenceParams): Recurrence | null {
  const freq = params.freq;
  if (freq !== 'daily' && freq !== 'weekly' && freq !== 'monthly' && freq !== 'yearly') {
    return null;
  }

  const ends = params.ends;
  return {
    freq,
    interval: Math.max(1, Number(params.interval) || 1),
    byWeekday: (params.byWeekday ?? '')
      .split(',')
      .filter((s) => s !== '')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
    ends: ends === 'onDate' || ends === 'afterN' ? ends : 'never',
    endsOn: params.endsOn ? Number(params.endsOn) : undefined,
    endsAfter: params.endsAfter ? Number(params.endsAfter) : undefined,
  };
}

/** Intl names for the sentence core assembles. */
export const recurrenceLabels: RecurrenceLabels = {
  weekdayShort: (index) => {
    // A known Sunday, so index 0 really is Sunday whatever the current date is.
    const reference = new Date(2026, 7, 23);
    reference.setDate(reference.getDate() + index);
    return weekdayShort(reference);
  },
  date: (ms) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(new Date(ms)),
};
