import { describe, expect, it } from 'vitest';

import { dayLoad, type LoadContribution } from './load';

const r = (
  lengthMinutes: number,
  state: LoadContribution['state'] = 'open',
  isFixed = false,
): LoadContribution => ({ lengthMinutes, state, isFixed });

describe('dayLoad', () => {
  it('splits chosen load from fixed', () => {
    expect(dayLoad([r(120), r(60), r(90, 'open', true), r(60, 'open', true)])).toEqual({
      committed: 180,
      fixed: 150,
    });
  });

  it('still counts a record that has been done', () => {
    // It spent the day. Dropping it from the total the moment it is ticked would make
    // the bar read as though the morning were still going spare.
    expect(dayLoad([r(120, 'done')])).toEqual({ committed: 120, fixed: 0 });
  });

  it('does not count what left the day', () => {
    expect(dayLoad([r(120, 'moved'), r(60, 'dropped'), r(30, 'tray')])).toEqual({
      committed: 0,
      fixed: 0,
    });
  });

  it('reads an empty day as nothing planned', () => {
    expect(dayLoad([])).toEqual({ committed: 0, fixed: 0 });
  });
});
