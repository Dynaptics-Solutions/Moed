import { capacity, dayLoad, formatMinutes, leftoverMeta, startOfDay } from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { limitFor, useDefaultDayLimit, useLimitsByDate } from '@/db/dayLimits';
import { dropRecord, scheduleRecord, useDayRecords, type PlannerRecord } from '@/db/records';
import { useTrayRecords } from '@/db/tray';
import { weekdayName } from '@/lib/day';
import { useTheme } from '@/theme';

/**
 * `tray` — not in the design package, and built to the patterns around it.
 *
 * It exists because nothing disappears. A record left open on a day that has gone does
 * not roll into tomorrow and does not vanish; it waits here, carrying the number of
 * times it has slipped, until someone decides what to do with it.
 *
 * Three deliberate choices, each following a rule this product already has:
 *
 *  - **The slip count is stated, not styled.** A record that slipped three times reads
 *    "slipped 3 times" in `ink3`. It is a fact, not an alarm — `over` is only ever past
 *    the limit, and turning a neglected record red forever is precisely the failure the
 *    tray was invented to avoid.
 *  - **The fit is shown before the tap, not after.** Each row says what putting it back
 *    on today would cost, so the decision is made with the number in front of it. That
 *    is the gate's job done in place; a sheet over a sheet would be worse.
 *  - **Nothing here moved itself.** Every row needs a tap. The app proposes.
 */
export default function Tray() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const { data: waiting } = useTrayRecords(today);
  const { data: todayRows } = useDayRecords(today);
  const limits = useLimitsByDate();
  const fallback = useDefaultDayLimit();

  const rows = useMemo(() => waiting ?? [], [waiting]);
  const limit = limitFor(limits, today, fallback);
  const load = dayLoad(todayRows ?? []);
  const free = Math.max(0, limit - load.committed - load.fixed);

  const place = async (record: PlannerRecord, days: number) => {
    const target = startOfDay(today);
    target.setDate(target.getDate() + days);
    // Keep the time of day it was originally given; a record that was a 9am thing stays
    // a 9am thing.
    const was = record.startAt !== null ? new Date(record.startAt) : null;
    target.setHours(was?.getHours() ?? 9, was?.getMinutes() ?? 0, 0, 0);
    await scheduleRecord(record.id, target.getTime());
  };

  const tomorrow = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }, [today]);

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>Tray</Text>
      <Text style={[theme.type.screenTitle, styles.headline, { color: theme.colors.ink }]}>
        {rows.length === 0
          ? 'Nothing waiting'
          : `${rows.length === 1 ? 'One' : rows.length} waiting`}
      </Text>
      <Text style={[theme.type.bodySmall, styles.blurb, { color: theme.colors.ink2 }]}>
        {rows.length === 0
          ? 'Every record is on a day.'
          : 'Nothing here was moved for you. It waits until you put it somewhere.'}
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((record) => {
          const after = capacity({
            committed: load.committed + (record.isFixed ? 0 : record.lengthMinutes),
            fixed: load.fixed + (record.isFixed ? record.lengthMinutes : 0),
            limit,
          });

          const from =
            record.startAt !== null ? `from ${weekdayName(new Date(record.startAt))}` : 'no date';
          const meta = [leftoverMeta(record.lengthMinutes, record.slipCount), from]
            .filter((s) => s !== '')
            .join(' · ');

          return (
            <View
              key={record.id}
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
                  { fontFamily: theme.fonts.uiMedium, color: theme.colors.ink },
                ]}
              >
                {record.title}
              </Text>
              <Text style={[theme.type.meta, styles.meta, { color: theme.colors.ink3 }]}>
                {meta}
              </Text>

              {/* The consequence, before the tap rather than after it. */}
              <Text
                style={[
                  theme.type.meta,
                  styles.fit,
                  { color: after.isOver ? theme.colors.over : theme.colors.ink3 },
                ]}
              >
                {after.isOver
                  ? `Today has ${formatMinutes(free)} free. This puts you ${formatMinutes(after.over)} over.`
                  : `Today has ${formatMinutes(free)} free. This fits.`}
              </Text>

              <View style={styles.choices}>
                <Chip block label="Today" onPress={() => void place(record, 0)} />
                <Chip block label={weekdayName(tomorrow)} onPress={() => void place(record, 1)} />
                <Chip block label="Drop" onPress={() => void dropRecord(record.id)} />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 18 }}>
        <Button label="Back to today" variant="secondary" onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  headline: { marginTop: 8 },
  blurb: { marginTop: 8 },
  list: { flex: 1, marginTop: 20 },
  listContent: { gap: 11, paddingBottom: 8 },
  card: { borderWidth: 1, paddingVertical: 15, paddingHorizontal: 16 },
  meta: { marginTop: 4 },
  fit: { marginTop: 8 },
  choices: { marginTop: 12, flexDirection: 'row', gap: 7 },
});
