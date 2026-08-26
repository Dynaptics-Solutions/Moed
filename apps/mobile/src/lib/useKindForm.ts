import type { Recurrence } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import type { RecordKind } from '@/db/schema';
import { fromParams, toParams } from './recurrenceParams';
import { useSaveDraft } from './saveDraft';

/**
 * The setup every kind's form shares: what capture handed over, what the recurrence
 * editor handed back, and where Save goes.
 *
 * The fields differ per kind — that is the only reason kinds exist — but the way a form
 * is seeded and saved should not.
 */
export function useKindForm(kind: RecordKind, defaultLength: number) {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const { save, load, limit } = useSaveDraft();

  const today = useMemo(() => new Date(), []);

  const [title, setTitle] = useState(params.title ?? '');
  const [lengthMinutes, setLengthMinutes] = useState(Number(params.lengthMinutes) || defaultLength);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(() => fromParams(params));

  const startAt = Number(params.startAt) || today.getTime();

  /** Hand the current rule to the editor, and name the route it should come back to. */
  const openRepeat = () =>
    router.push({
      pathname: '/repeat',
      params: {
        ...toParams(recurrence),
        from: kind === 'appointment' ? 'appt' : kind,
        title,
        lengthMinutes: String(lengthMinutes),
        startAt: String(startAt),
      },
    });

  const back = () => router.replace('/types');
  const cancel = () => router.replace('/');

  return {
    title,
    setTitle,
    lengthMinutes,
    setLengthMinutes,
    recurrence,
    setRecurrence,
    startAt,
    today,
    load,
    limit,
    save,
    openRepeat,
    back,
    cancel,
  };
}
