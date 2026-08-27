import { formatMinutes } from './format';
import { dayLoad, type LoadContribution } from './load';

/**
 * The evening close, and what the shut day reports.
 *
 * The close is the one uninvited notification a day, and it is the only moment the app
 * asks for anything. It forces a decision on every leftover — done, move, or drop —
 * because the alternative is a day that quietly rolls into tomorrow, and nothing rolls
 * silently into tomorrow.
 */

export type Closeable = LoadContribution & { id: string; title: string };

/** What still needs a decision. A record already done, moved or dropped is settled. */
export function leftovers<T extends { state: LoadContribution['state'] }>(
  records: readonly T[],
): T[] {
  return records.filter((r) => r.state === 'open');
}

export type CloseCounts = { done: number; moved: number; dropped: number };

export type DaySummary = {
  usedMinutes: number;
  limitMinutes: number;
  counts: CloseCounts;
};

/**
 * What the day actually spent.
 *
 * A record that was done still counts — it spent the day. One that was moved or
 * dropped does not, because it left. That is the same rule the capacity bar follows,
 * so the shut screen and the day view never disagree about the same day.
 */
export function daySummary(
  records: readonly LoadContribution[],
  limitMinutes: number,
  counts: CloseCounts,
): DaySummary {
  const load = dayLoad(records);
  return { usedMinutes: load.committed + load.fixed, limitMinutes, counts };
}

/** The smallest length the forms offer, so "room" means room for something real. */
const SMALLEST_BLOCK = 30;

/**
 * The line under tomorrow's list.
 *
 * It says what is planned and whether anything else fits — a fact and its consequence,
 * with no encouragement attached. "Room for one more thing" is the most the product
 * will say about a day going well.
 */
export function tomorrowLine(plannedMinutes: number, limitMinutes: number): string {
  const free = limitMinutes - plannedMinutes;

  if (plannedMinutes === 0)
    return `Nothing planned. The whole ${formatMinutes(limitMinutes)} is free.`;
  if (free < 0)
    return `${formatMinutes(plannedMinutes)} planned. Already ${formatMinutes(-free)} over.`;
  if (free < SMALLEST_BLOCK) return `${formatMinutes(plannedMinutes)} planned. Nothing else fits.`;
  return `${formatMinutes(plannedMinutes)} planned. Room for one more thing.`;
}

/**
 * How the close describes a leftover: what it cost and how often it has slipped.
 *
 * A slip count is a fact, not a reprimand — it is the number, and nothing else. The
 * whole reason the tray exists is that a record which has slipped three times should be
 * visible rather than quietly rescheduled a fourth time.
 */
export function leftoverMeta(lengthMinutes: number, slipCount: number): string {
  const cost = lengthMinutes > 0 ? formatMinutes(lengthMinutes) : null;
  const slips = slipCount > 0 ? `slipped ${slipCount} time${slipCount === 1 ? '' : 's'}` : null;
  return [cost, slips].filter(Boolean).join(' · ');
}
