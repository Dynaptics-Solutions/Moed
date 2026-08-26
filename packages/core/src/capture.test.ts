import { describe, expect, it } from 'vitest';

import { parseCapture, parsedSummary } from './capture';

/** Wednesday 26 August 2026, 09:00 local. Every relative date below reads from here. */
const REF = new Date(2026, 7, 26, 9, 0, 0, 0);

const parse = (input: string) => parseCapture(input, { reference: REF });

describe('parseCapture', () => {
  it('reads the line the design uses as its example', () => {
    // "dentist thu 2pm, 25 min drive" — the case ARCHITECTURE names.
    //
    // The 25 minutes is read as the record's length here. In the design it is travel
    // time, which is a different thing and a paid one — the `appt` form owns it, and
    // renders it as "Kensington · leave 13:35". Until that form exists, reading it as
    // a length is the plain behaviour and the user can see and change it.
    const p = parse('dentist thu 2pm, 25 min drive');

    expect(p.lengthMinutes).toBe(25);
    expect(p.hasTime).toBe(true);
    expect(new Date(p.startAt!).getHours()).toBe(14);
    expect(new Date(p.startAt!).getDay()).toBe(4); // Thursday
    expect(p.title).toBe('dentist, drive');
  });

  it('keeps the whole line as the title when it names nothing', () => {
    const p = parse('Call the framer about the print');

    expect(p.title).toBe('Call the framer about the print');
    expect(p.startAt).toBeUndefined();
    expect(p.lengthMinutes).toBeUndefined();
    expect(p.matched).toEqual([]);
  });

  it('reads a day without a time, and says so', () => {
    const p = parse('Reply to Marta on Friday');

    expect(p.startAt).toBeDefined();
    expect(p.hasTime).toBe(false);
    expect(new Date(p.startAt!).getDay()).toBe(5);
    expect(p.title).toBe('Reply to Marta');
  });

  it('looks forward, never back', () => {
    // Tuesday has already gone this week; the next one is meant, not the last.
    const p = parse('Standup Tuesday');

    expect(p.startAt).toBeGreaterThan(REF.getTime());
  });

  it('reads the length forms people actually type', () => {
    const cases: [string, number][] = [
      ['Draft the roadmap 2h', 120],
      ['Draft the roadmap 90m', 90],
      ['Draft the roadmap 25 min', 25],
      ['Draft the roadmap 45 minutes', 45],
      ['Draft the roadmap 1h30', 90],
      ['Draft the roadmap 1h 30m', 90],
      ['Draft the roadmap 2 hours 15 minutes', 135],
      ['Draft the roadmap 1.5 hours', 90],
      ['Draft the roadmap half day', 285],
    ];

    for (const [input, minutes] of cases) {
      expect(parse(input).lengthMinutes, input).toBe(minutes);
    }
  });

  it('does not read a bare hour out of a compound length', () => {
    // "1h30" must not come back as 60 with a stray 30 left in the title.
    const p = parse('Draft the roadmap 1h30');

    expect(p.lengthMinutes).toBe(90);
    expect(p.title).toBe('Draft the roadmap');
  });

  it('does not mistake a clock time for a length', () => {
    const p = parse('Dentist at 2pm');

    expect(p.lengthMinutes).toBeUndefined();
    expect(new Date(p.startAt!).getHours()).toBe(14);
    expect(p.title).toBe('Dentist');
  });

  it('tidies the punctuation a lifted phrase leaves behind', () => {
    const p = parse('Dentist, Thursday, 40m');

    expect(p.title).toBe('Dentist');
  });

  it('takes a title from the middle without joining the words either side', () => {
    const p = parse('call the framer tomorrow about the print');

    expect(p.title).toBe('call the framer about the print');
  });

  it('reads a length written before the title', () => {
    const p = parse('40m rewrite the onboarding copy');

    expect(p.lengthMinutes).toBe(40);
    expect(p.title).toBe('rewrite the onboarding copy');
  });
});

describe('parsedSummary', () => {
  it('names what it understood, in the caption the design writes', () => {
    const p = parse('Rewrite the copy Thursday 40m');

    expect(parsedSummary(p)).toBe('Parsed “Thursday 40m” out of what you typed.');
  });

  it('says nothing rather than saying it understood nothing', () => {
    expect(parsedSummary(parse('Call the framer'))).toBeNull();
  });
});
