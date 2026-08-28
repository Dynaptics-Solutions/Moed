import { describe, expect, it } from 'vitest';

import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  exportEnvelope,
  exportFilename,
  exportSummary,
} from './export';

const AT = new Date(2026, 7, 28, 14, 30).getTime();

describe('exportEnvelope', () => {
  it('marks the file so it is still identifiable in two years', () => {
    const envelope = exportEnvelope({ records: [] }, AT);

    expect(envelope.format).toBe(EXPORT_FORMAT);
    expect(envelope.version).toBe(EXPORT_VERSION);
    expect(envelope.exportedAt).toBe(AT);
  });

  it('counts every table it carries', () => {
    const envelope = exportEnvelope({ records: [1, 2, 3], bills: [1], spending: [] }, AT);

    expect(envelope.counts).toEqual({ records: 3, bills: 1, spending: 0 });
  });

  it('carries dropped and deleted rows through rather than tidying them away', () => {
    // Nothing disappears. An export that leaves out what was dropped commits the same
    // erasure the rule exists to prevent, in a file instead of on a screen.
    const rows = [
      { id: 'a', state: 'dropped' },
      { id: 'b', deletedAt: 1 },
    ];
    expect(exportEnvelope({ records: rows }, AT).data.records).toBe(rows);
  });

  it('takes the time it is given rather than reading a clock', () => {
    // Same data, same file. An export that differs run to run cannot be compared.
    expect(exportEnvelope({ records: [] }, AT)).toEqual(exportEnvelope({ records: [] }, AT));
  });
});

describe('exportSummary', () => {
  const names = { records: 'record', bills: 'bill', spending: 'spend' };

  it('says what is in the file, and pluralises honestly', () => {
    expect(exportSummary({ records: 412, bills: 1 }, names)).toBe('412 records · 1 bill');
  });

  it('leaves out what the user does not have', () => {
    expect(exportSummary({ records: 3, bills: 0, spending: 0 }, names)).toBe('3 records');
  });

  it('says so plainly when there is nothing', () => {
    expect(exportSummary({ records: 0 }, names)).toBe('Nothing to export yet.');
  });
});

describe('exportFilename', () => {
  it('names the file by the day it was made', () => {
    expect(exportFilename(AT)).toBe('moed-2026-08-28.json');
  });

  it('pads so the names sort', () => {
    expect(exportFilename(new Date(2026, 0, 5).getTime())).toBe('moed-2026-01-05.json');
  });
});
