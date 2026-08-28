import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/**
 * `types` — never on the default path. It is reached from "Make this a…" or a template,
 * because the fast path is capture, and a type picker in front of every new record
 * would make the most common action the slowest one.
 *
 * Seven kinds, as the design shows. It listed five while bill and spending had no
 * screens to lead to; they arrived with the money phase, so the two cards and the
 * heading arrive with them.
 *
 * The five time kinds carry what capture parsed. Bill and spending do not: what they
 * take is an amount and a cadence, and a length in minutes means nothing to either.
 */

const KINDS = [
  { route: '/task', name: 'Task', desc: 'One thing, one length', carries: true },
  { route: '/routine', name: 'Routine', desc: 'A checklist in one block', carries: true },
  { route: '/session', name: 'Session', desc: 'Time, not a tick box', carries: true },
  { route: '/errand', name: 'Errand', desc: 'A place, not a time', carries: true },
  { route: '/appt', name: 'Appointment', desc: 'Fixed, from your calendar', carries: true },
  { route: '/bill', name: 'Bill', desc: 'Money, on a cadence', carries: false },
  { route: '/spend', name: 'Spending', desc: 'Money, already gone', carries: false },
] as const;

export default function Types() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    lengthMinutes?: string;
    startAt?: string;
  }>();

  const carry = {
    title: params.title ?? '',
    lengthMinutes: params.lengthMinutes ?? '',
    startAt: params.startAt ?? '',
  };

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 18 }]}
    >
      <View style={styles.bar}>
        <Pressable onPress={() => router.replace('/')} hitSlop={12}>
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>Cancel</Text>
        </Pressable>
        <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>Make this a…</Text>
        <View style={styles.balance} />
      </View>

      <Text style={[theme.type.sheetTitle, styles.title, { color: theme.colors.ink }]}>
        Seven kinds{'\n'}of record
      </Text>
      <Text style={[theme.type.bodySmall, styles.blurb, { color: theme.colors.ink2 }]}>
        Each behaves differently. That is the only reason kinds exist.
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {KINDS.map((kind) => (
          <Pressable
            key={kind.route}
            onPress={() =>
              router.replace(kind.carries ? { pathname: kind.route, params: carry } : kind.route)
            }
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
            <Text
              style={[
                theme.type.body,
                { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.ink },
              ]}
            >
              {kind.name}
            </Text>
            <Text style={[theme.type.meta, styles.desc, { color: theme.colors.ink3 }]}>
              {kind.desc}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text
        style={[
          theme.type.meta,
          { color: theme.colors.ink3, paddingTop: 14, paddingBottom: insets.bottom + 18 },
        ]}
      >
        Hours or money. If it spends neither, it is not a record.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balance: { width: 44 },
  title: { marginTop: 20, fontSize: 28, lineHeight: 32.5 },
  blurb: { marginTop: 9 },
  list: { flex: 1, marginTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, alignContent: 'flex-start' },
  card: {
    width: '47.5%',
    flexGrow: 1,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 14,
  },
  desc: { marginTop: 6, fontSize: 11 },
});
