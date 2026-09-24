import { leftovers } from '@moed/core';
import { useEffect } from 'react';

import { useDayRecords } from '@/db/records';
import { useBooleanSetting, useNumberSetting } from '@/db/settings';
import { weekdayName } from './day';
import {
  CLOSE_ON_KEY,
  CLOSE_TIME_KEY,
  DEFAULT_CLOSE_MINUTES,
  cancelEveningClose,
  scheduleEveningClose,
} from './notifications';

/**
 * Keeps the one scheduled notification in step with the day.
 *
 * The close's copy names how many records are still open, and that figure has to be
 * true when it arrives. Records only ever change from inside the app, so re-scheduling
 * whenever the open count changes is enough to keep it exact — there is no background
 * job and no window in which the number drifts.
 *
 * It lives at the root rather than on the day screen because the count changes from the
 * close, the tray, the detail sheet and every form, and a scheduler that only runs while
 * one screen is mounted is a scheduler that is usually wrong.
 */
export function useEveningClose(today: Date): void {
  const on = useBooleanSetting(CLOSE_ON_KEY, false);
  const atMinutes = useNumberSetting(CLOSE_TIME_KEY, DEFAULT_CLOSE_MINUTES);
  const { data: records } = useDayRecords(today);

  const open = records === undefined ? null : leftovers(records).length;
  const weekday = weekdayName(today);

  useEffect(() => {
    if (!on) {
      void cancelEveningClose();
      return;
    }

    // Nothing scheduled until the day is actually known. Scheduling against a count of
    // zero while the query is still in flight would send "nothing left" to someone with
    // a full day.
    if (open === null) return;

    void scheduleEveningClose({ atMinutes, leftovers: open, weekday });
  }, [on, atMinutes, open, weekday]);
}
