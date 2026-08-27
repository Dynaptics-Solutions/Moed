/**
 * Free versus paid, as a table rather than scattered conditionals.
 *
 * Every cap in the product is read from here. The moment a screen decides for itself
 * what a free account may do, the entitlement table stops being the answer and starts
 * being one of several answers.
 *
 * Two rules that are easy to get wrong and are the whole shape of this file:
 *
 *  1. **Caps are creation limits, not access limits.** A lapsed subscriber keeps every
 *     project they made and simply cannot add another. Nothing is ever hidden, made
 *     unreadable, or deleted on lapse.
 *  2. **Export is never gated**, at any tier, in any state. It is not in the table
 *     because it is not a capability that can be withheld.
 */

export type Plan = 'free' | 'trial' | 'paid' | 'lapsed';

/** Capabilities with a numeric ceiling on the free tier. */
export type CappedCapability = 'projects' | 'bills' | 'calendars' | 'historyDays' | 'templates';

/** Capabilities that are wholly one side of the line. */
export type PaidCapability =
  | 'diet'
  | 'health'
  | 'liveSync'
  | 'voice'
  | 'aiEstimates'
  | 'aiPlans'
  | 'travelTimes'
  | 'ownTemplates'
  | 'projectSharing';

const CAPS: Record<CappedCapability, number> = {
  projects: 3,
  bills: 5,
  calendars: 1,
  /** Thirty days of history and search. Older records stay; they are not searchable. */
  historyDays: 30,
  /** Eight built-in templates. Making your own is paid. */
  templates: 8,
};

/**
 * Whether the plan is currently entitled to paid features.
 *
 * A trial is paid while it runs — that is what a trial is. Lapsed is not, which is the
 * point at which diet goes read-only and the day limit reverts to fixed.
 */
export function isEntitled(plan: Plan): boolean {
  return plan === 'paid' || plan === 'trial';
}

/** The ceiling on this plan, or Infinity when there is none. */
export function capFor(plan: Plan, capability: CappedCapability): number {
  return isEntitled(plan) ? Number.POSITIVE_INFINITY : CAPS[capability];
}

/**
 * Whether one more may be created.
 *
 * Note what this is not asked about: reading, exporting or keeping. Someone who lapses
 * with nine projects keeps nine projects; they cannot make a tenth.
 */
export function canCreate(plan: Plan, capability: CappedCapability, existing: number): boolean {
  return existing < capFor(plan, capability);
}

export function canUse(plan: Plan, _capability: PaidCapability): boolean {
  return isEntitled(plan);
}

/**
 * How far back search and history reach, in days. Infinity on a paid plan.
 *
 * Records outside the window are not deleted and not hidden from the day they live on —
 * they are simply not returned by search, which is a different thing and the honest one.
 */
export function historyWindowDays(plan: Plan): number {
  return capFor(plan, 'historyDays');
}

/**
 * The line a capped screen shows when the cap is reached.
 *
 * It states the cap and offers the way through, because a screen that has to say no
 * says why. It never scolds and never implies the limit is a failing.
 */
export function capNotice(capability: CappedCapability, plan: Plan): string | null {
  if (isEntitled(plan)) return null;

  switch (capability) {
    case 'projects':
      return 'Three projects on the free plan';
    case 'bills':
      return 'Five bills on the free plan';
    case 'calendars':
      return 'One calendar on the free plan';
    case 'historyDays':
      return 'Searching the last 30 days';
    case 'templates':
      return 'Eight built-in templates';
  }
}

/** What a lapsed plan changes, said out loud rather than discovered. */
export const LAPSE_NOTICE =
  'Diet is read-only and the day limit is back to a fixed 9h 30m. Everything you logged stays, and export is never gated.';
