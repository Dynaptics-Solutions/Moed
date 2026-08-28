import type { Recurrence } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { useDayBudget } from '@/db/budget';
import { useRecord } from '@/db/records';
import type { RecordKind } from '@/db/schema';
import { whenDay } from './day';
import { fromParams, toParams } from './recurrenceParams';
import { useSaveDraft } from './saveDraft';
import type { RecordDraft } from './draft';

/**
 * The setup every kind's form shares: what capture handed over, what the recurrence
 * editor handed back, what an existing record already says, and where Save goes.
 *
 * The fields differ per kind — that is the only reason kinds exist — but the way a form
 * is seeded and saved should not.
 *
 * Editing and creating are the same form. The difference is one `id`, and it is
 * threaded through here rather than decided in each screen, because a form that reaches
 * for create when it meant update duplicates the record someone was trying to change.
 *
 * Values are *derived* rather than copied into state when the record loads: an edit
 * overrides the record, and absent an edit the record is the answer. That avoids
 * seeding state from an async query, which is the shape that produces a form flashing
 * the wrong values for a frame.
 */
export function useKindForm(kind: RecordKind, defaultLength: number) {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const { save } = useSaveDraft();

  const today = useMemo(() => new Date(), []);
  const id = params.id;
  const existing = useRecord(id);

  const [edits, setEdits] = useState<{
    title?: string;
    lengthMinutes?: number;
    recurrence?: Recurrence | null;
    startAt?: number;
    projectId?: string | null;
  }>({});

  const title = edits.title ?? existing?.title ?? params.title ?? '';
  const lengthMinutes =
    edits.lengthMinutes ??
    existing?.lengthMinutes ??
    (Number(params.lengthMinutes) || defaultLength);
  const recurrence = edits.recurrence !== undefined ? edits.recurrence : fromParams(params);
  // `??` cannot fall past `Number(params.startAt)`: with no parameter that is NaN, and
  // NaN is not nullish, so the default never ran. It only ever worked because the
  // returned value was guarded with `||` further down, where the reason was invisible.
  // `!== undefined` rather than `??`, because null is a real answer here: it is what
  // clearing the project means, and `??` would fall straight past it to the record's
  // old value and make the field impossible to unset.
  const projectId = edits.projectId !== undefined ? edits.projectId : (existing?.projectId ?? null);

  // A previous fix here handled a *missing* parameter — `Number(undefined)` is NaN, and
  // NaN is not nullish, so `??` walked straight past the default. It missed the other
  // way in: the type picker passes `startAt: ''` when it has no date to carry, and
  // `Number('')` is 0, which is finite. So a form opened through "Make this a…" without
  // a captured date landed the record on 1 January 1970, and the foot said so —
  // "Thu 1 Jan has 2h free" — which is how it was eventually noticed.
  //
  // Zero is the guard rather than the empty string, because it is the actual property
  // being relied on: no record this app can plan belongs at the epoch.
  const fromParam = Number(params.startAt);
  const carried = Number.isFinite(fromParam) && fromParam > 0;

  const startAt = edits.startAt ?? existing?.startAt ?? (carried ? fromParam : today.getTime());

  // The figures in the foot are the landing day's, not today's, and they leave this
  // record out of its own day so an edit is not counted twice.
  const budget = useDayBudget(startAt, id);
  const dayLabel = whenDay(budget.date, today);

  const setTitle = (next: string) => setEdits((e) => ({ ...e, title: next }));
  const setLengthMinutes = (next: number) => setEdits((e) => ({ ...e, lengthMinutes: next }));
  const setRecurrence = (next: Recurrence | null) => setEdits((e) => ({ ...e, recurrence: next }));
  const setStartAt = (next: number) => setEdits((e) => ({ ...e, startAt: next }));
  const setProjectId = (next: string | null) => setEdits((e) => ({ ...e, projectId: next }));

  /** Hand the current rule to the editor, and name the route it should come back to. */
  const openRepeat = () =>
    router.push({
      pathname: '/repeat',
      params: {
        ...toParams(recurrence),
        from: kind === 'appointment' ? 'appt' : kind,
        id: id ?? '',
        title,
        lengthMinutes: String(lengthMinutes),
        startAt: String(startAt),
      },
    });

  const back = () => (id ? router.back() : router.replace('/types'));
  const cancel = () => (id ? router.back() : router.replace('/'));

  return {
    id,
    isEditing: Boolean(id),
    existing,
    title,
    setTitle,
    lengthMinutes,
    setLengthMinutes,
    recurrence,
    setRecurrence,
    startAt,
    setStartAt,
    projectId,
    setProjectId,
    today,
    load: budget.load,
    limit: budget.limit,
    /** "Today", "Thursday" — whichever day the foot is actually describing. */
    dayLabel,
    /** Gates against the landing day rather than today. */
    save: (draft: RecordDraft, recordId?: string) => save(draft, recordId, budget),
    openRepeat,
    back,
    cancel,
  };
}

/**
 * A routine's steps or an errand's stops, derived the way `useKindForm` derives every
 * other field: an edit overrides the record, and absent an edit the record is the
 * answer.
 *
 * Both screens held these in a plain `useState([])`, which seeded empty on every mount
 * and never read the record. Opening a six-step routine to change its title showed no
 * steps and then saved none, so an ordinary edit erased them — invisibly, because the
 * day view shows a routine's title and its length and never its steps. `Steps · 0` was
 * the only tell, and on a form that is also used to create things it reads as normal.
 */
export function useListField(from: string[] | null | undefined) {
  const [edited, setEdited] = useState<string[] | null>(null);
  const value = edited ?? from ?? [];

  // The setter works over the derived list rather than over the edit, so a caller can
  // append to steps it has never touched — which is the first thing anyone does when
  // adding a step to a routine that already has five.
  const set = (next: string[] | ((previous: string[]) => string[])) =>
    setEdited(typeof next === 'function' ? next(value) : next);

  return [value, set] as const;
}
