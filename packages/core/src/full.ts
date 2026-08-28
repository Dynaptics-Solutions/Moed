import { capacity } from './capacity';
import type { LoadContribution } from './load';

/**
 * `full` — the day that is already over its limit.
 *
 * The gate is about adding; this is about the day as it stands. A day goes over without
 * anyone passing a gate all the time: an appointment runs long and is edited, a record
 * is moved in from the tray, a short night lowers the limit. The claim the product
 * makes is that it tells you when you have passed the limit, and it has to hold whether
 * or not the app was watching when it happened.
 *
 * Nothing here writes. It says which records fall past the line, and the screen offers
 * one tap each. The app proposes; it never moves anything.
 */

export type DayRecord = LoadContribution & {
  id: string;
  title: string;
  /** Epoch ms, or null for something owed today with no time on it. */
  startAt: number | null;
};

export type Full = {
  isOver: boolean;
  /** How far past the limit the day is. */
  overBy: number;
  /**
   * The records that fall past the line, in the order the day reaches them. The first
   * is the one the limit is crossed during; everything after it is past too.
   */
  past: DayRecord[];
};

/**
 * Which records fall past the limit, reading the day in the order it happens.
 *
 * The rule is the plainest one available: walk the day forwards, add up what each
 * record costs, and once the running total is past the limit that record and every
 * later one is past it. That makes "past the limit" a fact about *when* a record sits
 * rather than a judgement about which one is least important — the app does not rank
 * a person's commitments, and any rule that picked the "offending" record by size or
 * kind would be doing exactly that.
 *
 * Records that left the day — moved, dropped, or waiting in the tray — cost it nothing
 * and cannot be past its limit, which is the same rule `dayLoad` follows.
 *
 * A record with no time on it is reached last, because a day gets to whatever is not
 * at a particular time when it gets to it.
 */
export function full(records: readonly DayRecord[], limit: number): Full {
  const counted = records.filter(
    (r) => r.state !== 'moved' && r.state !== 'dropped' && r.state !== 'tray',
  );

  const c = capacity({
    committed: counted.filter((r) => !r.isFixed).reduce((n, r) => n + r.lengthMinutes, 0),
    fixed: counted.filter((r) => r.isFixed).reduce((n, r) => n + r.lengthMinutes, 0),
    limit,
  });

  if (!c.isOver) return { isOver: false, overBy: 0, past: [] };

  const inOrder = [...counted].sort((a, b) => {
    if (a.startAt === b.startAt) return 0;
    if (a.startAt === null) return 1;
    if (b.startAt === null) return -1;
    return a.startAt - b.startAt;
  });

  let running = 0;
  const past: DayRecord[] = [];

  for (const record of inOrder) {
    running += record.lengthMinutes;
    if (running > limit) past.push(record);
  }

  return { isOver: true, overBy: c.over, past };
}
