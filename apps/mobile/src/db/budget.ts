import { dayLoad, type DayCandidate, type DayLoad } from '@moed/core';
import { useMemo } from 'react';

import { useDayLimit } from './dayLimits';
import { useDayRecords, type PlannerRecord } from './records';
import { useUpcomingDays } from './upcoming';

/** Everything the gate needs to judge one day: what it holds, what it allows, where things could go instead. */
export type DayBudget = {
  date: Date;
  rows: PlannerRecord[];
  load: DayLoad;
  limit: number;
  upcoming: DayCandidate[];
};

/**
 * The budget of the day a record lands on — which is not always today.
 *
 * Every form used to show today's figures no matter which day it was writing to, so a
 * task put on Thursday was measured against the hours left this afternoon. It read as
 * a fact about the record being saved and was a fact about a different day.
 *
 * `excludeId` leaves the record being edited out of its own day's load. It is already
 * on the day, so counting it and then adding its new length shows every edit as a
 * doubling — a two-hour block re-saved unchanged would report four.
 */
export function useDayBudget(at: number, excludeId?: string): DayBudget {
  const date = useMemo(() => new Date(at), [at]);
  const { data } = useDayRecords(date);
  const limit = useDayLimit(date);
  const upcoming = useUpcomingDays(date);

  const rows = useMemo(() => (data ?? []).filter((r) => r.id !== excludeId), [data, excludeId]);

  return { date, rows, load: dayLoad(rows), limit, upcoming };
}
