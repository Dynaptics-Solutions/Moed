import { capacity } from './capacity';

/**
 * The over-limit gate: what the app offers when a record would not fit.
 *
 * The rule it exists to serve is that **the app proposes; it never moves anything.**
 * Everything here returns a suggestion for a person to accept or ignore. Nothing in
 * this file writes, and nothing that consumes it may act without a tap.
 *
 * Two concrete fixes, and "Add it anyway" always available. Never a dead end.
 */

export type GateSubject = {
  /** What the day already holds. */
  committed: number;
  fixed: number;
  limit: number;
  /** What is being added, and whether it is time the user chose. */
  adding: number;
  addingIsFixed?: boolean;
};

/** A record already on the day that could move instead. */
export type MoveCandidate = {
  id: string;
  title: string;
  lengthMinutes: number;
};

/** A day it could move to, and how much room that day has. */
export type DayCandidate = {
  /** Epoch ms of the day's local midnight. */
  date: number;
  free: number;
  /** "Thursday", "Friday" — what the option names. */
  label: string;
  isEmpty: boolean;
};

export type GateOption =
  | {
      kind: 'move';
      record: MoveCandidate;
      day: DayCandidate;
      /** "Thursday is empty", "Thursday has 4h free". */
      detail: string;
    }
  | {
      kind: 'shorten';
      toMinutes: number;
    };

export type Gate = {
  /** How far past the limit adding this would put the day. Zero means it fits. */
  overBy: number;
  fits: boolean;
  /** At most two, in the order they should be offered. */
  options: GateOption[];
};

/**
 * Whether the record fits, by how much it does not, and what could be done instead.
 *
 * The move option is offered first because it keeps the whole commitment; shortening
 * gives something up. Both are omitted when they cannot honestly be offered — a day
 * with no room at all cannot host a shortened version of anything, and there is no
 * point naming a move to a day that has no space either.
 */
export function gate(
  subject: GateSubject,
  moveCandidates: readonly MoveCandidate[] = [],
  dayCandidates: readonly DayCandidate[] = [],
): Gate {
  const after = capacity({
    committed: subject.committed + (subject.addingIsFixed ? 0 : subject.adding),
    fixed: subject.fixed + (subject.addingIsFixed ? subject.adding : 0),
    limit: subject.limit,
  });

  if (!after.isOver) return { overBy: 0, fits: true, options: [] };

  const options: GateOption[] = [];

  const move = bestMove(moveCandidates, dayCandidates, after.over);
  if (move) options.push(move);

  const shorten = shortenTo(subject);
  if (shorten !== null) options.push({ kind: 'shorten', toMinutes: shorten });

  return { overBy: after.over, fits: false, options };
}

/**
 * The smallest record that would resolve the overage on its own, moved to the nearest
 * day that can take it.
 *
 * Smallest rather than largest on purpose: the suggestion should disturb as little as
 * possible. Moving a four-hour block to clear forty minutes is technically a fix and
 * obviously the wrong advice.
 */
export function bestMove(
  candidates: readonly MoveCandidate[],
  days: readonly DayCandidate[],
  overBy: number,
): Extract<GateOption, { kind: 'move' }> | null {
  const sufficient = candidates
    .filter((c) => c.lengthMinutes >= overBy)
    .sort((a, b) => a.lengthMinutes - b.lengthMinutes);

  // Nothing on the day is big enough to clear it alone; moving the biggest is the best
  // partial answer, and the caption still tells the truth about what is left.
  const ordered =
    sufficient.length > 0
      ? sufficient
      : [...candidates].sort((a, b) => b.lengthMinutes - a.lengthMinutes);

  const record = ordered[0];
  if (!record) return null;

  const day = [...days]
    .filter((d) => d.free >= record.lengthMinutes)
    .sort((a, b) => a.date - b.date)[0];
  if (!day) return null;

  return {
    kind: 'move',
    record,
    day,
    detail: day.isEmpty ? `${day.label} is empty` : `${day.label} has ${day.free} minutes free`,
  };
}

/**
 * The length this record would have to be to fit exactly. Null when the day has no
 * room at all, because "shorten this to nothing" is not an offer.
 */
export function shortenTo(subject: GateSubject): number | null {
  const room = subject.limit - subject.committed - subject.fixed;
  if (room <= 0) return null;
  if (room >= subject.adding) return null;
  return room;
}
