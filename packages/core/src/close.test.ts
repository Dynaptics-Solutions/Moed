import { describe, expect, it } from 'vitest';

import { daySummary, leftoverMeta, leftovers, tomorrowLine } from './close';
import type { LoadContribution } from './load';

const r = (
  state: LoadContribution['state'],
  lengthMinutes = 60,
  isFixed = false,
): LoadContribution => ({ state, lengthMinutes, isFixed });

const DAY = 570;

describe('leftovers', () => {
  it('asks only about what is still open', () => {
    const records = [r('open'), r('done'), r('moved'), r('dropped'), r('tray'), r('open')];
    expect(leftovers(records)).toHaveLength(2);
  });

  it('has nothing to ask on a day that was fully handled', () => {
    expect(leftovers([r('done'), r('dropped')])).toEqual([]);
  });
});

describe('daySummary', () => {
  it('counts what the day spent, including what was finished', () => {
    // A finished record still spent the day; the shut screen and the day view must not
    // disagree about the same day.
    const summary = daySummary([r('done', 300), r('done', 130), r('open', 60)], DAY, {
      done: 2,
      moved: 1,
      dropped: 0,
    });

    expect(summary.usedMinutes).toBe(490);
    expect(summary.limitMinutes).toBe(DAY);
    expect(summary.counts).toEqual({ done: 2, moved: 1, dropped: 0 });
  });

  it('does not count what left the day', () => {
    const summary = daySummary([r('done', 120), r('moved', 120), r('dropped', 120)], DAY, {
      done: 1,
      moved: 1,
      dropped: 1,
    });

    expect(summary.usedMinutes).toBe(120);
  });
});

describe('tomorrowLine', () => {
  it('says what is planned and whether more fits', () => {
    expect(tomorrowLine(375, DAY)).toBe('6h 15m planned. Room for one more thing.');
  });

  it('says nothing else fits when the room is smaller than the smallest block', () => {
    expect(tomorrowLine(DAY - 20, DAY)).toBe('9h 10m planned. Nothing else fits.');
    expect(tomorrowLine(DAY, DAY)).toBe('9h 30m planned. Nothing else fits.');
  });

  it('names the overage when tomorrow is already over', () => {
    expect(tomorrowLine(DAY + 45, DAY)).toBe('10h 15m planned. Already 45m over.');
  });

  it('reads an empty day as free rather than as nothing', () => {
    expect(tomorrowLine(0, DAY)).toBe('Nothing planned. The whole 9h 30m is free.');
  });
});

describe('leftoverMeta', () => {
  it('states the cost and the slips, and nothing else', () => {
    expect(leftoverMeta(120, 3)).toBe('2h · slipped 3 times');
    expect(leftoverMeta(120, 1)).toBe('2h · slipped 1 time');
  });

  it('leaves out what does not apply', () => {
    expect(leftoverMeta(120, 0)).toBe('2h');
    expect(leftoverMeta(0, 2)).toBe('slipped 2 times');
    expect(leftoverMeta(0, 0)).toBe('');
  });
});
