import { dayLoad, gate, isSameDay } from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { useDayLimit } from '@/db/dayLimits';
import { createRecord, updateRecord, useDayRecords } from '@/db/records';
import { createRecurrence } from '@/db/recurrences';
import { useUpcomingDays } from '@/db/upcoming';
import { encodeDraft, type RecordDraft } from '@/lib/draft';

/**
 * A record the app moved out of the way on the user's say-so, and everything needed to
 * put it back exactly where it was.
 */
export type MovedAside = {
  id: string;
  title: string;
  /** The day it went to, named the way the gate named it: "Thursday". */
  to: string;
  /** Where it was, or null if it had no time of day. */
  from: number | null;
};

/**
 * Saving, from any form.
 *
 * The gate fires on save from every one of them, which is the whole reason this is one
 * function: five forms each deciding for themselves whether a record fits is five
 * places for the day's limit to stop being enforced.
 */
export function useSaveDraft() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const limit = useDayLimit(today);
  const { data: dayRecords } = useDayRecords(today);
  const upcoming = useUpcomingDays(today);

  const rows = dayRecords ?? [];
  const load = dayLoad(rows);

  const write = async (draft: RecordDraft) => {
    const recurrenceId = draft.recurrence ? await createRecurrence(draft.recurrence) : null;
    const { recurrence: _rule, ...record } = draft;
    return createRecord({ ...record, recurrenceId });
  };

  /**
   * Straight to the day, no gate — used once the gate has been answered.
   *
   * `alongside` is whatever else answering the gate did. It travels to the day so the
   * one undo there reverses the whole answer rather than half of it: accepting "move
   * Rye to Thursday" is one decision, and undoing it must not leave Rye on Thursday.
   */
  const commit = async (draft: RecordDraft, alongside?: MovedAside) => {
    const created = await write(draft);
    router.replace({
      pathname: '/',
      params: {
        landed: created.id,
        ...(alongside && {
          movedId: alongside.id,
          movedTitle: alongside.title,
          movedTo: alongside.to,
          // A record with no time of day has none to put back, and an empty parameter
          // is the honest way to say so — `'null'` would be a string that reads as data.
          movedFrom: alongside.from === null ? '' : String(alongside.from),
        }),
      },
    });
  };

  /**
   * Editing an existing record does not pass the gate.
   *
   * The gate is about *adding* commitment to a day. Re-saving something already on it —
   * fixing a typo, correcting a length — is not an addition, and making someone answer
   * "this puts you 40 minutes over" to rename a task they had already accepted would
   * turn the one interaction the product depends on into an obstacle.
   *
   * Lengthening an edited record can therefore take a day past its limit without the
   * sheet. The bar says so immediately, which is the honest place for it.
   */
  const update = async (id: string, draft: RecordDraft) => {
    if (draft.title.trim().length === 0) return;
    const recurrenceId = draft.recurrence ? await createRecurrence(draft.recurrence) : undefined;
    const { recurrence: _rule, ...record } = draft;
    await updateRecord(id, { ...record, ...(recurrenceId && { recurrenceId }) });
    router.replace({ pathname: '/', params: { landed: id } });
  };

  const save = async (draft: RecordDraft, id?: string) => {
    if (id) return update(id, draft);
    if (draft.title.trim().length === 0) return;

    const decision = gate(
      {
        committed: load.committed,
        fixed: load.fixed,
        limit,
        adding: draft.lengthMinutes ?? 0,
        addingIsFixed: draft.isFixed,
      },
      rows
        .filter((r) => !r.isFixed && r.state === 'open')
        .map((r) => ({ id: r.id, title: r.title, lengthMinutes: r.lengthMinutes })),
      upcoming,
    );

    // The gate only has standing over the day the record would actually overfill.
    // Something scheduled for Thursday is Thursday's problem.
    const landsToday = draft.startAt ? isSameDay(new Date(draft.startAt), today) : false;

    if (decision.fits || !landsToday) {
      await commit(draft);
      return;
    }

    router.replace({ pathname: '/gate', params: { draft: encodeDraft(draft) } });
  };

  return { save, commit, load, limit, today, rows, upcoming };
}
