import { capacity, dayLoad, formatMinutes, gate } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CapacityBar } from '@/components/CapacityBar';
import { Chip } from '@/components/Chip';
import { useDayLimit } from '@/db/dayLimits';
import { createRecord, useDayRecords } from '@/db/records';
import { clockTime } from '@/lib/day';
import { useTheme } from '@/theme';

/**
 * `task` — one form for one kind, showing only that kind's fields.
 *
 * The bar at the foot is the same component as the day's, at 8px. It answers the
 * question the form raises — does this fit — before the button is pressed, so the gate
 * is a confirmation rather than a surprise.
 */

const LENGTHS: { label: string; minutes: number }[] = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: 'Half day', minutes: 285 },
];

export default function Task() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    title?: string;
    lengthMinutes?: string;
    startAt?: string;
  }>();

  const today = useMemo(() => new Date(), []);

  const [title, setTitle] = useState(params.title ?? '');
  const [lengthMinutes, setLengthMinutes] = useState(Number(params.lengthMinutes) || 60);
  const startAt = Number(params.startAt) || today.getTime();

  const limit = useDayLimit(today);
  const { data: dayRecords } = useDayRecords(today);

  const load = dayLoad(dayRecords ?? []);
  const before = capacity({ ...load, limit });
  const decision = gate({ ...load, limit, adding: lengthMinutes });

  const start = new Date(startAt);
  const end = new Date(startAt + lengthMinutes * 60_000);

  const onSave = async () => {
    if (title.trim().length === 0) return;

    if (decision.fits) {
      const created = await createRecord({ kind: 'task', title, lengthMinutes, startAt });
      router.replace({ pathname: '/', params: { landed: created.id } });
      return;
    }

    router.replace({
      pathname: '/gate',
      params: { title, lengthMinutes: String(lengthMinutes), startAt: String(startAt) },
    });
  };

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 18 }]}
    >
      <View style={styles.bar}>
        <Pressable onPress={() => router.replace('/')} hitSlop={12}>
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>Cancel</Text>
        </Pressable>
        <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>New task</Text>
        <Pressable onPress={() => void onSave()} hitSlop={12}>
          <Text
            style={[
              theme.type.bodySmall,
              { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.acc },
            ]}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="What is it"
        placeholderTextColor={theme.colors.ink3}
        style={[theme.type.sheetTitle, styles.title, { color: theme.colors.ink }]}
        selectionColor={theme.colors.acc}
        multiline
      />

      <ScrollView style={styles.fields} showsVerticalScrollIndicator={false}>
        <Field label="How long">
          <View style={styles.chips}>
            {LENGTHS.map((l) => (
              <Chip
                key={l.label}
                label={l.label}
                selected={lengthMinutes === l.minutes}
                onPress={() => setLengthMinutes(l.minutes)}
              />
            ))}
          </View>
        </Field>

        <Field label="When">
          <Input value={`Today · ${clockTime(start)} — ${clockTime(end)}`} />
        </Field>

        <Field label="Project">
          <Input value="None" />
        </Field>

        <View style={styles.pair}>
          <Field label="Remind" style={styles.pairItem}>
            <Input value="Never" />
          </Field>
          <Field label="Repeat" style={styles.pairItem}>
            <Input value="Never" />
          </Field>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <CapacityBar
          committed={load.committed + lengthMinutes}
          fixed={load.fixed}
          limit={limit}
          caption={false}
          height={8}
        />
        <Text style={[theme.type.meta, styles.verdict, { color: theme.colors.ink3 }]}>
          {decision.fits
            ? `Today has ${formatMinutes(before.remaining)} free. This fits.`
            : `This puts you ${formatMinutes(decision.overBy)} over.`}
        </Text>
        <Button label="Add to today" style={styles.save} onPress={() => void onSave()} />
      </View>
    </View>
  );

  function Field({
    label,
    children,
    style,
  }: {
    label: string;
    children: React.ReactNode;
    style?: object;
  }) {
    return (
      <View style={[styles.field, style]}>
        <Text style={[theme.type.fieldLabel, styles.fieldLabel, { color: theme.colors.ink3 }]}>
          {label}
        </Text>
        {children}
      </View>
    );
  }

  function Input({ value }: { value: string }) {
    return (
      <View
        style={[
          styles.input,
          {
            minHeight: theme.geometry.input.minHeight,
            borderRadius: theme.geometry.input.radius,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.line,
          },
        ]}
      >
        <Text style={[theme.type.body, { color: theme.colors.ink }]}>{value}</Text>
        <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>▾</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { marginTop: 22, padding: 0 },
  fields: { flex: 1, marginTop: 24 },
  field: { marginBottom: 18 },
  fieldLabel: { marginBottom: 7 },
  chips: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  input: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  pair: { flexDirection: 'row', gap: 9 },
  pairItem: { flex: 1 },
  footer: { flexGrow: 0, flexShrink: 0 },
  verdict: { marginTop: 8 },
  save: { marginTop: 14 },
});
