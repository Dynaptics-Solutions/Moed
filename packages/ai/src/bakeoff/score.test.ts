import { describe, expect, it } from 'vitest';

import { DEFAULT_ALPHA, intervalScore, scoreOne, summarise } from './score';

/**
 * The point of these tests is not the arithmetic — it is that the metric cannot be
 * gamed. §6.2 warns that "a cheap model producing confidently wrong ranges does not save
 * money, it destroys the feature", and a scoring rule that rewards either cheat would let
 * exactly that model win the bake-off.
 */
describe('intervalScore', () => {
  const truth = 640;

  it('is the width when the range contains the truth', () => {
    expect(intervalScore({ lo: 520, hi: 680 }, truth)).toBe(160);
  });

  it('punishes the widen-to-always-cover cheat', () => {
    const honest = intervalScore({ lo: 520, hi: 680 }, truth);
    const cowardly = intervalScore({ lo: 0, hi: 10_000 }, truth);
    // The absurd range covers the truth every time and still loses badly, because the
    // width it claimed is the width it is charged for.
    expect(cowardly).toBeGreaterThan(honest);
    expect(cowardly).toBe(10_000);
  });

  it('punishes the narrow-to-look-sharp cheat', () => {
    const honest = intervalScore({ lo: 520, hi: 680 }, truth);
    // A one-calorie range, thirty calories off. Sharp, and wrong.
    const overconfident = intervalScore({ lo: 610, hi: 611 }, truth);
    expect(overconfident).toBeGreaterThan(honest);
    // width 1, plus (2/0.1) * (640 - 611) = 20 * 29 = 580
    expect(overconfident).toBe(1 + 580);
  });

  it('scales the miss by 2/alpha', () => {
    // Missing low by 10 at alpha 0.1 costs 200; the same miss at alpha 0.5 costs 40.
    expect(intervalScore({ lo: 0, hi: 630 }, truth, 0.1)).toBe(630 + 200);
    expect(intervalScore({ lo: 0, hi: 630 }, truth, 0.5)).toBe(630 + 40);
  });

  it('is symmetric between missing high and missing low', () => {
    const missedLow = intervalScore({ lo: 500, hi: 600 }, 640);
    const missedHigh = intervalScore({ lo: 680, hi: 780 }, 640);
    expect(missedLow).toBe(missedHigh);
  });

  it('rejects an alpha outside (0, 1)', () => {
    expect(() => intervalScore({ lo: 1, hi: 2 }, 1, 0)).toThrow();
    expect(() => intervalScore({ lo: 1, hi: 2 }, 1, 1)).toThrow();
  });
});

describe('scoreOne', () => {
  it('records coverage, sharpness and degeneracy alongside the score', () => {
    const scored = scoreOne('meal-1', { lo: 520, hi: 680 }, 640);
    expect(scored.covered).toBe(true);
    expect(scored.degenerate).toBe(false);
    expect(scored.relativeWidth).toBeCloseTo(0.25);
    expect(scored.intervalScore).toBe(160);
  });

  it('flags a range that is really a number', () => {
    expect(scoreOne('meal-2', { lo: 610, hi: 610 }, 640).degenerate).toBe(true);
  });
});

describe('summarise', () => {
  it('aggregates and keeps unscored cases visible', () => {
    const scored = [
      scoreOne('a', { lo: 500, hi: 700 }, 600),
      scoreOne('b', { lo: 300, hi: 400 }, 600),
    ];
    const summary = summarise(scored, 3, [0.001, 0.002], [900, 1100]);

    expect(summary.scored).toBe(2);
    expect(summary.unscored).toBe(3);
    expect(summary.coverage).toBe(0.5);
    expect(summary.degenerate).toBe(0);
    expect(summary.totalCostUsd).toBeCloseTo(0.003);
    expect(summary.medianLatencyMs).toBe(1000);
    // (200) and (100 + 20*200 = 4100) -> mean 2150
    expect(summary.meanIntervalScore).toBe(2150);
  });

  it('reports NaN rather than a fake zero when nothing scored', () => {
    const summary = summarise([], 5, [], []);
    expect(Number.isNaN(summary.coverage)).toBe(true);
    expect(Number.isNaN(summary.meanIntervalScore)).toBe(true);
  });
});

describe('DEFAULT_ALPHA', () => {
  it('treats a model range as a 90% interval', () => {
    expect(DEFAULT_ALPHA).toBe(0.1);
  });
});
