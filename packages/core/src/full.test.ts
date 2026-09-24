import { describe, expect, it } from 'vitest';

import { full, type DayRecord } from './full';

const DAY = 570;

const r = (
  id: string,
  lengthMinutes: number,
  startAt: number | null,
  isFixed = false,
  state: DayRecord['state'] = 'open',
): DayRecord => ({ id, title: id, lengthMinutes, startAt, isFixed, state });

const at = (hour: number) => new Date(2026, 7, 26, hour, 0, 0, 0).getTime();

describe('full', () => {
  it('says nothing about a day that fits', () => {
    const day = full([r('a', 120, at(9)), r('b', 60, at(14))], DAY);

    expect(day.isOver).toBe(false);
    expect(day.overBy).toBe(0);
    expect(day.past).toEqual([]);
  });

  it('is not over on a day that lands exactly on the limit', () => {
    expect(full([r('a', DAY, at(9))], DAY).isOver).toBe(false);
  });

  it('names the records the day reaches after the limit', () => {
    // 300 + 300 passes 570 at the second, so the second and the third are both past.
    const day = full([r('a', 300, at(9)), r('b', 300, at(15)), r('c', 60, at(19))], DAY);

    expect(day.isOver).toBe(true);
    expect(day.overBy).toBe(90);
    expect(day.past.map((p) => p.id)).toEqual(['b', 'c']);
  });

  it('marks only what is actually past, not everything after the busiest record', () => {
    // 300 + 240 is 540 and fits; only the last one crosses.
    const day = full([r('a', 300, at(9)), r('b', 240, at(15)), r('c', 60, at(19))], DAY);

    expect(day.overBy).toBe(30);
    expect(day.past.map((p) => p.id)).toEqual(['c']);
  });

  it('reads the day in time order rather than the order it was given', () => {
    const day = full([r('late', 300, at(18)), r('early', 300, at(8))], DAY);

    expect(day.past.map((p) => p.id)).toEqual(['late']);
  });

  it('reaches what has no time on it last', () => {
    const day = full([r('untimed', 60, null), r('timed', 540, at(9))], DAY);

    expect(day.past.map((p) => p.id)).toEqual(['untimed']);
  });

  it('counts fixed time against the limit like any other', () => {
    // An appointment is time you did not choose. It still spends the day.
    const day = full([r('appt', 300, at(9), true), r('task', 300, at(15))], DAY);

    expect(day.overBy).toBe(30);
    expect(day.past.map((p) => p.id)).toEqual(['task']);
  });

  it('ignores what left the day', () => {
    const day = full(
      [
        r('here', 300, at(9)),
        r('moved', 300, at(12), false, 'moved'),
        r('dropped', 300, at(15), false, 'dropped'),
        r('waiting', 300, at(17), false, 'tray'),
      ],
      DAY,
    );

    expect(day.isOver).toBe(false);
    expect(day.past).toEqual([]);
  });

  it('counts a finished record, because it spent the day', () => {
    const day = full([r('done', 400, at(9), false, 'done'), r('open', 300, at(16))], DAY);

    expect(day.overBy).toBe(130);
    expect(day.past.map((p) => p.id)).toEqual(['open']);
  });
});
