/**
 * Ranges, and the refusal to render a single number for something we guessed.
 *
 * Non-negotiable 4 in `CLAUDE.md`: *"Estimates are ranges. Never render a single
 * fake-precise number for something we guessed. Ranges tighten as the user confirms
 * detail."* A model asked for a calorie count will happily answer "610", and 610 reads
 * as measurement rather than estimate. The product's entire claim is that its numbers
 * can be trusted, so the type system is where that claim gets enforced — not the prompt,
 * which is a request, and not the UI, which is too late.
 *
 * So an estimate is a `Range` everywhere it travels, and a degenerate range — one where
 * `lo` equals `hi` — is treated as a fault rather than an unusually confident answer.
 * It is a single number wearing a range's clothes, and it is exactly what a model does
 * when it has decided to sound certain.
 */

export type Range = {
  /** The low end, inclusive. */
  lo: number;
  /** The high end, inclusive. Always `>= lo`. */
  hi: number;
};

export class RangeError extends Error {
  constructor(
    message: string,
    readonly received: unknown,
  ) {
    super(message);
    this.name = 'RangeError';
  }
}

/** `hi - lo`. The absolute width, in whatever unit the range is counted in. */
export function width(range: Range): number {
  return range.hi - range.lo;
}

/**
 * Width as a fraction of a reference value — the sharpness measure the bake-off ranks on.
 * Relative, because 60 kcal either side of a 200 kcal apple is a different claim from
 * 60 kcal either side of a 2,000 kcal roast.
 */
export function relativeWidth(range: Range, reference: number): number {
  if (reference <= 0) throw new RangeError('relativeWidth needs a positive reference', reference);
  return width(range) / reference;
}

/** Whether an observed value falls inside the range. Inclusive at both ends. */
export function contains(range: Range, value: number): boolean {
  return value >= range.lo && value <= range.hi;
}

/** The midpoint. For display only — never store this and never show it on its own. */
export function midpoint(range: Range): number {
  return (range.lo + range.hi) / 2;
}

/**
 * A range that is really a point. Not an error in itself — a confirmed food out of the
 * user's own library is exact — but never acceptable from a model, which is what
 * `assertEstimate` is for.
 */
export function isDegenerate(range: Range): boolean {
  return range.lo === range.hi;
}

/**
 * The gate every model-produced estimate passes through.
 *
 * Throws rather than repairing. Widening a degenerate range by some invented percentage
 * would manufacture the confidence interval the model declined to give, which is the
 * same lie one layer down. The caller decides what to do with the failure: the proxy
 * turns it into an error the app can show, and the bake-off counts it against the model.
 */
export function assertEstimate(range: Range): Range {
  if (!Number.isFinite(range.lo) || !Number.isFinite(range.hi)) {
    throw new RangeError('An estimate range must be two finite numbers', range);
  }
  if (range.lo > range.hi) {
    throw new RangeError('An estimate range must have lo <= hi', range);
  }
  if (range.lo < 0) {
    throw new RangeError('An estimate range cannot be negative', range);
  }
  if (isDegenerate(range)) {
    throw new RangeError(
      'An estimate range cannot be a single number — see CLAUDE.md non-negotiable 4',
      range,
    );
  }
  return range;
}
