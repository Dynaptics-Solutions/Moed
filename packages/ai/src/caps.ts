/**
 * Who is allowed to spend, and what it says when they cannot.
 *
 * `ARCHITECTURE.md`:141 gives `POST /ai/*` three jobs — proxy, enforce caps, log spend.
 * This is the second one, kept as a pure function so the decision can be tested without a
 * database and so the proxy has nothing to get wrong except calling it.
 *
 * The shape from §6.7 is unusual and deliberate: **capped trial, unlimited paid.**
 *
 *   Trial   3 photos/day (about 42 across the fourteen days), text and voice uncapped
 *   Paid    unlimited, behind an undocumented 500/month abuse ceiling
 *
 * The limit sits exactly where the exposure is. A trial has no card behind it and is the
 * farmable path, so the daily cap bounds any single one; a subscriber has already paid and
 * §6.6 shows even a ten-photo-a-day abuser keeping 29% margin on the worst plan — so
 * metering them would cost more in goodwill than it saves.
 *
 * §6.7 on the monthly ceiling: *"never shown, never metered, and never mentioned in the
 * UI. It exists to stop scripted abuse, not to shape behaviour. When someone reaches it,
 * say what happened in the product's voice and open a conversation rather than a wall."*
 * So nothing here returns a remaining-count for the paid plan, and there is no endpoint to
 * ask for one. The number is not a budget the user is spending; it is a tripwire.
 */

export type Plan = 'free' | 'trial' | 'paid' | 'lapsed';

/**
 * The features that cost money. Kept separate from `PaidCapability` in `@moed/core`
 * because that answers "may they see this screen" and this answers "may we call a model
 * on their behalf" — the same word for both would eventually let one be checked in place
 * of the other.
 */
export type MeteredFeature = 'photo' | 'text' | 'voice';

/** Trial photo allowance, per day. §6.7. */
export const TRIAL_PHOTOS_PER_DAY = 3;

/** Paid abuse ceiling, per calendar month. Never shown, never metered. §6.7. */
export const PAID_PHOTOS_PER_MONTH = 500;

export type CapUsage = {
  /** Photo calls this user has made today, in their own timezone. */
  photosToday: number;
  /** Photo calls this user has made this calendar month. */
  photosThisMonth: number;
};

export type CapDecision =
  | { allowed: true }
  | {
      allowed: false;
      /**
       * What the app shows. Written here rather than in the client so the wording cannot
       * drift between platforms, and so it stays in the product's voice — plain, specific,
       * never cheerful, and never a dead end.
       */
      notice: string;
      /**
       * `trial` means the user can subscribe and continue now. `ceiling` means talk to us.
       * `plan` means the feature is not theirs at all.
       */
      reason: 'plan' | 'trial' | 'ceiling';
    };

const ALLOWED: CapDecision = { allowed: true };

/**
 * Whether this call may be made.
 *
 * Free and lapsed never reach a model: every metered feature belongs to the diet plan,
 * which is paid. A lapsed subscription is read-only, not hidden — that rule lives in the
 * entitlement table, and it means this returns a refusal rather than an error.
 */
export function capDecision(plan: Plan, feature: MeteredFeature, usage: CapUsage): CapDecision {
  if (plan === 'free') {
    return {
      allowed: false,
      reason: 'plan',
      notice: 'Food estimates are part of the diet plan. The planner stays free.',
    };
  }

  if (plan === 'lapsed') {
    return {
      allowed: false,
      reason: 'plan',
      notice:
        'Your subscription has lapsed, so new estimates are paused. Everything you have ' +
        'logged is still here and can still be exported.',
    };
  }

  // Text and voice are uncapped on both paying plans. §6.7 caps photos only, because
  // photos are the only call whose cost is large enough to be worth bounding.
  if (feature !== 'photo') return ALLOWED;

  if (plan === 'trial') {
    if (usage.photosToday >= TRIAL_PHOTOS_PER_DAY) {
      return {
        allowed: false,
        reason: 'trial',
        notice:
          `The trial covers ${TRIAL_PHOTOS_PER_DAY} photo estimates a day, and today's are used. ` +
          'Typing a meal still works, and subscribing removes the limit.',
      };
    }
    return ALLOWED;
  }

  if (usage.photosThisMonth >= PAID_PHOTOS_PER_MONTH) {
    return {
      allowed: false,
      reason: 'ceiling',
      // §6.7 supplies this sentence almost verbatim, and it is worth keeping verbatim:
      // it opens a conversation instead of presenting a wall.
      notice:
        `You have logged ${PAID_PHOTOS_PER_MONTH} photos this month. That is more than anyone ` +
        'eats — if that is wrong, get in touch.',
    };
  }

  return ALLOWED;
}

/**
 * How many photo estimates a trial has left today.
 *
 * Defined for `trial` only, and returning `null` for every other plan is the point. There
 * is no remaining-count for a subscriber, because §6.7 says the monthly ceiling is never
 * metered — a function that could answer "you have 340 left" would be a meter, whatever it
 * was called, and the first screen to render it would turn a tripwire into a budget.
 */
export function trialPhotosLeft(plan: Plan, usage: CapUsage): number | null {
  if (plan !== 'trial') return null;
  return Math.max(0, TRIAL_PHOTOS_PER_DAY - usage.photosToday);
}
