import { capacity, formatMoney, money, remainingLabel } from '@moed/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CapacityBar } from '@/components/CapacityBar';
import { Chip } from '@/components/Chip';
import {
  CURRENCY,
  logSpending,
  useWeekMoneyLimit,
  useWeekSpending,
  useWeeklyBills,
} from '@/db/money';
import { dayTitle, weekdayName } from '@/lib/day';
import { useKeyboardInset } from '@/lib/keyboard';
import { useTheme } from '@/theme';

const CATEGORIES = ['Food', 'Transport', 'Home', 'Other'];

/**
 * `spend` — one amount, one word for what it was, and what it leaves.
 *
 * The amount is the screen. Everything else is a chip, because logging spending happens
 * standing in a shop and a form with six fields is a form nobody fills in.
 *
 * The bar underneath shows the amount as `estimated` while it is being typed — the
 * dashed segment that means "planned, not yet actual" on the day. It is not spent until
 * the button is pressed, and the bar should not claim otherwise.
 */
export default function Spend() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const router = useRouter();

  const today = new Date();
  const { data: spendRows } = useWeekSpending(today);
  const limit = useWeekMoneyLimit();
  const fixed = useWeeklyBills();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');

  const pending = textToMinor(amount);
  const committed = (spendRows ?? []).reduce((sum, s) => sum + s.amountMinor, 0);

  const after = capacity({ committed, fixed, estimated: pending, limit });
  const unit = money(CURRENCY);
  const canSave = pending > 0;

  const footRoom = keyboard > 0 ? 0 : insets.bottom;

  const save = async () => {
    if (!canSave) return;
    await logSpending({
      title: note.trim() === '' ? category : `${category} · ${note.trim()}`,
      amountMinor: pending,
    });
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
        <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>Log spending</Text>
        <View style={styles.barSpacer} />
      </View>

      <View style={styles.centre}>
        <View style={styles.amountRow}>
          <Text style={[theme.type.bigNumber, styles.currency, { color: theme.colors.ink3 }]}>
            £
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={theme.colors.ink3}
            keyboardType="decimal-pad"
            autoFocus
            style={[theme.type.bigNumber, styles.amount, { color: theme.colors.ink }]}
            selectionColor={theme.colors.acc}
          />
        </View>
        <Text style={[theme.type.meta, styles.date, { color: theme.colors.ink3 }]}>
          {weekdayName(today)} {dayTitle(today)}
        </Text>

        <Text style={[theme.type.fieldLabel, styles.label, { color: theme.colors.ink3 }]}>
          What for
        </Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note"
          placeholderTextColor={theme.colors.ink3}
          style={[
            theme.type.body,
            styles.note,
            {
              minHeight: theme.geometry.input.minHeight,
              borderRadius: theme.geometry.input.radius,
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.line,
              color: theme.colors.ink,
            },
          ]}
          selectionColor={theme.colors.acc}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: footRoom + 18 }]}>
        <Text style={[theme.type.fieldLabel, styles.footLabel, { color: theme.colors.ink3 }]}>
          This week
        </Text>
        <CapacityBar
          committed={committed}
          fixed={fixed}
          estimated={pending}
          limit={limit}
          unit={unit}
          caption={false}
          height={8}
        />
        <Text style={[theme.type.meta, styles.verdict, { color: theme.colors.ink3 }]}>
          {formatMoney(committed + fixed, CURRENCY)} committed
          {pending > 0 ? ` · ${formatMoney(pending, CURRENCY)} pending` : ''} ·{' '}
          {remainingLabel(after, unit)}
        </Text>
        <Button
          label="Log it"
          style={styles.save}
          disabled={!canSave}
          onPress={() => void save()}
        />
      </View>
    </View>
  );
}

function textToMinor(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (cleaned === '') return 0;
  const [whole, part = ''] = cleaned.split('.');
  const pence = `${part}00`.slice(0, 2);
  return Number(whole || '0') * 100 + Number(pence);
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barSpacer: { width: 44 },
  centre: { flex: 1, justifyContent: 'center', gap: 22 },
  amountRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 2 },
  currency: { fontSize: 34, lineHeight: 56 },
  amount: { fontSize: 52, lineHeight: 56, padding: 0, minWidth: 120, textAlign: 'center' },
  date: { textAlign: 'center', marginTop: -14 },
  label: { textAlign: 'center' },
  chips: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: -14,
  },
  note: { borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11 },
  footer: { flexGrow: 0, flexShrink: 0 },
  footLabel: { marginBottom: 9 },
  verdict: { marginTop: 8 },
  save: { marginTop: 14 },
});
