/**
 * The capacity bar's arithmetic. The product's signature calculation, and the one
 * number the whole app exists to report — so it lives here, in plain TypeScript, and
 * runs unchanged on the phone and on the server.
 *
 * The rule, settled 26 August 2026:
 *
 *   The bar rescales to total planned. When over, the planned segments compress to
 *   fill exactly the limit, and the excess is drawn past them.
 *
 *     planned     = committed + fixed + estimated
 *     over        = max(0, planned − limit)
 *     free        = max(0, limit − planned)
 *     denominator = max(limit, planned)
 *     scale       = over > 0 ? limit / planned : 1
 *
 *     segments    = committed × scale · fixed × scale · estimated × scale · free · over
 *
 * The segments always sum to the denominator. Under the limit `scale` is 1, the bar is
 * limit-wide and the tail is free. Over it, the planned parts keep their ratio to each
 * other but compress into the limit, and the over segment is the true excess as a
 * fraction of what was planned.
 *
 * The overflow is NOT a fourth segment appended to the others — that double-counts,
 * because the planned segments already contain the excess. It re-colours the tail. No
 * limit tick is needed either: the over segment's left edge *is* the limit.
 *
 * Why rescale at all: the bar keeps one physical width, so two days can be compared,
 * and the overflow becomes honest. Eighty minutes over a 570-minute day is 12 per cent
 * of the bar, not 22 — and a product whose entire claim is that its numbers can be
 * trusted does not get to overstate the one number it exists to report.
 *
 * `estimated` generalises the settled formula, which names only committed and fixed.
 * It is the third *planned* part — pending spending on `spend`, planned-but-not-eaten
 * calories on `diet` — and it renders differently (taupe at .75, dashed trailing edge)
 * because uncertainty is drawn, never hidden. With `estimated` at zero this reduces to
 * the settled formula exactly.
 */

export type CapacityInput = {
  /** Load the user chose: tasks, routines, sessions, errands. Renders `accFill`. */
  committed: number;
  /** Load they did not choose: appointments, bills. Renders `taupe`. */
  fixed: number;
  /** Planned but not yet actual. Renders `taupe` at .75 with a dashed trailing edge. */
  estimated?: number;
  /** The day's minutes, the week's money, the week's calories. */
  limit: number;
};

export type CapacitySegments = {
  committed: number;
  fixed: number;
  estimated: number;
  free: number;
  over: number;
};

export type Capacity = {
  /** Segment sizes in the input's own units. These always sum to `denominator`. */
  segments: CapacitySegments;
  /** committed + fixed + estimated, before any rescaling. */
  planned: number;
  /** What is left of the limit. Zero when over. */
  free: number;
  /** How far past the limit. Zero when under. */
  over: number;
  /**
   * Signed headroom: positive is free, negative is over. This is the number the
   * caption's right-hand side reports, and the one the gate names in minutes.
   */
  remaining: number;
  /** The bar's full width in input units: max(limit, planned). */
  denominator: number;
  /** How much the planned segments are compressed. 1 when under. */
  scale: number;
  isOver: boolean;
  /** Nothing planned at all — the bar draws no fill. */
  isEmpty: boolean;
};

const atLeastZero = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function capacity(input: CapacityInput): Capacity {
  const committed = atLeastZero(input.committed);
  const fixed = atLeastZero(input.fixed);
  const estimated = atLeastZero(input.estimated ?? 0);
  const limit = atLeastZero(input.limit);

  const planned = committed + fixed + estimated;
  const over = Math.max(0, planned - limit);
  const free = Math.max(0, limit - planned);
  const denominator = Math.max(limit, planned);

  // Guarded against planned = 0, which only happens when over is 0 anyway.
  const scale = over > 0 && planned > 0 ? limit / planned : 1;

  return {
    segments: {
      committed: committed * scale,
      fixed: fixed * scale,
      estimated: estimated * scale,
      free,
      over,
    },
    planned,
    free,
    over,
    remaining: limit - planned,
    denominator,
    scale,
    isOver: over > 0,
    isEmpty: planned === 0,
  };
}

/**
 * Segment sizes in device pixels, with the 2px floor that stops a five-minute record
 * from vanishing.
 *
 * The floor has to be applied in pixels rather than by flex-growing the raw values,
 * because "2px" is not expressible as a flex ratio without knowing the width. Any
 * non-zero segment thinner than `minPx` is raised to it, and the pixels that costs are
 * taken back proportionally from the segments that can spare them.
 *
 * When the bar is too narrow to give every non-zero segment its floor, the floor is
 * abandoned rather than overflowing the container: a bar that is wider than its own
 * frame is a worse lie than a hairline segment.
 */
export function segmentWidths(
  segments: CapacitySegments,
  denominator: number,
  totalPx: number,
  minPx = 2,
): CapacitySegments {
  const keys = ['committed', 'fixed', 'estimated', 'free', 'over'] as const;

  if (denominator <= 0 || totalPx <= 0) {
    return { committed: 0, fixed: 0, estimated: 0, free: 0, over: 0 };
  }

  const raw = Object.fromEntries(
    keys.map((k) => [k, (segments[k] / denominator) * totalPx]),
  ) as CapacitySegments;

  const nonZero = keys.filter((k) => segments[k] > 0);
  if (nonZero.length * minPx > totalPx) return raw;

  const short = nonZero.filter((k) => raw[k] < minPx);
  if (short.length === 0) return raw;

  const out = { ...raw };
  let deficit = 0;
  for (const k of short) {
    deficit += minPx - out[k];
    out[k] = minPx;
  }

  // Take the pixels back from the segments that are above the floor, in proportion to
  // how much room each has above it — so the widest segment gives up the most.
  const donors = nonZero.filter((k) => !short.includes(k));
  const spare = donors.reduce((sum, k) => sum + (out[k] - minPx), 0);
  if (spare > 0) {
    for (const k of donors) {
      out[k] -= deficit * ((out[k] - minPx) / spare);
    }
  }

  return out;
}
