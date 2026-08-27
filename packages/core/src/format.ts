import type { Capacity } from './capacity';

/**
 * Hours, the way the designs write them: "9h 30m", "3h", "40m". A whole number of
 * hours never carries a trailing "0m", because nothing in this product writes a digit
 * it does not mean.
 */
export function formatMinutes(value: number): string {
  const total = Math.round(Math.abs(value));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * A budget's unit. The capacity bar is one component — hours, money and calories
 * differ only in how the number reads, so that is the only thing a unit carries.
 *
 * Money and calories arrive with their own phases. Adding them here before then would
 * be inventing formats for screens that do not exist yet.
 */
export type Unit = {
  format(value: number): string;
};

export const minutes: Unit = { format: formatMinutes };

/**
 * The caption's right-hand side, which is rule-governed rather than per-screen: what
 * remains, and never anything else.
 *
 *   under   "1h 40m left"
 *   empty   "9h 30m free"
 *   over    "1h 20m over"
 *
 * The colour that goes with it is `acc` under and `over` over — the one place the
 * alert colour is allowed, because it is the one thing it means.
 */
export function remainingLabel(c: Capacity, unit: Unit): string {
  if (c.isOver) return `${unit.format(Math.abs(c.remaining))} over`;
  return `${unit.format(c.remaining)} ${c.isEmpty ? 'free' : 'left'}`;
}
