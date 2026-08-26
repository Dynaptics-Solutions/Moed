import { dayLoad, formatMinutes } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAffordance } from '@/components/AddAffordance';
import { CapacityBar } from '@/components/CapacityBar';
import { RecordRow } from '@/components/RecordRow';
import { useDayLimit } from '@/db/dayLimits';
import { deleteRecord, setDone, useDayRecords, type PlannerRecord } from '@/db/records';
import { PARTS, clockTime, dayPart, dayTitle, weekdayName } from '@/lib/day';
import { useTheme } from '@/theme';

/**
 * `day` — home, and the screen every other list in the planner copies.
 *
 * Records come from SQLite through a live query, so a write anywhere re-renders this
 * without a store in between. The database is the state.
 */
export default function Day() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { landed } = useLocalSearchParams<{ landed?: string }>();

  const today = useMemo(() => new Date(), []);
  const limit = useDayLimit(today);
  const { data: records } = useDayRecords(today);

  const rows = useMemo(() => records ?? [], [records]);
  const load = dayLoad(rows);

  // Adding a record returns here with the new row highlighted and one undo. No success
  // screen and no confirmation dialog — undo, not confirm.
  //
  // Tracked as which record has been dismissed rather than a boolean, so the state is
  // derived from the route and the effect only ever clears it on a timer.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const showUndo = Boolean(landed) && dismissed !== landed;

  useEffect(() => {
    if (!showUndo || !landed) return;
    const timer = setTimeout(() => setDismissed(landed), 6000);
    return () => clearTimeout(timer);
  }, [showUndo, landed]);

  const grouped = PARTS.map((part) => ({
    part,
    records: rows.filter((r) => r.startAt !== null && dayPart(new Date(r.startAt)) === part),
  })).filter((g) => g.records.length > 0);

  const undo = async () => {
    if (!landed) return;
    await deleteRecord(landed);
    setDismissed(landed);
  };

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
            {weekdayName(today)}
          </Text>
          <Text style={[theme.type.screenTitle, styles.date, { color: theme.colors.ink }]}>
            {dayTitle(today)}
          </Text>
        </View>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.colors.accSoft, borderColor: theme.colors.line },
          ]}
        >
          <Text
            style={[
              theme.type.chip,
              { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.acc },
            ]}
          >
            JM
          </Text>
        </View>
      </View>

      <View style={styles.bar}>
        <CapacityBar
          committed={load.committed}
          fixed={load.fixed}
          limit={limit}
          composition={
            load.committed + load.fixed === 0
              ? undefined
              : `${formatMinutes(load.committed)} work · ${formatMinutes(load.fixed)} fixed`
          }
        />
      </View>

      {/* Lists scroll, screens do not. */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {grouped.length === 0
          ? null
          : grouped.map((group, groupIndex) => (
              <View key={group.part} style={groupIndex > 0 ? styles.groupGap : undefined}>
                <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
                  {group.part}
                </Text>
                <View style={styles.group}>
                  {group.records.map((record, i) => (
                    <Row
                      key={record.id}
                      record={record}
                      first={i === 0}
                      highlighted={record.id === landed}
                    />
                  ))}
                </View>
              </View>
            ))}
      </ScrollView>

      {showUndo && (
        <Pressable
          onPress={() => void undo()}
          style={[
            styles.undo,
            theme.shadow,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.line,
              borderRadius: theme.geometry.input.radius,
            },
          ]}
        >
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>Added</Text>
          <Text
            style={[
              theme.type.bodySmall,
              { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.acc },
            ]}
          >
            Undo
          </Text>
        </Pressable>
      )}

      <AddAffordance bottomInset={insets.bottom} onPress={() => router.push('/capture')} />
    </View>
  );

  function Row({
    record,
    first,
    highlighted,
  }: {
    record: PlannerRecord;
    first: boolean;
    highlighted: boolean;
  }) {
    const trailing =
      record.startAt !== null
        ? clockTime(new Date(record.startAt))
        : formatMinutes(record.lengthMinutes);

    return (
      <View
        style={
          highlighted
            ? [
                styles.highlight,
                {
                  backgroundColor: theme.colors.accSoft,
                  borderRadius: theme.geometry.input.radius,
                },
              ]
            : undefined
        }
      >
        <RecordRow
          title={record.title}
          done={record.state === 'done'}
          trailing={trailing}
          first={first || highlighted}
          onToggle={() => void setDone(record.id, record.state !== 'done')}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  date: { marginTop: 7 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    flexGrow: 0,
    flexShrink: 0,
  },
  bar: { marginTop: 20 },
  list: { flex: 1, marginTop: 24 },
  listContent: { paddingBottom: 8 },
  group: { marginTop: 9 },
  groupGap: { marginTop: 22 },
  highlight: { paddingHorizontal: 10, marginHorizontal: -10 },
  undo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
});
