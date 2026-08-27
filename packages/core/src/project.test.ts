import { describe, expect, it } from 'vitest';

import { projectStats, type ProjectRecord } from './project';

const WEEK = { start: new Date(2026, 7, 24).getTime(), end: new Date(2026, 7, 31).getTime() };
const inWeek = new Date(2026, 7, 26).getTime();
const outsideWeek = new Date(2026, 8, 9).getTime();

const rec = (over: Partial<ProjectRecord> = {}): ProjectRecord => ({
  state: 'open',
  lengthMinutes: 60,
  isFixed: false,
  slipCount: 0,
  startAt: inWeek,
  ...over,
});

describe('projectStats', () => {
  it('counts what is open and what is done', () => {
    const stats = projectStats(
      [rec(), rec(), rec({ state: 'done' }), rec({ state: 'done' }), rec({ state: 'done' })],
      WEEK,
    );

    expect(stats.open).toBe(2);
    expect(stats.done).toBe(3);
  });

  it('owes the sum of what is still open', () => {
    const stats = projectStats(
      [
        rec({ lengthMinutes: 120 }),
        rec({ lengthMinutes: 90 }),
        rec({ state: 'done', lengthMinutes: 300 }),
      ],
      WEEK,
    );

    expect(stats.leftMinutes).toBe(210);
  });

  it('counts only what is scheduled inside the week', () => {
    const stats = projectStats(
      [
        rec({ lengthMinutes: 120, startAt: inWeek }),
        rec({ lengthMinutes: 60, startAt: outsideWeek }),
        rec({ lengthMinutes: 30, startAt: null }),
      ],
      WEEK,
    );

    expect(stats.thisWeekMinutes).toBe(120);
  });

  it('counts a record that slipped, not the number of slips', () => {
    // Two records that have slipped, one of them three times, is two slipped records.
    const stats = projectStats([rec({ slipCount: 3 }), rec({ slipCount: 1 }), rec()], WEEK);

    expect(stats.slipped).toBe(2);
  });

  it('lets a dropped record move the bar', () => {
    // Dropped is a decision that was taken. Leaving the bar stuck at a record someone
    // deliberately abandoned would make it unreadable.
    const stats = projectStats([rec({ state: 'done' }), rec({ state: 'dropped' }), rec()], WEEK);

    expect(stats.progress).toBeCloseTo(2 / 3, 10);
  });

  it('does not count a dropped record as work still owed', () => {
    const stats = projectStats([rec({ state: 'dropped', lengthMinutes: 300 })], WEEK);

    expect(stats.leftMinutes).toBe(0);
    expect(stats.thisWeekMinutes).toBe(0);
    expect(stats.open).toBe(0);
  });

  it('reads an empty project as nought rather than as complete', () => {
    const stats = projectStats([], WEEK);

    expect(stats.progress).toBe(0);
    expect(stats.open).toBe(0);
    expect(stats.leftMinutes).toBe(0);
  });

  it('reads a finished project as done', () => {
    expect(projectStats([rec({ state: 'done' }), rec({ state: 'done' })], WEEK).progress).toBe(1);
  });
});
