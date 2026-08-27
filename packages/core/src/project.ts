import type { LoadContribution } from './load';

/**
 * What a project's records add up to.
 *
 * Every figure here is a count or a sum of the user's own records — nothing is
 * estimated, weighted or predicted. A project bar that moves for a reason nobody can
 * reconstruct is exactly the kind of number this product does not print.
 */

export type ProjectRecord = LoadContribution & {
  slipCount: number;
  startAt: number | null;
};

export type ProjectStats = {
  open: number;
  done: number;
  /** Minutes still owed: the open records' lengths. */
  leftMinutes: number;
  /** Minutes of it scheduled inside the given week. */
  thisWeekMinutes: number;
  /** How many of its records have slipped at least once. */
  slipped: number;
  /**
   * Done as a share of everything decided. Dropped records count as decided — they were
   * dealt with — so abandoning work moves the bar rather than leaving it stuck.
   */
  progress: number;
};

export function projectStats(
  records: readonly ProjectRecord[],
  week: { start: number; end: number },
): ProjectStats {
  let open = 0;
  let done = 0;
  let dropped = 0;
  let leftMinutes = 0;
  let thisWeekMinutes = 0;
  let slipped = 0;

  for (const r of records) {
    if (r.slipCount > 0) slipped += 1;

    if (r.state === 'done') done += 1;
    else if (r.state === 'dropped') dropped += 1;
    else {
      open += 1;
      leftMinutes += r.lengthMinutes;
    }

    if (
      r.state !== 'dropped' &&
      r.startAt !== null &&
      r.startAt >= week.start &&
      r.startAt < week.end
    ) {
      thisWeekMinutes += r.lengthMinutes;
    }
  }

  const decided = done + dropped;
  const total = decided + open;

  return {
    open,
    done,
    leftMinutes,
    thisWeekMinutes,
    slipped,
    progress: total === 0 ? 0 : decided / total,
  };
}
