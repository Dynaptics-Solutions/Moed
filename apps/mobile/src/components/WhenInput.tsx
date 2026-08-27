import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform } from 'react-native';

import { Input } from './Field';

type WhenInputProps = {
  /** What the field reads when it is not being edited. */
  value: string;
  /**
   * The moment the picker opens on, and the one it edits. Null for a field with nothing
   * set yet — the picker then opens on now, decided when it opens rather than on every
   * render, because `Date.now()` in a render body is a different answer each pass.
   */
  at: number | null;
  onChange: (next: number) => void;
  /** `datetime` asks for the day and then the clock; `date` stops after the day. */
  mode?: 'datetime' | 'date';
  muted?: boolean;
};

/**
 * A field that opens the platform's own date and time picker.
 *
 * Every `When`, `Pay by` and `Remind` row in this app was inert until this existed —
 * they rendered a value and swallowed the tap — which meant nothing could be scheduled
 * for any time other than the 09:00 today that a new record defaults to. Capture could
 * set one, because chrono reads a time out of the sentence, but no form could change it
 * afterwards and no form could move a record to another day.
 *
 * The platform picker rather than one drawn here, for the reason the geometry table
 * gives: platform differences are real, not cosmetic. A date is also the one thing a
 * person already knows how to enter on their own phone, and a wheel of our own would be
 * a worse version of something they have used a thousand times. Its colours come from
 * the config plugin in `app.json`, which is the only way to reach a native dialog's
 * theme — set there in tokens so it is the app's green rather than Material's teal.
 *
 * Android shows one dialog at a time, so a datetime is two in sequence: the day, then
 * the clock. iOS shows both at once. The `stage` state is that difference and nothing
 * else.
 */
export function WhenInput({ value, at, onChange, mode = 'datetime', muted }: WhenInputProps) {
  const [stage, setStage] = useState<'closed' | 'date' | 'time'>('closed');
  const [draft, setDraft] = useState(() => at ?? Date.now());

  const open = () => {
    setDraft(at ?? Date.now());
    setStage('date');
  };

  const picked = (_event: unknown, chosen?: Date) => {
    if (chosen === undefined) {
      setStage('closed');
      return;
    }

    if (stage === 'date') {
      // Take only the day and keep the clock from the value being edited, so moving a
      // 14:00 record to Thursday does not quietly reset it to midnight.
      const next = new Date(draft);
      next.setFullYear(chosen.getFullYear(), chosen.getMonth(), chosen.getDate());

      if (mode === 'date' || Platform.OS === 'ios') {
        setStage('closed');
        onChange(next.getTime());
        return;
      }

      setDraft(next.getTime());
      setStage('time');
      return;
    }

    const next = new Date(draft);
    next.setHours(chosen.getHours(), chosen.getMinutes(), 0, 0);
    setStage('closed');
    onChange(next.getTime());
  };

  /** Backing out is a decision too, and it means leave it as it was. */
  const dismissed = () => setStage('closed');

  return (
    <>
      <Input value={value} muted={muted} onPress={open} />
      {stage !== 'closed' && (
        <DateTimePicker
          value={new Date(draft)}
          mode={stage === 'time' ? 'time' : 'date'}
          display="default"
          onValueChange={picked}
          onDismiss={dismissed}
        />
      )}
    </>
  );
}
