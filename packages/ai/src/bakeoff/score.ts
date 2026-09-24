/**
 * How a range is marked.
 *
 * `ARCHITECTURE.md` §6.2 asks for models to be scored "on range accuracy — not on how the
 * output reads". That sentence is easy to agree with and easy to implement wrongly, and
 * the two obvious implementations are both worthless:
 *
 * **Coverage alone** — the fraction of meals whose true calories fell inside the range —
 * is maximised by answering "0 to 10,000" every time. Perfect score, no information.
 *
 * **Width alone** — how tight the ranges are — is maximised by answering "610 to 611"
 * every time. Perfect score, always wrong.
 *
 * Either metric on its own pays a model to cheat in one direction, and a model that
 * produces confidently wrong ranges "does not save money, it destroys the feature"
 * (§6.2). So the headline number here is the **interval score**, which is a *proper*
 * scoring rule: the way to minimise it is to report your honest interval, and both cheats
 * are punished by construction. For a central (1 − alpha) interval [l, u] and a true
 * value y:
 *
 *     score = (u - l)                        the width you claimed
 *           + (2/alpha) * (l - y)   if y < l  the miss, if you were too high
 *           + (2/alpha) * (y - u)   if y > u  the miss, if you were too low
 *
 * Widening to guarantee coverage costs you the first term. Narrowing to look sharp risks
 * the second, which is scaled up by 2/alpha — at the default alpha of 0.1, a miss costs
 * twenty times the distance by which you missed. Lower is better, and the units are
 * calories, so the number means something: it is roughly "the width of range this model
 * effectively delivers once its misses are paid for".
 *
 * Coverage and width are still reported alongside, because the interval score is the
 * right way to *rank* and a poor way to *diagnose* — two models can score alike, one
 * because it is honestly uncertain and one because it is sharp and occasionally very
 * wrong, and those two are not the same product.
 */

import { contains, isDegenerate, relativeWidth, width, type Range } from '../range';

/**
 * One minus the nominal coverage of the interval being scored. 0.1 treats a model's range
 * as a 90% interval, which is the weakest claim compatible with a product whose whole
 * proposition is that its numbers can be trusted.
 */
export const DEFAULT_ALPHA = 0.1;

export type Scored = {
  id: string;
  predicted: Range;
  truth: number;
  intervalScore: number;
  covered: boolean;
  relativeWidth: number;
  degenerate: boolean;
};

/** The interval score for a single prediction. Lower is better; never negative. */
export function intervalScore(predicted: Range, truth: number, alpha = DEFAULT_ALPHA): number {
  if (alpha <= 0 || alpha >= 1) {
    throw new RangeError(`alpha must be strictly between 0 and 1, got ${alpha}`);
  }
  const penalty = 2 / alpha;
  const below = predicted.lo > truth ? penalty * (predicted.lo - truth) : 0;
  const above = truth > predicted.hi ? penalty * (truth - predicted.hi) : 0;
  return width(predicted) + below + above;
}

export function scoreOne(
  id: string,
  predicted: Range,
  truth: number,
  alpha = DEFAULT_ALPHA,
): Scored {
  return {
    id,
    predicted,
    truth,
    intervalScore: intervalScore(predicted, truth, alpha),
    covered: contains(predicted, truth),
    relativeWidth: relativeWidth(predicted, truth),
    degenerate: isDegenerate(predicted),
  };
}

export type Summary = {
  /** How many cases produced a range at all. */
  scored: number;
  /** Cases where no range could be produced — a refusal, a bad schema, a table miss. */
  unscored: number;
  /** The headline. Mean interval score in calories; lower is better. */
  meanIntervalScore: number;
  /** Fraction of scored cases whose true value fell inside the range. */
  coverage: number;
  /** Median of (hi - lo) / truth. The sharpness half of the picture. */
  medianRelativeWidth: number;
  /**
   * Ranges that were a single number. Every one of these is a violation of
   * `CLAUDE.md` non-negotiable 4, and a model that produces them is not shippable here
   * however well it scores otherwise.
   */
  degenerate: number;
  totalCostUsd: number;
  medianLatencyMs: number;
};

function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] as number;
  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function summarise(
  scored: Scored[],
  unscored: number,
  costsUsd: number[],
  latenciesMs: number[],
): Summary {
  return {
    scored: scored.length,
    unscored,
    meanIntervalScore: mean(scored.map((s) => s.intervalScore)),
    coverage:
      scored.length === 0 ? Number.NaN : scored.filter((s) => s.covered).length / scored.length,
    medianRelativeWidth: median(scored.map((s) => s.relativeWidth)),
    degenerate: scored.filter((s) => s.degenerate).length,
    totalCostUsd: costsUsd.reduce((total, cost) => total + cost, 0),
    medianLatencyMs: median(latenciesMs),
  };
}
