import { capacity, describeRecurrence, formatMinutes } from '@moed/core';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CapacityBar } from '@/components/CapacityBar';
import { Chip } from '@/components/Chip';
import { Field, Input } from '@/components/Field';
import { WhenInput } from '@/components/WhenInput';
import { FormScaffold } from '@/components/FormScaffold';
import { clockTime, whenDay } from '@/lib/day';
import { recurrenceLabels } from '@/lib/recurrenceParams';
import { useKindForm } from '@/lib/useKindForm';
import { useTheme } from '@/theme';

/**
 * `session` — time, not a tick box.
 *
 * A session cannot be finished, only fed, so it has no completion ring anywhere in the
 * app. What it has instead is a weekly target and a bar showing how much of it has been
 * given — the same component as everything else, in the same unit.
 */

const LENGTHS = [30, 60, 90];
const TARGETS = [180, 300, 420];

export default function Session() {
  const theme = useTheme();
  const form = useKindForm('session', 60);
  const [targetMinutes, setTargetMinutes] = useState(300);

  // Given this week: nothing yet, because sessions are not logged until the timer
  // exists. The bar is drawn against the target so the shape of the screen is right.
  const givenMinutes = 0;
  const progress = capacity({ committed: givenMinutes, fixed: 0, limit: targetMinutes });

  return (
    <FormScaffold
      kindLabel={form.isEditing ? 'Edit session' : 'New session'}
      leading={{ label: 'Back', onPress: form.back }}
      title={form.title}
      onTitleChange={form.setTitle}
      titlePlaceholder="Reading"
      saveLabel="Save session"
      budget={{ load: form.load, limit: form.limit, adding: form.lengthMinutes }}
      onSave={() =>
        void form.save(
          {
            kind: 'session',
            title: form.title,
            lengthMinutes: form.lengthMinutes,
            startAt: form.startAt,
            recurrence: form.recurrence,
          },
          form.id,
        )
      }
    >
      <Field label="Give it">
        <View style={styles.chips}>
          {LENGTHS.map((minutes) => (
            <Chip
              key={minutes}
              label={formatMinutes(minutes)}
              selected={form.lengthMinutes === minutes}
              onPress={() => form.setLengthMinutes(minutes)}
            />
          ))}
        </View>
      </Field>

      <Field label="When">
        <WhenInput
          at={form.startAt}
          onChange={form.setStartAt}
          value={`${whenDay(new Date(form.startAt), form.today)} · ${clockTime(new Date(form.startAt))}`}
        />
      </Field>

      <Field label="Target this week">
        <View style={styles.chips}>
          {TARGETS.map((minutes) => (
            <Chip
              key={minutes}
              label={formatMinutes(minutes)}
              selected={targetMinutes === minutes}
              onPress={() => setTargetMinutes(minutes)}
            />
          ))}
        </View>
      </Field>

      <Input
        value={describeRecurrence(form.recurrence, recurrenceLabels)}
        trailing="Repeats ›"
        muted={form.recurrence === null}
        onPress={form.openRepeat}
      />

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.line,
            borderRadius: theme.geometry.card.radius,
          },
        ]}
      >
        <Text style={[theme.type.fieldLabel, styles.cardLabel, { color: theme.colors.ink3 }]}>
          This week so far
        </Text>
        <CapacityBar
          committed={givenMinutes}
          fixed={0}
          limit={targetMinutes}
          caption={false}
          height={8}
        />
        <Text style={[theme.type.meta, styles.given, { color: theme.colors.ink3 }]}>
          {formatMinutes(progress.planned)} of {formatMinutes(targetMinutes)} given
        </Text>
      </View>

      <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
        No checkbox. A session cannot be finished, only fed.
      </Text>
    </FormScaffold>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 7 },
  card: { borderWidth: 1, paddingVertical: 14, paddingHorizontal: 15 },
  cardLabel: { marginBottom: 9 },
  given: { marginTop: 8 },
});
