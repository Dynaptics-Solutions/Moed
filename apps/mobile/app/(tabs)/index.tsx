import { dayLoad, formatMinutes } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddAffordance } from '@/components/AddAffordance';
import { CapacityBar } from '@/components/CapacityBar';
import { RecordRow } from '@/components/RecordRow';
import { useDayLimit } from '@/db/dayLimits';
import { useTrayRecords } from '@/db/tray';
import { deleteRecord, setDone, setStartAt, useDayRecords, type PlannerRecord } from '@/db/records';
import { PARTS, clockTime, dayPart, dayTitle, weekdayName } from '@/lib/day';
import { useTabScreenInsets } from '@/lib/insets';
import { useTheme } from '@/theme';

/**
 * `day` — home, and the screen every other list in the planner copies.
 *
 * Records come from SQLite through a live query, so a write anywhere re-renders this
 * without a store in between. The database is the state.
 */
export default function Day() {
  const theme = useTheme();
  const insets = useTabScreenInsets();
  const router = useRouter();
  const { landed, movedId, movedTitle, movedTo, movedFrom } = useLocalSearchParams<{
    landed?: string;
    movedId?: string;
    movedTitle?: string;
    movedTo?: string;
    movedFrom?: string;
  }>();

  const today = useMemo(() => new Date(), []);
  const limit = useDayLimit(today);
  const { data: records } = useDayRecords(today);
  const { data: trayRows } = useTrayRecords(today);

  const rows = useMemo(() => records ?? [], [records]);
  const tray = useMemo(() => trayRows ?? [], [trayRows]);
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

  // One tap reverses the whole decision. Accepting the gate's "move Rye to Thursday and
  // add this" is one answer to one question, so undoing it puts Rye back as well —
  // an undo that only half undoes is worse than none, because it looks like it worked.
  const undo = async () => {
    if (!landed) return;
    await deleteRecord(landed);
    if (movedId) await setStartAt(movedId, movedFrom ? Number(movedFrom) : null);
    setDismissed(landed);
  };

  const undoLabel =
    movedTitle && movedTo ? `Added, and “${movedTitle}” moved to ${movedTo}` : 'Added';

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

      {/* Nothing disappears, and the count is the point — a record that has slipped is
          visible from the day it slipped off, not buried in a menu. */}
      {tray.length > 0 && (
        <Pressable
          onPress={() => router.push('/tray')}
          style={[
            styles.tray,
            {
              backgroundColor: theme.colors.taupeSoft,
              borderColor: theme.colors.taupe,
              borderRadius: theme.geometry.input.radius,
            },
          ]}
        >
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink }]}>
            {tray.length === 1 ? 'One record' : `${tray.length} records`} waiting in the tray
          </Text>
          <Text style={[theme.type.meta, { color: theme.colors.taupe }]}>›</Text>
        </Pressable>
      )}

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
        {/* The close is triggered by the evening notification in the finished product.
            Until notifications exist it needs a door, and the foot of the day is where
            someone already is when the day is over. */}
        <Pressable onPress={() => router.push('/close')} style={styles.closeRow}>
          <Text style={[theme.type.bodySmall, { color: theme.colors.acc }]}>Close the day</Text>
        </Pressable>
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
          <Text style={[theme.type.bodySmall, styles.undoLabel, { color: theme.colors.ink2 }]}>
            {undoLabel}
          </Text>
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
          onPress={() => router.push({ pathname: '/detail', params: { id: record.id } })}
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
  tray: {
    marginTop: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  closeRow: { paddingTop: 22, paddingBottom: 4 },
  undoLabel: { flex: 1, marginRight: 12 },
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
