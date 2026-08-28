import {
  capacity,
  formatMoney,
  money,
  remainingLabel,
  weekBounds,
  weeklyShareMinor,
} from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CapacityBar } from '@/components/CapacityBar';
import { Stepper } from '@/components/Stepper';
import {
  CURRENCY,
  WEEK_LIMIT_MAX_MINOR,
  WEEK_LIMIT_MIN_MINOR,
  WEEK_LIMIT_STEP_MINOR,
  setWeekMoneyLimit,
  useBills,
  useWeekMoneyLimit,
  useWeekSpending,
  useWeeklyBills,
} from '@/db/money';
import { dayTitle, shortDate } from '@/lib/day';
import { useTheme } from '@/theme';

/**
 * `money` — the week's limit, and what is left of it.
 *
 * The same claim as the day, in a different unit: a week has a limit in money the way a
 * day has one in hours, and the app says when it has been passed. Everything here reads
 * through the same capacity bar, because it is the same idea and pretending otherwise
 * would mean maintaining two.
 *
 * Bills are the week's fixed load — taupe, not chosen — and spending is its committed
 * load. That mapping is the whole of the port.
 */
export default function Money() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const { start } = weekBounds(today);
  const [editingLimit, setEditingLimit] = useState(false);

  const { data: billRows } = useBills();
  const { data: spendRows } = useWeekSpending(today);
  const limit = useWeekMoneyLimit();
  const fixed = useWeeklyBills();

  const bills = billRows ?? [];
  const spends = spendRows ?? [];
  const committed = spends.reduce((sum, s) => sum + s.amountMinor, 0);

  const c = capacity({ committed, fixed, limit });
  const unit = money(CURRENCY);

  // Soonest first, and the undated after them rather than missing. A bill with no due
  // date still comes out of the week, so leaving it off this list would make the figure
  // in the bar unaccountable — the one thing a budget cannot afford to be.
  const due = [...bills]
    .sort((a, b) => (a.dueAt ?? Number.POSITIVE_INFINITY) - (b.dueAt ?? Number.POSITIVE_INFINITY))
    .slice(0, 2);

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <Pressable onPress={() => router.replace('/settings')} hitSlop={12}>
        <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>‹ Me</Text>
      </Pressable>

      <Text style={[theme.type.sectionLabel, styles.week, { color: theme.colors.taupe }]}>
        Week of {dayTitle(new Date(start))}
      </Text>
      <Text style={[theme.type.screenTitle, styles.headline, { color: theme.colors.ink }]}>
        {remainingLabel(c, unit)}
      </Text>

      <View style={styles.bar}>
        <CapacityBar
          committed={committed}
          fixed={fixed}
          limit={limit}
          unit={unit}
          composition={`${formatMoney(committed, CURRENCY)} spent · ${formatMoney(fixed, CURRENCY)} in bills`}
          trailing={`of ${formatMoney(limit, CURRENCY)}`}
        />
      </View>

      {/* The limit itself. It was a stored number with nothing anywhere to change it,
          so every week was £600 — Phase 2's first stated deliverable, sitting behind a
          figure the user had never chosen. */}
      <Pressable
        onPress={() => setEditingLimit((open) => !open)}
        accessibilityRole="button"
        style={styles.limitRow}
      >
        <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
          {editingLimit ? 'Done' : 'Set the week’s limit'}
        </Text>
      </Pressable>

      {editingLimit && (
        <View style={styles.limitEditor}>
          <Stepper
            onLess={() => void setWeekMoneyLimit(limit - WEEK_LIMIT_STEP_MINOR)}
            onMore={() => void setWeekMoneyLimit(limit + WEEK_LIMIT_STEP_MINOR)}
            atLeast={limit <= WEEK_LIMIT_MIN_MINOR}
            atMost={limit >= WEEK_LIMIT_MAX_MINOR}
            lessLabel="A smaller week"
            moreLabel="A larger week"
          >
            <Text style={[theme.type.body, { color: theme.colors.ink }]}>
              <Text style={{ fontFamily: theme.fonts.uiSemiBold }}>
                {formatMoney(limit, CURRENCY)}
              </Text>{' '}
              a week
            </Text>
          </Stepper>
        </View>
      )}

      {/* Said once, on the screen where the idea is new. The day never explains itself
          because an hour budget is obvious; a week that already owes its rent is not. */}
      <View
        style={[
          styles.explain,
          {
            backgroundColor: theme.colors.accSoft,
            borderColor: theme.colors.acc,
            borderRadius: theme.geometry.card.radius,
          },
        ]}
      >
        <Text style={[theme.type.bodySmall, { color: theme.colors.acc }]}>
          A week has a limit in money the way a day has one in hours. Bills are spread across the
          weeks between them, so no week is written off by the month&apos;s rent.
        </Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>Bills due</Text>
          <Pressable onPress={() => router.push('/bills')} hitSlop={10}>
            <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
              All {bills.length} ›
            </Text>
          </Pressable>
        </View>

        {due.length === 0 ? (
          <Text style={[theme.type.bodySmall, styles.empty, { color: theme.colors.ink3 }]}>
            No bills yet. A bill lowers the week the moment it is added.
          </Text>
        ) : (
          due.map((bill) => (
            <Pressable
              key={bill.id}
              onPress={() => router.push({ pathname: '/bill', params: { id: bill.id } })}
              style={[styles.row, { borderTopColor: theme.colors.line2 }]}
            >
              <View style={[styles.dot, { backgroundColor: theme.colors.taupe }]} />
              <View style={styles.rowBody}>
                <Text style={[theme.type.rowTitle, { color: theme.colors.ink }]}>{bill.title}</Text>
                <Text style={[theme.type.meta, styles.when, { color: theme.colors.ink3 }]}>
                  {bill.dueAt !== null
                    ? `Pay by ${shortDate(new Date(bill.dueAt))}`
                    : `${formatMoney(weeklyShareMinor(bill.amountMinor, bill.cadence), CURRENCY)} a week`}
                </Text>
              </View>
              <Text style={[theme.type.sheetTitle, styles.amount, { color: theme.colors.ink }]}>
                {formatMoney(bill.amountMinor, bill.currency)}
              </Text>
            </Pressable>
          ))
        )}

        <Text style={[theme.type.sectionLabel, styles.logged, { color: theme.colors.taupe }]}>
          Logged this week
        </Text>

        {spends.length === 0 ? (
          <Text style={[theme.type.bodySmall, styles.empty, { color: theme.colors.ink3 }]}>
            Nothing logged yet.
          </Text>
        ) : (
          spends.map((spend) => (
            <View key={spend.id} style={[styles.row, { borderTopColor: theme.colors.line2 }]}>
              <View style={styles.rowBody}>
                <Text style={[theme.type.body, { color: theme.colors.ink }]}>{spend.title}</Text>
                <Text style={[theme.type.meta, styles.when, { color: theme.colors.ink3 }]}>
                  {shortDate(new Date(spend.spentAt))}
                </Text>
              </View>
              <Text style={[theme.type.sheetTitle, styles.amount, { color: theme.colors.ink }]}>
                {formatMoney(spend.amountMinor, spend.currency)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 18 }}>
        <Button label="Log spending" onPress={() => router.push('/spend')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  week: { marginTop: 18 },
  headline: { marginTop: 7 },
  bar: { marginTop: 18 },
  limitRow: { paddingTop: 12, paddingBottom: 2, alignItems: 'flex-end' },
  limitEditor: { marginTop: 8 },
  explain: { marginTop: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 15 },
  list: { flex: 1, marginTop: 20 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    borderTopWidth: 1,
  },
  rowBody: { flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3, flexGrow: 0, flexShrink: 0 },
  when: { marginTop: 3 },
  amount: { fontSize: 17, lineHeight: 22 },
  logged: { marginTop: 22 },
  empty: { marginTop: 10 },
});
