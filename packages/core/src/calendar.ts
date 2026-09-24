/**
 * One calendar, in and out.
 *
 * The `appt` kind is "fixed, from your calendar" — time the user did not choose, which
 * spends the day from the taupe segment. Until now every appointment had to be typed by
 * hand, so the kind could not behave as designed.
 *
 * The calendar is the source and Moed keeps a mirror. That is the honest way round: the
 * design says an imported appointment is "edited where it came from", so this side must
 * be able to follow a change made elsewhere, and a mirror can be reconciled where a
 * one-time copy can only drift.
 *
 * Mirrored rather than read live for the same reason recurrences are written out: every
 * screen in this app is a live query over `records`, and a day the capacity bar cannot
 * see is a day the product cannot make its one claim about.
 */

/** A calendar event, reduced to the fields a day cares about. */
export type CalendarEvent = {
  id: string;
  title: string;
  /** Epoch ms. */
  startAt: number;
  endAt: number;
  allDay: boolean;
};

/** A record in this app that mirrors one. */
export type MirroredRecord = {
  id: string;
  calendarEventId: string;
  title: string;
  startAt: number | null;
  lengthMinutes: number;
};

export type CalendarPlan = {
  add: CalendarEvent[];
  update: { record: MirroredRecord; event: CalendarEvent }[];
  /** Gone from the calendar. Soft-deleted here, because nothing disappears. */
  remove: MirroredRecord[];
};

/** What an event costs a day. Rounded to the minute, because that is the unit the bar reads. */
export function eventLengthMinutes(event: CalendarEvent): number {
  return Math.max(0, Math.round((event.endAt - event.startAt) / 60_000));
}

/**
 * Which events belong on a day at all.
 *
 * **All-day events are left out, deliberately.** A birthday or a public holiday is a
 * label on the date rather than hours spent, and importing one as twenty-four hours of
 * fixed time would put every such day permanently past its limit. That is precisely the
 * "turns red forever" failure DECISIONS names as a category gap and this product
 * refuses to commit.
 *
 * A zero-length event goes too. It costs the day nothing, so it is a marker rather than
 * a commitment, and a row reading "0m" on the day is noise.
 */
export function isImportable(event: CalendarEvent): boolean {
  return !event.allDay && eventLengthMinutes(event) > 0;
}

/**
 * The difference between what the calendar says and what this app is mirroring.
 *
 * Returns work rather than doing it: nothing here writes, so the rule can be tested
 * without a database and the same answer serves a first import and every one after.
 */
export function reconcileCalendar(
  events: readonly CalendarEvent[],
  mirrored: readonly MirroredRecord[],
): CalendarPlan {
  const importable = events.filter(isImportable);
  const byEventId = new Map(mirrored.map((m) => [m.calendarEventId, m]));
  const seen = new Set<string>();

  const add: CalendarEvent[] = [];
  const update: { record: MirroredRecord; event: CalendarEvent }[] = [];

  for (const event of importable) {
    seen.add(event.id);
    const record = byEventId.get(event.id);

    if (!record) {
      add.push(event);
      continue;
    }

    const changed =
      record.title !== event.title ||
      record.startAt !== event.startAt ||
      record.lengthMinutes !== eventLengthMinutes(event);

    if (changed) update.push({ record, event });
  }

  return { add, update, remove: mirrored.filter((m) => !seen.has(m.calendarEventId)) };
}
