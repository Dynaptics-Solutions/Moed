import { reconcileCalendar, type CalendarEvent, type MirroredRecord } from '@moed/core';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import * as Calendar from 'expo-calendar';
import { randomUUID } from 'expo-crypto';

import { db } from './client';
import { records } from './schema';
import { setSetting, useBooleanSetting, useStringSetting } from './settings';
import { currentUserId } from '@/lib/user';

/**
 * One calendar, in and out.
 *
 * "In" mirrors the connected calendar's events as appointments, so they spend the day
 * from the taupe segment like any other time the user did not choose — which is the
 * whole reason the `appt` kind exists, and something it could not do while every
 * appointment had to be typed by hand.
 *
 * "Out" writes Moed's own records back, so a planner that counts hours is visible in
 * the place other people look for your hours.
 *
 * Nothing here happens on its own. The calendar is connected by a tap, the sync runs
 * when the app opens or the screen is looked at, and writing out stays off until it is
 * turned on: the app proposes, and putting rows into someone's shared work calendar
 * unasked is the furthest thing from proposing.
 */

/** The connected calendar's id, and whether Moed writes its own records back into it. */
export const CALENDAR_ID_KEY = 'calendarId';
export const CALENDAR_OUT_KEY = 'calendarWriteOut';

/**
 * How much of the calendar is mirrored: a week back, a quarter forward.
 *
 * Back at all, because the tray and the shut day read days that have gone, and an
 * appointment vanishing from last Tuesday the moment it passed would make those screens
 * disagree with the calendar they came from.
 *
 * A quarter forward, because the week and month views never reach further, and
 * mirroring a year of somebody's work calendar to fill a screen nobody has opened is a
 * cost with no reader.
 */
export const WINDOW_BACK_DAYS = 7;
export const WINDOW_FORWARD_DAYS = 90;

export type PhoneCalendar = { id: string; title: string; source: string; writable: boolean };

/**
 * Asked at the tap that connects a calendar, never at launch — the same rule the
 * evening close follows, for the same reason.
 */
export async function askForCalendarPermission(): Promise<boolean> {
  const existing = await Calendar.getCalendarPermissions();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;

  return (await Calendar.requestCalendarPermissions()).granted;
}

/** Every calendar on the phone, reduced to what choosing one needs. */
export async function listCalendars(): Promise<PhoneCalendar[]> {
  const found = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);

  return found.map((c) => ({
    id: c.id,
    title: c.title,
    source: c.source?.name ?? '',
    writable: c.allowsModifications,
  }));
}

/** The window's bounds, as the two dates the calendar is asked for. */
export function syncWindow(now: Date): { from: Date; to: Date } {
  const from = new Date(now);
  from.setDate(from.getDate() - WINDOW_BACK_DAYS);
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setDate(to.getDate() + WINDOW_FORWARD_DAYS);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

const asMs = (value: string | Date): number =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

const lengthOf = (event: { startAt: number; endAt: number }): number =>
  Math.max(0, Math.round((event.endAt - event.startAt) / 60_000));

/**
 * Pull the connected calendar's events in, and take out what is no longer there.
 *
 * What to add, change and remove is `reconcileCalendar`'s decision — in core, and
 * tested. This only carries it out. Removal is soft, like every other delete here:
 * nothing disappears, and an appointment that was cancelled is part of the record of
 * the day it was cancelled from.
 */
export async function importCalendar(calendarId: string, now = new Date()): Promise<number> {
  const { from, to } = syncWindow(now);
  const userId = currentUserId();

  const found = await Calendar.listEvents([calendarId], from, to);

  const events: CalendarEvent[] = found.map((e) => ({
    id: e.id,
    title: e.title,
    startAt: asMs(e.startDate),
    endAt: asMs(e.endDate),
    allDay: e.allDay ?? false,
  }));

  const existing = await db
    .select()
    .from(records)
    .where(
      and(
        eq(records.userId, userId),
        isNotNull(records.calendarEventId),
        isNull(records.deletedAt),
      ),
    );

  const mirrored: MirroredRecord[] = existing.map((r) => ({
    id: r.id,
    calendarEventId: r.calendarEventId ?? '',
    title: r.title,
    startAt: r.startAt,
    lengthMinutes: r.lengthMinutes,
  }));

  const plan = reconcileCalendar(events, mirrored);
  const stamp = Date.now();

  for (const event of plan.add) {
    await db.insert(records).values({
      id: randomUUID(),
      userId,
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
      dirty: true,
      syncedAt: null,
      kind: 'appointment' as const,
      title: event.title,
      lengthMinutes: lengthOf(event),
      startAt: event.startAt,
      // Time the user did not choose. That is the whole reason the kind exists, and why
      // an imported event lands in the taupe segment rather than the accent one.
      isFixed: true,
      projectId: null,
      recurrenceId: null,
      remindAt: null,
      notes: null,
      steps: null,
      stops: null,
      calendarEventId: event.id,
      mirroredEventId: null,
      state: 'open' as const,
      slipCount: 0,
      timerStartedAt: null,
      timerSeconds: 0,
    });
  }

  for (const { record, event } of plan.update) {
    await db
      .update(records)
      .set({
        title: event.title,
        startAt: event.startAt,
        lengthMinutes: lengthOf(event),
        updatedAt: stamp,
        dirty: true,
      })
      .where(eq(records.id, record.id));
  }

  for (const record of plan.remove) {
    await db
      .update(records)
      .set({ deletedAt: stamp, updatedAt: stamp, dirty: true })
      .where(eq(records.id, record.id));
  }

  return plan.add.length + plan.update.length + plan.remove.length;
}

/**
 * Write Moed's own records out as events, and keep them in step.
 *
 * Only records this app owns: anything mirrored *in* is skipped, or a calendar
 * connected to itself would copy every appointment straight back into the calendar it
 * came from. Only records with a time and a length, because an event without either is
 * not an event. Nothing in the tray and nothing dropped, for the same reason they are
 * not on the day: they are not part of the plan.
 */
export async function exportToCalendar(calendarId: string, now = new Date()): Promise<number> {
  const { from, to } = syncWindow(now);
  const userId = currentUserId();
  const calendar = await Calendar.ExpoCalendar.get(calendarId);

  const mine = await db
    .select()
    .from(records)
    .where(
      and(eq(records.userId, userId), isNull(records.calendarEventId), isNull(records.deletedAt)),
    );

  const inWindow = mine.filter(
    (r) =>
      r.startAt !== null &&
      r.startAt >= from.getTime() &&
      r.startAt <= to.getTime() &&
      r.lengthMinutes > 0 &&
      r.state !== 'tray' &&
      r.state !== 'dropped',
  );

  let written = 0;

  for (const record of inWindow) {
    const startDate = new Date(record.startAt ?? 0);
    const endDate = new Date((record.startAt ?? 0) + record.lengthMinutes * 60_000);

    if (record.mirroredEventId === null) {
      const created = await calendar.createEvent({ title: record.title, startDate, endDate });
      await db
        .update(records)
        .set({ mirroredEventId: created.id, updatedAt: Date.now(), dirty: true })
        .where(eq(records.id, record.id));
      written += 1;
      continue;
    }

    try {
      // Already out there, so follow the record rather than making a second event. This
      // runs every time the screen is opened, and a create-only path would fill the
      // calendar with copies.
      const event = await Calendar.ExpoCalendarEvent.get(record.mirroredEventId);
      await event.update({ title: record.title, startDate, endDate });
      written += 1;
    } catch {
      // Deleted from the calendar by hand. That is an answer rather than a fault:
      // forget the link instead of putting the event back, because putting it back
      // would overrule a decision somebody made in the other app.
      await db
        .update(records)
        .set({ mirroredEventId: null, updatedAt: Date.now(), dirty: true })
        .where(eq(records.id, record.id));
    }
  }

  return written;
}

/** Remove every event this app put in the calendar, and forget the links. */
export async function withdrawFromCalendar(): Promise<number> {
  const userId = currentUserId();

  const mirrored = await db
    .select()
    .from(records)
    .where(and(eq(records.userId, userId), isNotNull(records.mirroredEventId)));

  let removed = 0;

  for (const record of mirrored) {
    try {
      const event = await Calendar.ExpoCalendarEvent.get(record.mirroredEventId ?? '');
      await event.delete();
      removed += 1;
    } catch {
      // Already gone from the calendar. Nothing to withdraw, and the link goes anyway.
    }

    await db
      .update(records)
      .set({ mirroredEventId: null, updatedAt: Date.now(), dirty: true })
      .where(eq(records.id, record.id));
  }

  return removed;
}

/** The connected calendar's id, live. Empty means none is connected. */
export function useConnectedCalendarId(): string {
  return useStringSetting(CALENDAR_ID_KEY, '');
}

export function useWriteOut(): boolean {
  return useBooleanSetting(CALENDAR_OUT_KEY, false);
}

export function setConnectedCalendar(id: string): Promise<void> {
  return setSetting(CALENDAR_ID_KEY, id);
}

export function setWriteOut(on: boolean): Promise<void> {
  return setSetting(CALENDAR_OUT_KEY, on);
}
