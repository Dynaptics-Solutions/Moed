/**
 * Export.
 *
 * Non-negotiable 9: **export is never gated**, and a lapsed subscription makes data
 * read-only rather than hidden. So nothing in this file knows what a plan is. There is
 * no entitlement parameter to forget to pass and no branch to get wrong later — the
 * only way to keep that promise structurally is for the code that keeps it to be
 * unable to break it.
 *
 * The envelope is versioned because an export is a file someone still has in two
 * years. A JSON blob with no format marker is indistinguishable from any other app's
 * JSON blob the moment it leaves the phone.
 */

export const EXPORT_FORMAT = 'moed.export';
export const EXPORT_VERSION = 1;

/** Every table, by name, exactly as it is stored. */
export type ExportTables = Record<string, readonly unknown[]>;

export type ExportEnvelope = {
  format: typeof EXPORT_FORMAT;
  version: number;
  /** Epoch ms. Passed in rather than read, so the same data always makes the same file. */
  exportedAt: number;
  counts: Record<string, number>;
  data: ExportTables;
};

/**
 * Everything, including what was dropped, what is waiting in the tray, and what was
 * deleted.
 *
 * Nothing disappears is a product rule, and an export that quietly leaves out the
 * records someone dropped is the same erasure the rule exists to prevent — it just
 * happens in the file instead of on the screen. Deletion is soft everywhere in this
 * app, so a deleted row carries its own `deletedAt` and says what it is.
 */
export function exportEnvelope(tables: ExportTables, exportedAt: number): ExportEnvelope {
  const counts: Record<string, number> = {};
  for (const [name, rows] of Object.entries(tables)) counts[name] = rows.length;

  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt, counts, data: tables };
}

/**
 * What is in the file, in words, so it can be said before it is shared.
 *
 * Only what is actually there. Naming empty tables would pad the sentence with things
 * the user does not have, and this screen's whole job is to be believed.
 */
export function exportSummary(
  counts: Record<string, number>,
  names: Record<string, string>,
): string {
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([table, n]) => `${n} ${names[table] ?? table}${n === 1 ? '' : 's'}`);

  return parts.length === 0 ? 'Nothing to export yet.' : parts.join(' · ');
}

/** `moed-2026-08-28.json`. It sorts by date in a file list, which is all a name has to do. */
export function exportFilename(exportedAt: number): string {
  const d = new Date(exportedAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `moed-${y}-${m}-${day}.json`;
}
