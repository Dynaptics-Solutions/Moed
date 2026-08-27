import { dayLoad, daySummary, formatMinutes, tomorrowLine } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CapacityBar } from '@/components/CapacityBar';
import { RecordRow } from '@/components/RecordRow';
import { limitFor, useLimitsByDate } from '@/db/dayLimits';
import { useDayRecords } from '@/db/records';
import { clockTime, weekdayName } from '@/lib/day';
import { useTheme } from '@/theme';

/**
 * `shut` — the day, closed.
 *
 * What it spent, what happened to what was left, and what tomorrow looks like. Three
 * counts and no score: this is an account of a day, not a mark out of ten. There are no
 * streaks here and there never will be.
 */
export default function Shut() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ done?: string; moved?: string; dropped?: string }>();

  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);

  const limits = useLimitsByDate();
  const { data: todayRows } = useDayRecords(today);
  const { data: tomorrowRows } = useDayRecords(tomorrow);

  const limit = limitFor(limits, today);
  const summary = daySummary(todayRows ?? [], limit, {
    done: Number(params.done) || 0,
    moved: Number(params.moved) || 0,
    dropped: Number(params.dropped) || 0,
  });

  const load = dayLoad(todayRows ?? []);
  const tomorrowLoad = dayLoad(tomorrowRows ?? []);
  const tomorrowLimit = limitFor(limits, tomorrow);

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
        {weekdayName(today)}, shut
      </Text>
      <Text style={[theme.type.screenTitle, styles.headline, { color: theme.colors.ink }]}>
        {formatMinutes(summary.usedMinutes)} used{'\n'}of {formatMinutes(summary.limitMinutes)}
      </Text>

      <View style={styles.bar}>
        <CapacityBar committed={load.committed} fixed={load.fixed} limit={limit} caption={false} />
      </View>

      <View style={styles.counts}>
        <Count label="Done" value={summary.counts.done} />
        <Count label="Moved" value={summary.counts.moved} />
        <Count label="Dropped" value={summary.counts.dropped} />
      </View>

      <Text style={[theme.type.sectionLabel, styles.tomorrowLabel, { color: theme.colors.taupe }]}>
        Tomorrow
      </Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {(tomorrowRows ?? []).length === 0 ? (
          <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>Nothing yet.</Text>
        ) : (
          (tomorrowRows ?? []).map((record, i) => (
            <RecordRow
              key={record.id}
              title={record.title}
              trailing={
                record.slipCount > 0
                  ? 'moved'
                  : record.startAt !== null
                    ? clockTime(new Date(record.startAt))
                    : formatMinutes(record.lengthMinutes)
              }
              first={i === 0}
            />
          ))
        )}
      </ScrollView>

      <Text style={[theme.type.meta, styles.line, { color: theme.colors.ink3 }]}>
        {tomorrowLine(tomorrowLoad.committed + tomorrowLoad.fixed, tomorrowLimit)}
      </Text>

      <View style={{ paddingBottom: insets.bottom + 18 }}>
        <Button label="Close" variant="secondary" onPress={() => router.replace('/')} />
      </View>
    </View>
  );

  function Count({ label, value }: { label: string; value: number }) {
    return (
      <View
        style={[
          styles.count,
          theme.shadow,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.line,
            borderRadius: theme.geometry.card.radius,
          },
        ]}
      >
        <Text style={[theme.type.sectionLabel, { color: theme.colors.ink3 }]}>{label}</Text>
        <Text style={[theme.type.sheetTitle, styles.countValue, { color: theme.colors.ink }]}>
          {value}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  headline: { marginTop: 8, fontSize: 32, lineHeight: 35.8 },
  bar: { marginTop: 18 },
  counts: { marginTop: 20, flexDirection: 'row', gap: 9 },
  count: { flex: 1, borderWidth: 1, padding: 14 },
  countValue: { marginTop: 5, fontSize: 26 },
  tomorrowLabel: { marginTop: 22 },
  list: { flex: 1, marginTop: 9 },
  line: { marginBottom: 10 },
});
