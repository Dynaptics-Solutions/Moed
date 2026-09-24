import { describe, expect, it } from 'vitest';

import { assertEstimate, contains, isDegenerate, relativeWidth, width } from './range';

describe('assertEstimate', () => {
  it('accepts an honest range', () => {
    expect(assertEstimate({ lo: 520, hi: 680 })).toEqual({ lo: 520, hi: 680 });
  });

  // Non-negotiable 4. A model that answers "610" is the case this exists for.
  it('rejects a single number wearing a range', () => {
    expect(() => assertEstimate({ lo: 610, hi: 610 })).toThrow(/single number/);
  });

  it('rejects an inverted range', () => {
    expect(() => assertEstimate({ lo: 680, hi: 520 })).toThrow(/lo <= hi/);
  });

  it('rejects negative calories', () => {
    expect(() => assertEstimate({ lo: -10, hi: 100 })).toThrow(/negative/);
  });

  it('rejects a non-finite bound', () => {
    expect(() => assertEstimate({ lo: 0, hi: Number.POSITIVE_INFINITY })).toThrow(/finite/);
  });
});

describe('range arithmetic', () => {
  it('measures width and relative width', () => {
    expect(width({ lo: 520, hi: 680 })).toBe(160);
    expect(relativeWidth({ lo: 520, hi: 680 }, 640)).toBeCloseTo(0.25);
  });

  it('is inclusive at both ends', () => {
    expect(contains({ lo: 520, hi: 680 }, 520)).toBe(true);
    expect(contains({ lo: 520, hi: 680 }, 680)).toBe(true);
    expect(contains({ lo: 520, hi: 680 }, 681)).toBe(false);
  });

  it('knows a degenerate range', () => {
    expect(isDegenerate({ lo: 610, hi: 610 })).toBe(true);
    expect(isDegenerate({ lo: 610, hi: 650 })).toBe(false);
  });
});
