import { describeRecurrence } from '@moed/core';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Field, Input } from '@/components/Field';
import { FormScaffold } from '@/components/FormScaffold';
import { WhenInput } from '@/components/WhenInput';
import { clockTime, whenDay } from '@/lib/day';
import { recurrenceLabels } from '@/lib/recurrenceParams';
import { useKindForm } from '@/lib/useKindForm';

/**
 * `task` — one thing, one length. The plainest kind, and the one capture produces.
 */

const LENGTHS: { label: string; minutes: number }[] = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: 'Half day', minutes: 285 },
];

export default function Task() {
  const form = useKindForm('task', 60);

  const start = new Date(form.startAt);
  const end = new Date(form.startAt + form.lengthMinutes * 60_000);

  return (
    <FormScaffold
      kindLabel={form.isEditing ? 'Edit task' : 'New task'}
      leading={{ label: 'Cancel', onPress: form.cancel }}
      title={form.title}
      onTitleChange={form.setTitle}
      saveLabel="Add to today"
      budget={{ load: form.load, limit: form.limit, adding: form.lengthMinutes }}
      onSave={() =>
        void form.save(
          {
            kind: 'task',
            title: form.title,
            lengthMinutes: form.lengthMinutes,
            startAt: form.startAt,
            recurrence: form.recurrence,
          },
          form.id,
        )
      }
    >
      <Field label="How long">
        <View style={styles.chips}>
          {LENGTHS.map((l) => (
            <Chip
              key={l.label}
              label={l.label}
              selected={form.lengthMinutes === l.minutes}
              onPress={() => form.setLengthMinutes(l.minutes)}
            />
          ))}
        </View>
      </Field>

      <Field label="When">
        <WhenInput
          at={form.startAt}
          onChange={form.setStartAt}
          value={`${whenDay(start, form.today)} · ${clockTime(start)} — ${clockTime(end)}`}
        />
      </Field>

      <Field label="Project">
        <Input value="None" muted />
      </Field>

      <Field label="Remind">
        <Input value="Never" muted />
      </Field>

      <Input
        value={describeRecurrence(form.recurrence, recurrenceLabels)}
        trailing="Repeats ›"
        muted={form.recurrence === null}
        onPress={form.openRepeat}
      />
    </FormScaffold>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
});
