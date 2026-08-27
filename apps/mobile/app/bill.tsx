import { capacity, formatMoney, money, remainingLabel, weeklyShareMinor } from '@moed/core';
import type { BillCadence } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CapacityBar } from '@/components/CapacityBar';
import { Chip } from '@/components/Chip';
import { Field, Input } from '@/components/Field';
import {
  CURRENCY,
  createBill,
  deleteBill,
  updateBill,
  useBill,
  useBills,
  useWeekMoneyLimit,
  useWeekSpending,
} from '@/db/money';
import { useKeyboardInset } from '@/lib/keyboard';
import { shortDate } from '@/lib/day';
import { useTheme } from '@/theme';

const CADENCES: { label: string; value: BillCadence }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Fortnightly', value: 'fortnightly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
];

/**
 * `bill` — one bill, and what it costs the week.
 *
 * The foot carries the same confirmation the time forms do: the bar and the figure,
 * before the Save rather than after it. A bill is the money screen's equivalent of an
 * appointment, and it is the one thing on this screen that has to be understood — £980 a
 * month is not £980 out of one week, it is £226 out of every week.
 */
export default function Bill() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const existing = useBill(id);
  const { data: allBills } = useBills();
  const { data: spendRows } = useWeekSpending(new Date());
  const limit = useWeekMoneyLimit();

  const [title, setTitle] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [cadence, setCadence] = useState<BillCadence | null>(null);

  // Derived from the record, never copied into state when the query answers. An edit
  // overrides the bill; absent an edit the bill is the answer.
  const name = title ?? existing?.title ?? '';
  const amountText = amount ?? (existing ? minorToText(existing.amountMinor) : '');
  const every = cadence ?? existing?.cadence ?? 'monthly';

  const amountMinor = textToMinor(amountText);
  const share = weeklyShareMinor(amountMinor, every);

  // Every other bill, so the foot shows what the week looks like with this one in it
  // rather than what it looked like before.
  const others = (allBills ?? []).filter((b) => b.id !== id);
  const otherShare = others.reduce((sum, b) => sum + weeklyShareMinor(b.amountMinor, b.cadence), 0);
  const committed = (spendRows ?? []).reduce((sum, s) => sum + s.amountMinor, 0);

  const after = capacity({ committed, fixed: otherShare + share, limit });
  const unit = money(CURRENCY);

  const footRoom = keyboard > 0 ? 0 : insets.bottom;
  const canSave = name.trim().length > 0 && amountMinor > 0;

  const save = async () => {
    if (!canSave) return;
    if (id !== undefined) {
      await updateBill(id, { title: name.trim(), amountMinor, cadence: every });
    } else {
      await createBill({ title: name.trim(), amountMinor, cadence: every });
    }
    router.replace('/money');
  };

  const remove = async () => {
    if (id === undefined) return;
    await deleteBill(id);
    router.replace('/money');
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.bg,
          paddingTop: insets.top + 18,
          paddingBottom: keyboard,
        },
      ]}
    >
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>Cancel</Text>
        </Pressable>
        <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
          {id !== undefined ? 'Edit bill' : 'New bill'}
        </Text>
        <Pressable onPress={() => void save()} hitSlop={12}>
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
        value={name}
        onChangeText={setTitle}
        placeholder="Rent"
        placeholderTextColor={theme.colors.ink3}
        style={[theme.type.sheetTitle, styles.title, { color: theme.colors.ink }]}
        selectionColor={theme.colors.acc}
      />

      <ScrollView
        style={styles.fields}
        contentContainerStyle={styles.fieldsContent}
        showsVerticalScrollIndicator={false}
      >
        <Field label="Amount">
          <View
            style={[
              styles.amountBox,
              {
                minHeight: theme.geometry.input.minHeight,
                borderRadius: theme.geometry.input.radius,
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.line,
              },
            ]}
          >
            <Text style={[theme.type.sheetTitle, { color: theme.colors.ink2 }]}>£</Text>
            <TextInput
              value={amountText}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={theme.colors.ink3}
              keyboardType="decimal-pad"
              style={[theme.type.sheetTitle, styles.amountInput, { color: theme.colors.ink }]}
              selectionColor={theme.colors.acc}
            />
          </View>
        </Field>

        <Field label="How often">
          <View style={styles.chips}>
            {CADENCES.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                selected={every === c.value}
                onPress={() => setCadence(c.value)}
              />
            ))}
          </View>
        </Field>

        <Field label="Pay by">
          <Input
            value={existing?.dueAt != null ? shortDate(new Date(existing.dueAt)) : 'No date'}
            muted={existing?.dueAt == null}
          />
        </Field>

        <Field label="Alert">
          <Input value="Never" muted />
        </Field>

        {id !== undefined && (
          <Button label="Remove this bill" variant="secondary" onPress={() => void remove()} />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footRoom + 18 }]}>
        <Text style={[theme.type.fieldLabel, styles.footLabel, { color: theme.colors.ink3 }]}>
          This week, with it
        </Text>
        <CapacityBar
          committed={committed}
          fixed={otherShare + share}
          limit={limit}
          unit={unit}
          caption={false}
          height={8}
        />
        <Text style={[theme.type.meta, styles.verdict, { color: theme.colors.ink3 }]}>
          {amountMinor > 0
            ? `${formatMoney(amountMinor, CURRENCY)} ${everyLabel(every)} lands as ${formatMoney(share, CURRENCY)} a week. ${remainingLabel(after, unit)}.`
            : 'A bill is spread across the weeks between its payments, so no week is written off by it.'}
        </Text>
        <Button
          label={id !== undefined ? 'Save bill' : 'Add bill'}
          style={styles.save}
          disabled={!canSave}
          onPress={() => void save()}
        />
      </View>
    </View>
  );
}

function everyLabel(cadence: BillCadence): string {
  switch (cadence) {
    case 'weekly':
      return 'a week';
    case 'fortnightly':
      return 'a fortnight';
    case 'monthly':
      return 'a month';
    case 'quarterly':
      return 'a quarter';
    case 'yearly':
      return 'a year';
  }
}

/**
 * Pounds and pence, both directions, in minor units throughout.
 *
 * The text is kept as text while it is being typed — parsing on every keystroke is how
 * "1." becomes "1" under the finger and a decimal point stops being typeable.
 */
function textToMinor(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (cleaned === '') return 0;
  const [whole, part = ''] = cleaned.split('.');
  const pence = `${part}00`.slice(0, 2);
  return Number(whole || '0') * 100 + Number(pence);
}

function minorToText(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { marginTop: 20, padding: 0 },
  fields: { flex: 1, marginTop: 22 },
  fieldsContent: { gap: 17, paddingBottom: 8 },
  amountBox: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
  },
  amountInput: { flex: 1, padding: 0 },
  chips: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  footer: { flexGrow: 0, flexShrink: 0 },
  footLabel: { marginBottom: 9 },
  verdict: { marginTop: 8 },
  save: { marginTop: 14 },
});
