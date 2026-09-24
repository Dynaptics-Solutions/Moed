import { describe, expect, it } from 'vitest';

import {
  capDecision,
  PAID_PHOTOS_PER_MONTH,
  TRIAL_PHOTOS_PER_DAY,
  trialPhotosLeft,
  type CapUsage,
} from './caps';

const fresh: CapUsage = { photosToday: 0, photosThisMonth: 0 };

describe('capDecision', () => {
  it('keeps free and lapsed away from a model', () => {
    expect(capDecision('free', 'photo', fresh).allowed).toBe(false);
    expect(capDecision('lapsed', 'photo', fresh).allowed).toBe(false);
  });

  it('tells a lapsed subscriber their data is still there', () => {
    const decision = capDecision('lapsed', 'text', fresh);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.notice).toMatch(/still here|export/);
  });

  it('caps trial photos at three a day', () => {
    expect(capDecision('trial', 'photo', { ...fresh, photosToday: 2 }).allowed).toBe(true);
    expect(
      capDecision('trial', 'photo', { ...fresh, photosToday: TRIAL_PHOTOS_PER_DAY }).allowed,
    ).toBe(false);
  });

  it('leaves trial text and voice uncapped', () => {
    const heavy = { photosToday: 99, photosThisMonth: 9999 };
    expect(capDecision('trial', 'text', heavy).allowed).toBe(true);
    expect(capDecision('trial', 'voice', heavy).allowed).toBe(true);
  });

  it('offers the way through rather than a dead end', () => {
    const decision = capDecision('trial', 'photo', { ...fresh, photosToday: 3 });
    expect(decision.allowed).toBe(false);
    // "When a screen has to say no, it says why, and it offers the way through."
    if (!decision.allowed) expect(decision.notice).toMatch(/Typing a meal still works/);
  });

  it('leaves paid photos unlimited below the ceiling', () => {
    expect(capDecision('paid', 'photo', { photosToday: 40, photosThisMonth: 499 }).allowed).toBe(
      true,
    );
  });

  it('trips the undocumented ceiling and opens a conversation', () => {
    const decision = capDecision('paid', 'photo', {
      photosToday: 40,
      photosThisMonth: PAID_PHOTOS_PER_MONTH,
    });
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toBe('ceiling');
      expect(decision.notice).toMatch(/get in touch/);
    }
  });

  it('never says no cheerfully or with an exclamation mark', () => {
    const refusals = [
      capDecision('free', 'photo', fresh),
      capDecision('lapsed', 'photo', fresh),
      capDecision('trial', 'photo', { ...fresh, photosToday: 3 }),
      capDecision('paid', 'photo', { photosToday: 0, photosThisMonth: 500 }),
    ];
    for (const decision of refusals) {
      expect(decision.allowed).toBe(false);
      if (!decision.allowed) {
        expect(decision.notice).not.toMatch(/[!]/);
        expect(decision.notice).not.toMatch(/let's|Let's/);
      }
    }
  });
});

describe('trialPhotosLeft', () => {
  it('counts down for a trial', () => {
    expect(trialPhotosLeft('trial', fresh)).toBe(3);
    expect(trialPhotosLeft('trial', { ...fresh, photosToday: 2 })).toBe(1);
    expect(trialPhotosLeft('trial', { ...fresh, photosToday: 9 })).toBe(0);
  });

  // §6.7: the monthly ceiling is "never shown, never metered". A remaining-count for a
  // subscriber would be a meter whatever it was called.
  it('refuses to meter a subscriber', () => {
    expect(trialPhotosLeft('paid', fresh)).toBeNull();
    expect(trialPhotosLeft('free', fresh)).toBeNull();
    expect(trialPhotosLeft('lapsed', fresh)).toBeNull();
  });
});
