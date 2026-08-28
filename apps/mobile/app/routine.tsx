import { describeRecurrence, formatMinutes } from '@moed/core';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Field, Input, Note } from '@/components/Field';
import { FormScaffold } from '@/components/FormScaffold';
import { recurrenceLabels } from '@/lib/recurrenceParams';
import { useKindForm, useListField } from '@/lib/useKindForm';
import { useTheme } from '@/theme';

/**
 * `routine` — a checklist in one block.
 *
 * The whole point of the kind: six steps cost the day one block, not six separate
 * entries. A morning routine is forty minutes whether it has three steps or ten, and a
 * planner that counts hours has to model it that way or the bar lies.
 */

const LENGTHS = [20, 40, 60];

export default function Routine() {
  const theme = useTheme();
  const form = useKindForm('routine', 40);
  const [steps, setSteps] = useListField(form.existing?.steps);
  const [draftStep, setDraftStep] = useState('');

  const addStep = () => {
    const next = draftStep.trim();
    if (next.length === 0) return;
    setSteps((s) => [...s, next]);
    setDraftStep('');
  };

  return (
    <FormScaffold
      kindLabel={form.isEditing ? 'Edit routine' : 'New routine'}
      leading={{ label: 'Back', onPress: form.back }}
      title={form.title}
      onTitleChange={form.setTitle}
      titlePlaceholder="Morning routine"
      saveLabel="Save routine"
      budget={{
        load: form.load,
        limit: form.limit,
        adding: form.lengthMinutes,
        dayLabel: form.dayLabel,
      }}
      onSave={() =>
        void form.save(
          {
            kind: 'routine',
            title: form.title,
            lengthMinutes: form.lengthMinutes,
            startAt: form.startAt,
            steps,
            recurrence: form.recurrence,
          },
          form.id,
        )
      }
    >
      <Field label="One block, this long">
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

      <Field label={`Steps · ${steps.length}`}>
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
          {steps.map((step, i) => (
            <View
              key={`${step}-${i}`}
              style={[
                styles.step,
                i > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.line2 },
              ]}
            >
              <View style={[styles.box, { borderColor: theme.colors.ink3 }]} />
              <Text
                style={[styles.stepText, { fontFamily: theme.fonts.ui, color: theme.colors.ink }]}
              >
                {step}
              </Text>
              <Pressable
                onPress={() => setSteps((s) => s.filter((_, j) => j !== i))}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${step}`}
              >
                <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>✕</Text>
              </Pressable>
            </View>
          ))}

          <View
            style={[
              styles.step,
              steps.length > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.line2 },
            ]}
          >
            <View style={[styles.box, styles.boxDashed, { borderColor: theme.colors.ink3 }]} />
            <TextInput
              value={draftStep}
              onChangeText={setDraftStep}
              onSubmitEditing={addStep}
              placeholder="Add a step"
              placeholderTextColor={theme.colors.ink3}
              selectionColor={theme.colors.acc}
              returnKeyType="done"
              style={[styles.stepText, { fontFamily: theme.fonts.ui, color: theme.colors.ink }]}
            />
          </View>
        </View>
      </Field>

      <Input
        value={describeRecurrence(form.recurrence, recurrenceLabels)}
        trailing="Repeats ›"
        muted={form.recurrence === null}
        onPress={form.openRepeat}
      />

      <Note>{`Costs the day ${formatMinutes(form.lengthMinutes)} once — not ${steps.length || 'six'} separate entries.`}</Note>
    </FormScaffold>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 7 },
  card: { borderWidth: 1, paddingHorizontal: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  box: { width: 15, height: 15, borderRadius: 4, borderWidth: 1.4, flexGrow: 0, flexShrink: 0 },
  boxDashed: { borderStyle: 'dashed' },
  stepText: { flex: 1, fontSize: 13.5, padding: 0 },
});
