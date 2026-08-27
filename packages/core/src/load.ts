/**
 * What a day's records cost it, split the way the capacity bar draws them.
 *
 * Here rather than in the app because it is the input to the bar's arithmetic, and the
 * server needs the same answer to render a week without shipping the whole record set.
 */

export type LoadContribution = {
  lengthMinutes: number;
  /** Time the user did not choose: appointments, and bills on a money week. */
  isFixed: boolean;
  state: 'open' | 'done' | 'moved' | 'dropped' | 'tray';
};

export type DayLoad = {
  committed: number;
  fixed: number;
};

/**
 * A finished record still counts. It spent the day — hiding it the moment it is ticked
 * would make the bar read as though the morning were still available, and the evening
 * close exists precisely to account for the day that happened.
 *
 * Moved and dropped records do not count, because they left. A record in the tray does
 * not count against the day it slipped from either; it is waiting, not scheduled.
 */
export function dayLoad(records: readonly LoadContribution[]): DayLoad {
  let committed = 0;
  let fixed = 0;

  for (const r of records) {
    if (r.state === 'moved' || r.state === 'dropped' || r.state === 'tray') continue;
    if (r.isFixed) fixed += r.lengthMinutes;
    else committed += r.lengthMinutes;
  }

  return { committed, fixed };
}
