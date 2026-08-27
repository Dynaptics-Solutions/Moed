import { describe, expect, it } from 'vitest';

import {
  dayBounds,
  isSameDay,
  isWeekend,
  isoWeek,
  isoWeekYear,
  mondayIndex,
  monthGridBounds,
  weekBounds,
} from './dates';

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h);

describe('isoWeek', () => {
  it('numbers an ordinary week', () => {
    // Wednesday 26 August 2026 is in ISO week 35, as the week screen prints.
    expect(isoWeek(d(2026, 8, 26))).toBe(35);
  });

  it('gives every day of one week the same number', () => {
    const week = [23, 24, 25, 26, 27, 28, 29].map((day) => isoWeek(d(2026, 8, day)));
    // 23 August 2026 is a Sunday, so it closes the previous week.
    expect(week[0]).toBe(34);
    expect(week.slice(1)).toEqual([35, 35, 35, 35, 35, 35]);
  });

  it('puts a new year that starts late in the previous year last week', () => {
    // 1 January 2027 is a Friday, so it belongs to week 53 of 2026.
    expect(isoWeek(d(2027, 1, 1))).toBe(53);
    expect(isoWeekYear(d(2027, 1, 1))).toBe(2026);
  });

  it('puts a new year that starts early in week 1', () => {
    // 1 January 2026 is a Thursday, which always makes it week 1.
    expect(isoWeek(d(2026, 1, 1))).toBe(1);
    expect(isoWeekYear(d(2026, 1, 1))).toBe(2026);
  });

  it('reads the end of December into the next year when the week runs on', () => {
    // 31 December 2024 is a Tuesday, in the week that holds 2 January 2025.
    expect(isoWeek(d(2024, 12, 31))).toBe(1);
    expect(isoWeekYear(d(2024, 12, 31))).toBe(2025);
  });

  it('counts a 53-week year to 53', () => {
    // 2026 is a long year: it starts on a Thursday.
    expect(isoWeek(d(2026, 12, 31))).toBe(53);
  });
});

describe('weekBounds', () => {
  it('starts on Monday whatever day is asked for', () => {
    for (const day of [24, 25, 26, 27, 28, 29, 30]) {
      const { start } = weekBounds(d(2026, 8, day));
      expect(new Date(start).getDay()).toBe(1);
      expect(new Date(start).getDate()).toBe(24);
    }
  });

  it('treats Sunday as the end of the week, not the start', () => {
    const { start } = weekBounds(d(2026, 8, 30)); // a Sunday
    expect(new Date(start).getDate()).toBe(24);
  });

  it('spans exactly seven days', () => {
    const { start, end } = weekBounds(d(2026, 8, 26));
    expect(new Date(end).getDate() - new Date(start).getDate()).toBe(7);
  });

  it('starts at local midnight', () => {
    const { start } = weekBounds(d(2026, 8, 26, 23));
    const s = new Date(start);
    expect([s.getHours(), s.getMinutes(), s.getSeconds()]).toEqual([0, 0, 0]);
  });
});

describe('monthGridBounds', () => {
  it('covers whole weeks either side of the month', () => {
    const { start, end, firstOfMonth } = monthGridBounds(d(2026, 8, 26));

    expect(firstOfMonth.getMonth()).toBe(7);
    expect(new Date(start).getDay()).toBe(1);
    // August 2026 starts on a Saturday, so the grid opens on 27 July.
    expect(new Date(start).getDate()).toBe(27);
    expect(new Date(start).getMonth()).toBe(6);
    // The grid always holds a whole number of weeks.
    expect(Math.round((end - start) / 86_400_000) % 7).toBe(0);
  });

  it('handles a month that begins on a Monday without a leading week', () => {
    // June 2026 begins on a Monday.
    const { start, firstOfMonth } = monthGridBounds(d(2026, 6, 15));
    expect(new Date(start).getDate()).toBe(1);
    expect(new Date(start).getMonth()).toBe(firstOfMonth.getMonth());
  });

  it('gives February in a leap year a whole number of weeks', () => {
    const { start, end } = monthGridBounds(d(2028, 2, 10));
    expect(Math.round((end - start) / 86_400_000) % 7).toBe(0);
  });
});

describe('dayBounds', () => {
  it('runs local midnight to local midnight', () => {
    const { start, end } = dayBounds(d(2026, 8, 26, 15));
    expect(new Date(start).getHours()).toBe(0);
    expect(new Date(start).getDate()).toBe(26);
    expect(new Date(end).getDate()).toBe(27);
  });
});

describe('the small predicates', () => {
  it('reads a weekend', () => {
    expect(isWeekend(d(2026, 8, 29))).toBe(true); // Saturday
    expect(isWeekend(d(2026, 8, 30))).toBe(true); // Sunday
    expect(isWeekend(d(2026, 8, 28))).toBe(false); // Friday
  });

  it('indexes from Monday', () => {
    expect(mondayIndex(d(2026, 8, 24))).toBe(0); // Monday
    expect(mondayIndex(d(2026, 8, 30))).toBe(6); // Sunday
  });

  it('compares days without comparing times', () => {
    expect(isSameDay(d(2026, 8, 26, 1), d(2026, 8, 26, 23))).toBe(true);
    expect(isSameDay(d(2026, 8, 26), d(2026, 9, 26))).toBe(false);
    expect(isSameDay(d(2026, 8, 26), d(2027, 8, 26))).toBe(false);
  });
});
