import { capNotice, canCreate, formatMoney, weeklyShareMinor } from '@moed/core';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlan } from '@/db/plan';
import { CURRENCY, useBills, useWeeklyBills } from '@/db/money';
import { shortDate } from '@/lib/day';
import { useTheme } from '@/theme';

const CADENCE_LABEL: Record<string, string> = {
  weekly: 'Every week',
  fortnightly: 'Every fortnight',
  monthly: 'Every month',
  quarterly: 'Every quarter',
  yearly: 'Every year',
};

/**
 * `bills` — everything the week owes before it starts.
 *
 * Five on the free plan. The cap is a creation limit, so the sixth card offers the
 * subscription rather than pretending the list is full; a lapsed subscriber holding
 * eight keeps eight and is simply not offered a ninth.
 */
export default function Bills() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const plan = usePlan();
  const { data } = useBills();
  const weekly = useWeeklyBills();

  const bills = data ?? [];
  const room = canCreate(plan, 'bills', bills.length);
  const notice = capNotice('bills', plan);

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <Pressable onPress={() => router.replace('/money')} hitSlop={12}>
        <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>‹ Money</Text>
      </Pressable>

      <Text style={[theme.type.screenTitle, styles.title, { color: theme.colors.ink }]}>Bills</Text>

      <Text style={[theme.type.bodySmall, styles.summary, { color: theme.colors.ink2 }]}>
        {bills.length === 0
          ? 'Nothing yet. A bill is dated and fixed, and it lowers the week the moment it is added.'
          : `${formatMoney(weekly, CURRENCY)} a week once spread, across ${bills.length === 1 ? 'one' : bills.length}.`}
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {bills.map((bill) => (
          <Pressable
            key={bill.id}
            onPress={() => router.push({ pathname: '/bill', params: { id: bill.id } })}
            style={[
              styles.card,
              theme.shadow,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.line,
                borderRadius: theme.geometry.card.radius,
              },
            ]}
          >
            <View style={styles.cardBody}>
              <Text
                style={[
                  theme.type.body,
                  { fontFamily: theme.fonts.uiMedium, color: theme.colors.ink },
                ]}
              >
                {bill.title}
              </Text>
              <Text style={[theme.type.meta, styles.when, { color: theme.colors.ink3 }]}>
                {CADENCE_LABEL[bill.cadence] ?? bill.cadence}
                {bill.dueAt !== null ? ` · next ${shortDate(new Date(bill.dueAt))}` : ''} ·{' '}
                {formatMoney(weeklyShareMinor(bill.amountMinor, bill.cadence), CURRENCY)} a week
              </Text>
            </View>
            <Text style={[theme.type.sheetTitle, styles.amount, { color: theme.colors.ink }]}>
              {formatMoney(bill.amountMinor, bill.currency)}
            </Text>
          </Pressable>
        ))}

        {room ? (
          <Pressable
            onPress={() => router.push('/bill')}
            style={[
              styles.add,
              { borderColor: theme.colors.line, borderRadius: theme.geometry.card.radius },
            ]}
          >
            <Text style={[theme.type.bodySmall, { color: theme.colors.acc }]}>Add a bill</Text>
          </Pressable>
        ) : (
          // The cap reached. It says the number and offers the way through, and the
          // badge is taupe: a limit is a fact about the plan, not an alarm.
          <View
            style={[
              styles.add,
              { borderColor: theme.colors.line, borderRadius: theme.geometry.card.radius },
            ]}
          >
            <View style={styles.cardBody}>
              <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>
                Add a {ordinal(bills.length + 1)} bill
              </Text>
              <Text style={[theme.type.meta, styles.when, { color: theme.colors.ink3 }]}>
                {notice} · unlimited bills is part of the subscription
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.taupe }]}>
              <Text style={[theme.type.fieldLabel, { color: theme.colors.onAcc }]}>Paid</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 18 }} />
    </View>
  );
}

function ordinal(n: number): string {
  const names = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
  return names[n - 1] ?? `${n}th`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  title: { marginTop: 16 },
  summary: { marginTop: 8 },
  list: { flex: 1, marginTop: 20 },
  listContent: { gap: 9, paddingBottom: 8 },
  card: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  cardBody: { flex: 1 },
  when: { marginTop: 4 },
  amount: { fontSize: 19, lineHeight: 24 },
  add: {
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  badge: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6 },
});
