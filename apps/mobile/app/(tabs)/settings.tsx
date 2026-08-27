import { LAPSE_NOTICE, isEntitled, type Plan } from '@moed/core';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { usePlan } from '@/db/plan';
import { useTheme } from '@/theme';

/**
 * `settings` — a flat list, no nesting.
 *
 * Plan state and the way through sit at the top; everything else is one row deep. A
 * settings screen with sections inside sections is where features go to be lost, and
 * this product has few enough of them to show all at once.
 *
 * The last line is not decoration. Export is never behind the paywall, in any state,
 * and saying so on the screen where someone would look for it is the cheapest way to
 * make the promise real.
 */

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free plan',
  trial: 'Trial',
  paid: 'Subscribed',
  lapsed: 'Subscription ended',
};

/**
 * Rows whose destinations arrive with later phases are marked rather than hidden. A
 * setting that appears the week its feature ships is a setting nobody finds; one that
 * says what it is for is a map.
 */
const ROWS: { key: string; value: string; route?: string }[] = [
  { key: 'Day limit', value: '9h 30m' },
  { key: 'Notifications', value: 'Evening close' },
  { key: 'Calendars', value: 'None connected' },
  { key: 'Projects', value: '', route: '/projects' },
  { key: 'Search', value: '', route: '/search' },
  { key: 'The tray', value: '', route: '/tray' },
  { key: 'Money', value: 'Phase 2' },
  { key: 'Diet plan', value: 'Paid' },
  { key: 'Activity', value: 'Paid' },
  { key: 'Export', value: 'Always free' },
  { key: 'Account', value: '' },
];

export default function Settings() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const plan = usePlan();

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <Text style={[theme.type.screenTitle, { fontSize: 32, color: theme.colors.ink }]}>Me</Text>

      <View
        style={[
          styles.account,
          theme.shadow,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.line,
            borderRadius: theme.geometry.card.radius,
          },
        ]}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.colors.accSoft, borderColor: theme.colors.line },
          ]}
        >
          <Text
            style={[
              theme.type.bodySmall,
              { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.acc },
            ]}
          >
            JM
          </Text>
        </View>
        <View style={styles.accountText}>
          <Text
            style={[
              theme.type.body,
              { fontFamily: theme.fonts.uiMedium, fontSize: 14.5, color: theme.colors.ink },
            ]}
          >
            Not signed in
          </Text>
          <Text style={[theme.type.meta, styles.accountSub, { color: theme.colors.ink3 }]}>
            {PLAN_LABEL[plan]}
          </Text>
        </View>
        {!isEntitled(plan) && <Chip label="Upgrade" selected />}
      </View>

      {plan === 'lapsed' && (
        <View
          style={[
            styles.lapse,
            {
              backgroundColor: theme.colors.taupeSoft,
              borderColor: theme.colors.taupe,
              borderRadius: theme.geometry.card.radius,
            },
          ]}
        >
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink }]}>{LAPSE_NOTICE}</Text>
        </View>
      )}

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {ROWS.map((row, i) => (
          <Pressable
            key={row.key}
            onPress={row.route ? () => router.push(row.route as '/projects') : undefined}
            accessibilityRole={row.route ? 'button' : undefined}
            style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.line2 }]}
          >
            <Text style={[theme.type.rowTitle, styles.rowKey, { color: theme.colors.ink }]}>
              {row.key}
            </Text>
            {row.value !== '' && (
              <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>{row.value}</Text>
            )}
            <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>›</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text
        style={[
          theme.type.meta,
          { color: theme.colors.ink3, paddingBottom: insets.bottom + 18, paddingTop: 10 },
        ]}
      >
        Export is never behind the paywall.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  account: {
    marginTop: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  accountText: { flex: 1 },
  accountSub: { marginTop: 3 },
  lapse: { marginTop: 11, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 15 },
  list: { flex: 1, marginTop: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  rowKey: { flex: 1, fontSize: 14.5 },
});
