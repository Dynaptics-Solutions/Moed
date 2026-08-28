import { describe, expect, it } from 'vitest';

import { bestMove, gate, shortenTo, type DayCandidate, type MoveCandidate } from './gate';

const DAY = 570;

const day = (label: string, date: number, free: number, isEmpty = free >= DAY): DayCandidate => ({
  label,
  date,
  free,
  isEmpty,
});

describe('gate', () => {
  it('says nothing when the record fits', () => {
    const g = gate({ committed: 320, fixed: 150, limit: DAY, adding: 60 });

    expect(g.fits).toBe(true);
    expect(g.overBy).toBe(0);
    expect(g.options).toEqual([]);
  });

  it('names the overage in minutes, as the sheet does', () => {
    // The mockup: adding 2h to a day already holding 5h 40m of work and 2h 30m fixed
    // lands 40 minutes over.
    const g = gate({ committed: 340, fixed: 150, limit: DAY, adding: 120 });

    expect(g.fits).toBe(false);
    expect(g.overBy).toBe(40);
  });

  it('offers the move first and the shorten second', () => {
    const candidates: MoveCandidate[] = [{ id: 'r1', title: 'Q4 roadmap', lengthMinutes: 60 }];
    const g = gate({ committed: 340, fixed: 150, limit: DAY, adding: 120 }, candidates, [
      day('Thursday', 2, DAY),
    ]);

    expect(g.options.map((o) => o.kind)).toEqual(['move', 'shorten']);
  });

  it('always leaves a way through, even with nothing to offer', () => {
    // No candidates and no room to shorten into. The sheet still names the overage, and
    // "Add it anyway" is not this function's to withhold.
    const g = gate({ committed: 570, fixed: 0, limit: DAY, adding: 60 });

    expect(g.fits).toBe(false);
    expect(g.overBy).toBe(60);
    expect(g.options).toEqual([]);
  });

  it('counts a fixed record against the fixed segment', () => {
    const asChosen = gate({ committed: 0, fixed: 0, limit: DAY, adding: 600 });
    const asFixed = gate({
      committed: 0,
      fixed: 0,
      limit: DAY,
      adding: 600,
      addingIsFixed: true,
    });

    expect(asChosen.overBy).toBe(30);
    expect(asFixed.overBy).toBe(30);
  });
});

describe('bestMove', () => {
  const days = [day('Thursday', 2, DAY), day('Friday', 3, DAY)];

  it('moves the smallest record that clears the overage', () => {
    // Moving a four-hour block to clear forty minutes is a fix and obviously the wrong
    // advice.
    const candidates: MoveCandidate[] = [
      { id: 'big', title: 'Deep work', lengthMinutes: 240 },
      { id: 'small', title: 'Q4 roadmap', lengthMinutes: 60 },
      { id: 'tiny', title: 'Email', lengthMinutes: 15 },
    ];

    const move = bestMove(candidates, days, 40);

    expect(move?.record.id).toBe('small');
  });

  it('falls back to the largest when nothing clears it alone', () => {
    const candidates: MoveCandidate[] = [
      { id: 'a', title: 'One', lengthMinutes: 30 },
      { id: 'b', title: 'Two', lengthMinutes: 45 },
    ];

    expect(bestMove(candidates, days, 120)?.record.id).toBe('b');
  });

  it('takes the nearest day with room, not merely the nearest', () => {
    const candidates: MoveCandidate[] = [{ id: 'a', title: 'Q4 roadmap', lengthMinutes: 240 }];
    const busyThenFree = [day('Thursday', 2, 60, false), day('Friday', 3, DAY)];

    expect(bestMove(candidates, busyThenFree, 40)?.day.label).toBe('Friday');
  });

  it('says what makes the day a good target', () => {
    const candidates: MoveCandidate[] = [{ id: 'a', title: 'Q4 roadmap', lengthMinutes: 60 }];

    expect(bestMove(candidates, [day('Thursday', 2, DAY)], 40)?.detail).toBe('Thursday is empty');
    expect(bestMove(candidates, [day('Thursday', 2, 120, false)], 40)?.detail).toBe(
      'Thursday has 2h free',
    );
  });

  it('offers nothing rather than a move with nowhere to go', () => {
    const candidates: MoveCandidate[] = [{ id: 'a', title: 'Q4 roadmap', lengthMinutes: 240 }];

    expect(bestMove(candidates, [day('Thursday', 2, 60, false)], 40)).toBeNull();
    expect(bestMove([], days, 40)).toBeNull();
  });
});

describe('shortenTo', () => {
  it('returns the length that fits exactly', () => {
    expect(shortenTo({ committed: 340, fixed: 150, limit: DAY, adding: 120 })).toBe(80);
  });

  it('offers nothing when the day has no room at all', () => {
    expect(shortenTo({ committed: 570, fixed: 0, limit: DAY, adding: 60 })).toBeNull();
    expect(shortenTo({ committed: 600, fixed: 0, limit: DAY, adding: 60 })).toBeNull();
  });

  it('offers nothing when the record already fits', () => {
    expect(shortenTo({ committed: 100, fixed: 0, limit: DAY, adding: 60 })).toBeNull();
  });
});
