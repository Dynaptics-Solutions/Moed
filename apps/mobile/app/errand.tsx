import { describeRecurrence, formatMinutes } from '@moed/core';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Field, Input } from '@/components/Field';
import { FormScaffold } from '@/components/FormScaffold';
import { clockTime } from '@/lib/day';
import { recurrenceLabels } from '@/lib/recurrenceParams';
import { useKindForm } from '@/lib/useKindForm';
import { useTheme } from '@/theme';

/**
 * `errand` — a place, not a time.
 *
 * Three stops are one trip on the day, not three loose tasks. That is the kind's whole
 * reason to exist, and it is why the length belongs to the trip rather than to any one
 * stop.
 *
 * Ordering the stops and estimating the round trip is a paid feature — it needs map
 * lookups, which cost money every time — so it is a card here rather than something
 * this screen quietly does.
 */
export default function Errand() {
  const theme = useTheme();
  const form = useKindForm('errand', 40);
  const [stops, setStops] = useState<string[]>([]);
  const [draftStop, setDraftStop] = useState('');

  const addStop = () => {
    const next = draftStop.trim();
    if (next.length === 0) return;
    setStops((s) => [...s, next]);
    setDraftStop('');
  };

  return (
    <FormScaffold
      kindLabel={form.isEditing ? 'Edit errand' : 'New errand'}
      leading={{ label: 'Back', onPress: form.back }}
      title={form.title}
      onTitleChange={form.setTitle}
      titlePlaceholder="Saturday run"
      saveLabel="Save errand"
      budget={{ load: form.load, limit: form.limit, adding: form.lengthMinutes }}
      onSave={() =>
        void form.save(
          {
            kind: 'errand',
            title: form.title,
            lengthMinutes: form.lengthMinutes,
            startAt: form.startAt,
            stops,
            recurrence: form.recurrence,
          },
          form.id,
        )
      }
    >
      <Field label={`Stops · ${stops.length}`}>
        <View style={styles.stops}>
          {stops.map((stop, i) => (
            <View
              key={`${stop}-${i}`}
              style={[
                styles.stop,
                {
                  minHeight: theme.geometry.input.minHeight,
                  borderRadius: theme.geometry.input.radius,
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.line,
                },
              ]}
            >
              <View style={[styles.index, { backgroundColor: theme.colors.accSoft }]}>
                <Text
                  style={[
                    styles.indexText,
                    { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.acc },
                  ]}
                >
                  {i + 1}
                </Text>
              </View>
              <Text style={[theme.type.body, styles.stopText, { color: theme.colors.ink }]}>
                {stop}
              </Text>
              <Pressable
                onPress={() => setStops((s) => s.filter((_, j) => j !== i))}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${stop}`}
              >
                <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>✕</Text>
              </Pressable>
            </View>
          ))}

          <View
            style={[
              styles.stop,
              styles.dashed,
              {
                minHeight: theme.geometry.input.minHeight,
                borderRadius: theme.geometry.input.radius,
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.line,
              },
            ]}
          >
            <TextInput
              value={draftStop}
              onChangeText={setDraftStop}
              onSubmitEditing={addStop}
              placeholder="Add a stop"
              placeholderTextColor={theme.colors.ink3}
              selectionColor={theme.colors.acc}
              returnKeyType="done"
              style={[theme.type.body, styles.stopText, { color: theme.colors.ink }]}
            />
            <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>+</Text>
          </View>
        </View>
      </Field>

      <PaidCard />

      <Field label="When">
        <Input value={`Today · ${clockTime(new Date(form.startAt))}`} />
      </Field>

      <Input
        value={describeRecurrence(form.recurrence, recurrenceLabels)}
        trailing="Repeats ›"
        muted={form.recurrence === null}
        onPress={form.openRepeat}
      />

      <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
        One {formatMinutes(form.lengthMinutes)} trip on the day, not{' '}
        {stops.length > 0 ? stops.length : 'three'} loose tasks.
      </Text>
    </FormScaffold>
  );

  function PaidCard() {
    return (
      <View
        style={[
          styles.paid,
          {
            backgroundColor: theme.colors.taupeSoft,
            borderColor: theme.colors.taupe,
            borderRadius: theme.geometry.card.radius,
          },
        ]}
      >
        <View style={styles.paidText}>
          <Text
            style={[
              theme.type.bodySmall,
              { fontFamily: theme.fonts.uiMedium, fontSize: 13, color: theme.colors.ink },
            ]}
          >
            Best order and round trip
          </Text>
          <Text style={[theme.type.meta, styles.paidSub, { color: theme.colors.ink3 }]}>
            Needs a map lookup, so it is part of the paid plan
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.colors.taupe }]}>
          <Text style={[styles.badgeText, { fontFamily: theme.fonts.uiSemiBold }]}>PAID</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  stops: { gap: 7 },
  stop: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  dashed: { borderStyle: 'dashed' },
  index: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  indexText: { fontSize: 9.5 },
  stopText: { flex: 1, padding: 0 },
  paid: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  paidText: { flex: 1 },
  paidSub: { marginTop: 3 },
  badge: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6 },
  badgeText: {
    fontSize: 8.5,
    letterSpacing: 0.85,
    color: '#FFFFFF',
  },
});
