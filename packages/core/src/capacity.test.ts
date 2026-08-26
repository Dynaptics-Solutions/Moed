import { describe, expect, it } from 'vitest';

import { capacity, segmentWidths } from './capacity';
import { formatMinutes, minutes, remainingLabel } from './format';

/** The default day: 08:30–18:00. */
const DAY = 570;

const sum = (s: {
  committed: number;
  fixed: number;
  estimated: number;
  free: number;
  over: number;
}) => s.committed + s.fixed + s.estimated + s.free + s.over;

describe('capacity', () => {
  it('draws the day view from the mockup: 5h 20m work, 2h 30m fixed', () => {
    const c = capacity({ committed: 320, fixed: 150, limit: DAY });

    expect(c.scale).toBe(1);
    expect(c.isOver).toBe(false);
    expect(c.segments).toEqual({ committed: 320, fixed: 150, estimated: 0, free: 100, over: 0 });
    expect(c.denominator).toBe(DAY);
    expect(remainingLabel(c, minutes)).toBe('1h 40m left');
  });

  it('compresses the planned segments into the limit when over', () => {
    // The `full` mockup: 7h 50m work, 3h fixed, on a 9h 30m day.
    const c = capacity({ committed: 470, fixed: 180, limit: DAY });

    expect(c.planned).toBe(650);
    expect(c.over).toBe(80);
    expect(c.denominator).toBe(650);
    expect(c.scale).toBeCloseTo(570 / 650, 10);

    // Rounds to the 412 / 158 / 80 the corrected mockup draws.
    expect(Math.round(c.segments.committed)).toBe(412);
    expect(Math.round(c.segments.fixed)).toBe(158);
    expect(c.segments.over).toBe(80);
    expect(c.segments.free).toBe(0);
    expect(remainingLabel(c, minutes)).toBe('1h 20m over');
  });

  it('reports eighty minutes over a 570-minute day as 12 per cent of the bar, not 22', () => {
    // The whole reason the bar rescales. The earlier reading overstated the one number
    // the product exists to report.
    const c = capacity({ committed: 470, fixed: 180, limit: DAY });
    const proportion = c.segments.over / c.denominator;

    expect(proportion).toBeCloseTo(0.123, 3);
    expect(proportion).toBeLessThan(0.13);
  });

  it('never appends the overflow as a fourth segment', () => {
    // The double-counting bug the rule was written against: the planned segments
    // already contain the excess, so the segments must still sum to the denominator.
    const c = capacity({ committed: 470, fixed: 180, limit: DAY });

    expect(sum(c.segments)).toBeCloseTo(c.denominator, 10);
    expect(sum(c.segments)).not.toBeCloseTo(c.planned + c.over, 10);
  });

  it('keeps the planned segments in the same ratio to each other when it compresses', () => {
    const under = capacity({ committed: 470, fixed: 180, limit: 9999 });
    const over = capacity({ committed: 470, fixed: 180, limit: DAY });

    expect(over.segments.committed / over.segments.fixed).toBeCloseTo(
      under.segments.committed / under.segments.fixed,
      10,
    );
  });

  it('always sums the segments to the denominator', () => {
    const cases: [number, number, number, number][] = [
      [0, 0, 0, DAY],
      [320, 150, 0, DAY],
      [470, 180, 0, DAY],
      [1710, 0, 0, DAY], // three times over
      [152, 279, 25, 600], // the spend form, with a pending segment
      [5, 0, 0, DAY], // a five-minute record
      [570, 0, 0, DAY], // exactly at the limit
    ];

    for (const [committed, fixed, estimated, limit] of cases) {
      const c = capacity({ committed, fixed, estimated, limit });
      expect(sum(c.segments)).toBeCloseTo(c.denominator, 8);
    }
  });

  it('treats exactly at the limit as not over', () => {
    const c = capacity({ committed: 570, fixed: 0, limit: DAY });

    expect(c.isOver).toBe(false);
    expect(c.over).toBe(0);
    expect(c.free).toBe(0);
    expect(c.segments.free).toBe(0);
    expect(remainingLabel(c, minutes)).toBe('0m left');
  });

  it('does not cap the denominator at three times over', () => {
    const c = capacity({ committed: 1710, fixed: 0, limit: DAY });

    expect(c.denominator).toBe(1710);
    expect(c.over).toBe(1140);
    expect(remainingLabel(c, minutes)).toBe('19h over');
  });

  it('draws no fill on an empty day', () => {
    const c = capacity({ committed: 0, fixed: 0, limit: DAY });

    expect(c.isEmpty).toBe(true);
    expect(c.isOver).toBe(false);
    expect(c.segments).toEqual({ committed: 0, fixed: 0, estimated: 0, free: DAY, over: 0 });
    expect(remainingLabel(c, minutes)).toBe('9h 30m free');
  });

  it('carries an estimated segment as a third planned part', () => {
    // The spend form: £152 spent, £279 in bills, £24.60 pending, £600 limit.
    const c = capacity({ committed: 152, fixed: 279, estimated: 25, limit: 600 });

    expect(c.planned).toBe(456);
    expect(c.isOver).toBe(false);
    expect(c.segments.estimated).toBe(25);
    expect(c.segments.free).toBe(144);
  });

  it('reduces to the settled two-part formula when nothing is estimated', () => {
    const withZero = capacity({ committed: 470, fixed: 180, estimated: 0, limit: DAY });
    const without = capacity({ committed: 470, fixed: 180, limit: DAY });

    expect(withZero).toEqual(without);
  });

  it('clamps nonsense rather than propagating it', () => {
    const c = capacity({ committed: -50, fixed: Number.NaN, limit: DAY });

    expect(c.planned).toBe(0);
    expect(c.isEmpty).toBe(true);
    expect(Number.isFinite(c.segments.free)).toBe(true);
  });

  it('treats a limit of zero as entirely over', () => {
    const c = capacity({ committed: 60, fixed: 0, limit: 0 });

    expect(c.isOver).toBe(true);
    expect(c.segments.over).toBe(60);
    expect(c.segments.committed).toBe(0);
    expect(sum(c.segments)).toBe(60);
  });
});

describe('segmentWidths', () => {
  it('gives a five-minute segment its 2px rather than letting it vanish', () => {
    // Where this bites is the week view, whose seven columns are about 40px each.
    // Five minutes of a 570-minute day is a third of a pixel there.
    const c = capacity({ committed: 300, fixed: 5, limit: DAY });
    const px = segmentWidths(c.segments, c.denominator, 40);

    expect((5 / DAY) * 40).toBeLessThan(1);
    expect(px.fixed).toBe(2);
    expect(px.committed + px.fixed + px.free).toBeCloseTo(40, 6);
  });

  it('takes the cost of the floor from the segments that can spare it', () => {
    const c = capacity({ committed: 300, fixed: 5, limit: DAY });
    const px = segmentWidths(c.segments, c.denominator, 40);

    expect(px.fixed).toBe(2);
    // Both donors shrink, and the wider one gives up more.
    expect(px.committed).toBeLessThan((300 / DAY) * 40);
    expect(px.free).toBeLessThan((265 / DAY) * 40);
    expect(px.committed).toBeGreaterThan(px.free);
  });

  it('never draws a bar wider than its own frame', () => {
    const c = capacity({ committed: 1, fixed: 1, estimated: 1, limit: 570 });
    const px = segmentWidths(c.segments, c.denominator, 6);
    const total = px.committed + px.fixed + px.estimated + px.free + px.over;

    expect(total).toBeLessThanOrEqual(6 + 1e-9);
  });

  it('leaves a zero segment at zero', () => {
    const c = capacity({ committed: 320, fixed: 0, limit: DAY });
    const px = segmentWidths(c.segments, c.denominator, 335);

    expect(px.fixed).toBe(0);
    expect(px.over).toBe(0);
    expect(px.estimated).toBe(0);
  });

  it('returns nothing for a bar that has not been measured yet', () => {
    const c = capacity({ committed: 320, fixed: 150, limit: DAY });

    expect(segmentWidths(c.segments, c.denominator, 0)).toEqual({
      committed: 0,
      fixed: 0,
      estimated: 0,
      free: 0,
      over: 0,
    });
  });
});

describe('formatMinutes', () => {
  it('writes hours the way the designs do', () => {
    expect(formatMinutes(570)).toBe('9h 30m');
    expect(formatMinutes(320)).toBe('5h 20m');
    expect(formatMinutes(150)).toBe('2h 30m');
    expect(formatMinutes(100)).toBe('1h 40m');
    expect(formatMinutes(80)).toBe('1h 20m');
    expect(formatMinutes(40)).toBe('40m');
  });

  it('never writes a trailing zero-minute on a whole hour', () => {
    expect(formatMinutes(180)).toBe('3h');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(1140)).toBe('19h');
  });

  it('reads a negative as its magnitude, because the word carries the sign', () => {
    expect(formatMinutes(-80)).toBe('1h 20m');
  });

  it('writes nothing as 0m', () => {
    expect(formatMinutes(0)).toBe('0m');
  });
});
