import { describe, expect, it } from 'vitest';

import {
  canCreate,
  canUse,
  capFor,
  capNotice,
  historyWindowDays,
  isEntitled,
  type Plan,
} from './entitlements';

const PLANS: Plan[] = ['free', 'trial', 'paid', 'lapsed'];

describe('isEntitled', () => {
  it('counts a running trial as paid, because that is what a trial is', () => {
    expect(isEntitled('trial')).toBe(true);
    expect(isEntitled('paid')).toBe(true);
  });

  it('does not count free or lapsed', () => {
    expect(isEntitled('free')).toBe(false);
    expect(isEntitled('lapsed')).toBe(false);
  });
});

describe('caps', () => {
  it('holds the numbers the entitlement table settles', () => {
    expect(capFor('free', 'projects')).toBe(3);
    expect(capFor('free', 'bills')).toBe(5);
    expect(capFor('free', 'calendars')).toBe(1);
    expect(capFor('free', 'historyDays')).toBe(30);
    expect(capFor('free', 'templates')).toBe(8);
  });

  it('lifts every cap on a paid plan', () => {
    expect(capFor('paid', 'projects')).toBe(Infinity);
    expect(capFor('trial', 'bills')).toBe(Infinity);
    expect(historyWindowDays('paid')).toBe(Infinity);
  });

  it('treats lapsed exactly as free for creation', () => {
    expect(capFor('lapsed', 'projects')).toBe(3);
    expect(canCreate('lapsed', 'projects', 3)).toBe(false);
  });
});

describe('canCreate', () => {
  it('allows up to the cap and not past it', () => {
    expect(canCreate('free', 'projects', 0)).toBe(true);
    expect(canCreate('free', 'projects', 2)).toBe(true);
    expect(canCreate('free', 'projects', 3)).toBe(false);
  });

  it('is a creation limit, not an access limit', () => {
    // Someone who lapses holding nine projects keeps nine projects. This function is
    // the only thing that says no, and it only ever says no to a tenth.
    expect(canCreate('lapsed', 'projects', 9)).toBe(false);
    // Nothing here withholds the nine they have; there is no `canRead`, deliberately.
  });

  it('never caps a paid plan', () => {
    expect(canCreate('paid', 'projects', 10_000)).toBe(true);
  });
});

describe('canUse', () => {
  it('gates the paid-only capabilities and lets a trial through', () => {
    expect(canUse('free', 'diet')).toBe(false);
    expect(canUse('lapsed', 'liveSync')).toBe(false);
    expect(canUse('trial', 'aiEstimates')).toBe(true);
    expect(canUse('paid', 'travelTimes')).toBe(true);
  });
});

describe('capNotice', () => {
  it('states the cap rather than scolding', () => {
    expect(capNotice('projects', 'free')).toBe('Three projects on the free plan');
    expect(capNotice('historyDays', 'free')).toBe('Searching the last 30 days');
  });

  it('says nothing at all on a plan with no cap', () => {
    for (const plan of ['trial', 'paid'] as const) {
      expect(capNotice('projects', plan)).toBeNull();
    }
  });

  it('has something to say for every capped capability on every unentitled plan', () => {
    for (const plan of PLANS.filter((p) => !isEntitled(p))) {
      for (const capability of [
        'projects',
        'bills',
        'calendars',
        'historyDays',
        'templates',
      ] as const) {
        expect(capNotice(capability, plan), `${plan}/${capability}`).toBeTruthy();
      }
    }
  });
});
