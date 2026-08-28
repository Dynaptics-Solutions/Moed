import { describe, expect, it } from 'vitest';

import {
  eventLengthMinutes,
  isImportable,
  reconcileCalendar,
  type CalendarEvent,
  type MirroredRecord,
} from './calendar';

const at = (hour: number, minute = 0) => new Date(2026, 7, 28, hour, minute, 0, 0).getTime();

const event = (
  id: string,
  from: number,
  to: number,
  title = id,
  allDay = false,
): CalendarEvent => ({
  id,
  title,
  startAt: from,
  endAt: to,
  allDay,
});

const mirror = (
  id: string,
  eventId: string,
  startAt: number,
  lengthMinutes: number,
  title = eventId,
): MirroredRecord => ({ id, calendarEventId: eventId, title, startAt, lengthMinutes });

describe('eventLengthMinutes', () => {
  it('measures an event in the unit the bar reads', () => {
    expect(eventLengthMinutes(event('a', at(9), at(10, 30)))).toBe(90);
  });

  it('never returns a negative length for an event that ends before it starts', () => {
    expect(eventLengthMinutes(event('a', at(10), at(9)))).toBe(0);
  });
});

describe('isImportable', () => {
  it('leaves out an all-day event', () => {
    // A birthday is a label on the date, not hours spent. Importing it as 24 hours of
    // fixed time would put the day permanently past its limit.
    expect(isImportable(event('birthday', at(0), at(24), 'Birthday', true))).toBe(false);
  });

  it('leaves out a zero-length marker', () => {
    expect(isImportable(event('marker', at(9), at(9)))).toBe(false);
  });

  it('takes an ordinary appointment', () => {
    expect(isImportable(event('dentist', at(14), at(15)))).toBe(true);
  });
});

describe('reconcileCalendar', () => {
  it('adds an event nothing mirrors yet', () => {
    const plan = reconcileCalendar([event('dentist', at(14), at(15))], []);

    expect(plan.add.map((e) => e.id)).toEqual(['dentist']);
    expect(plan.update).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  it('leaves an unchanged mirror alone', () => {
    const plan = reconcileCalendar(
      [event('dentist', at(14), at(15))],
      [mirror('r1', 'dentist', at(14), 60)],
    );

    expect(plan).toEqual({ add: [], update: [], remove: [] });
  });

  it('updates a mirror whose event moved', () => {
    const plan = reconcileCalendar(
      [event('dentist', at(16), at(17))],
      [mirror('r1', 'dentist', at(14), 60)],
    );

    expect(plan.update).toHaveLength(1);
    expect(plan.update[0]?.record.id).toBe('r1');
    expect(plan.update[0]?.event.startAt).toBe(at(16));
  });

  it('updates a mirror whose event was renamed or re-timed', () => {
    const renamed = reconcileCalendar(
      [event('dentist', at(14), at(15), 'Dentist, moved room')],
      [mirror('r1', 'dentist', at(14), 60, 'Dentist')],
    );
    expect(renamed.update).toHaveLength(1);

    const lengthened = reconcileCalendar(
      [event('dentist', at(14), at(16))],
      [mirror('r1', 'dentist', at(14), 60)],
    );
    expect(lengthened.update).toHaveLength(1);
  });

  it('removes a mirror whose event is gone', () => {
    const plan = reconcileCalendar([], [mirror('r1', 'dentist', at(14), 60)]);

    expect(plan.remove.map((r) => r.id)).toEqual(['r1']);
  });

  it('does not import an all-day event, and removes one imported before', () => {
    // The rule has to hold in both directions, or turning it on cleans up after itself
    // and the next sync puts the day back into permanent red.
    const plan = reconcileCalendar(
      [event('holiday', at(0), at(24), 'Bank holiday', true)],
      [mirror('r1', 'holiday', at(0), 1440)],
    );

    expect(plan.add).toEqual([]);
    expect(plan.remove.map((r) => r.id)).toEqual(['r1']);
  });

  it('handles a mixed window in one pass', () => {
    const plan = reconcileCalendar(
      [event('keep', at(9), at(10)), event('moved', at(16), at(17)), event('new', at(11), at(12))],
      [
        mirror('r-keep', 'keep', at(9), 60),
        mirror('r-moved', 'moved', at(14), 60),
        mirror('r-gone', 'gone', at(13), 30),
      ],
    );

    expect(plan.add.map((e) => e.id)).toEqual(['new']);
    expect(plan.update.map((u) => u.record.id)).toEqual(['r-moved']);
    expect(plan.remove.map((r) => r.id)).toEqual(['r-gone']);
  });
});
