import type { Recurrence } from '@moed/core';

import type { NewRecord } from '@/db/records';

/**
 * A record on its way to being saved, as it travels between a form, the gate and the
 * day.
 *
 * These are separate routes, so the draft is a route parameter. It is JSON rather than
 * a field per property because a routine carries six steps and an errand carries three
 * stops, and a dozen flat parameters is how a URL stops being readable and starts being
 * a place bugs live.
 *
 * Nothing here is written until someone taps through the gate. A draft that is
 * abandoned leaves nothing behind, which is the behaviour the back gesture should have.
 */
export type RecordDraft = NewRecord & {
  recurrence?: Recurrence | null;
};

export function encodeDraft(draft: RecordDraft): string {
  return JSON.stringify(draft);
}

export function decodeDraft(value: string | undefined): RecordDraft | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const draft = parsed as RecordDraft;
    // A draft with no kind or no title is not a record; treat it as absent rather than
    // writing something the user never described.
    if (typeof draft.title !== 'string' || typeof draft.kind !== 'string') return null;
    return draft;
  } catch {
    return null;
  }
}
