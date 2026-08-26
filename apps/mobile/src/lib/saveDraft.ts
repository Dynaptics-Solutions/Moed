import { dayLoad, gate, isSameDay } from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { useDayLimit } from '@/db/dayLimits';
import { createRecord, useDayRecords } from '@/db/records';
import { createRecurrence } from '@/db/recurrences';
import { useUpcomingDays } from '@/db/upcoming';
import { encodeDraft, type RecordDraft } from '@/lib/draft';

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

  /** Straight to the day, no gate — used once the gate has been answered. */
  const commit = async (draft: RecordDraft) => {
    const created = await write(draft);
    router.replace({ pathname: '/', params: { landed: created.id } });
  };

  const save = async (draft: RecordDraft) => {
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
