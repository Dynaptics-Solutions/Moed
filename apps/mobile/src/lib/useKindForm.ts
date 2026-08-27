import type { Recurrence } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { useRecord } from '@/db/records';
import type { RecordKind } from '@/db/schema';
import { fromParams, toParams } from './recurrenceParams';
import { useSaveDraft } from './saveDraft';

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
  const { save, load, limit } = useSaveDraft();

  const today = useMemo(() => new Date(), []);
  const id = params.id;
  const existing = useRecord(id);

  const [edits, setEdits] = useState<{
    title?: string;
    lengthMinutes?: number;
    recurrence?: Recurrence | null;
    startAt?: number;
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
  const fromParam = Number(params.startAt);
  const startAt =
    edits.startAt ??
    existing?.startAt ??
    (Number.isFinite(fromParam) ? fromParam : today.getTime());

  const setTitle = (next: string) => setEdits((e) => ({ ...e, title: next }));
  const setLengthMinutes = (next: number) => setEdits((e) => ({ ...e, lengthMinutes: next }));
  const setRecurrence = (next: Recurrence | null) => setEdits((e) => ({ ...e, recurrence: next }));
  const setStartAt = (next: number) => setEdits((e) => ({ ...e, startAt: next }));

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
    today,
    load,
    limit,
    save,
    openRepeat,
    back,
    cancel,
  };
}
