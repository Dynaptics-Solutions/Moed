import { bestMove, dayLoad, formatMinutes, full, isSameDay } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddAffordance } from '@/components/AddAffordance';
import { CapacityBar } from '@/components/CapacityBar';
import { Chip } from '@/components/Chip';
import { RecordRow } from '@/components/RecordRow';
import { useDayLimit } from '@/db/dayLimits';
import { useTrayRecords } from '@/db/tray';
import { useUpcomingDays } from '@/db/upcoming';
import {
  deleteRecord,
  moveRecord,
  moveToTray,
  setDone,
  setStartAt,
  useDayRecords,
  type PlannerRecord,
} from '@/db/records';
import { PARTS, clockTime, dayPart, dayTitle, weekdayName, weekdayShort } from '@/lib/day';
import { useTabScreenInsets } from '@/lib/insets';
import { useTheme } from '@/theme';

/** Something the day just did on the user's say-so, and the one tap that takes it back. */
type Taken = { label: string; undo: () => Promise<void> };

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
  const { date, landed, movedId, movedTitle, movedTo, movedFrom } = useLocalSearchParams<{
    date?: string;
    landed?: string;
    movedId?: string;
    movedTitle?: string;
    movedTo?: string;
    movedFrom?: string;
  }>();

  const today = useMemo(() => new Date(), []);

  // Any day, not only this one. Week and month both had to send you here to open a day
  // and could only ever send you to today, so a Thursday tapped in the week view opened
  // Tuesday — and `full`, which is the whole reason to look at another day before it
  // arrives, was unreachable for every day but the one in front of you.
  const shown = useMemo(() => {
    const at = Number(date);
    return Number.isFinite(at) && at > 0 ? new Date(at) : today;
  }, [date, today]);

  const isToday = isSameDay(shown, today);

  const limit = useDayLimit(shown);
  const { data: records } = useDayRecords(shown);
  const { data: trayRows } = useTrayRecords(today);

  const upcoming = useUpcomingDays(shown);

  const rows = useMemo(() => records ?? [], [records]);
  const tray = useMemo(() => trayRows ?? [], [trayRows]);
  const load = dayLoad(rows);

  // `full` — the over-committed day, and the state the product exists for. The day can
  // go over without anyone passing a gate: a record edited longer, one moved in from
  // the tray, a limit lowered by a short night. Being told only at the moment of adding
  // would mean the app's one claim held only while it was being watched.
  const over = full(rows, limit);
  const past = new Set(over.past.map((r) => r.id));

  // The two concrete offers. Move keeps the whole commitment, so it goes first; the
  // tray gives up the day but not the record, which is the plainer of the two ways of
  // not doing something today.
  const move = bestMove(
    rows
      .filter((r) => !r.isFixed && r.state === 'open')
      .map((r) => ({ id: r.id, title: r.title, lengthMinutes: r.lengthMinutes })),
    upcoming,
    over.overBy,
  );
  const spill = over.past.find((r) => r.id !== move?.record.id) ?? over.past[0];

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

  // Anything the day does in place — accepting one of the advisory card's offers — is
  // reversible on the same terms as adding: one tap, six seconds, no confirmation.
  const [taken, setTaken] = useState<Taken | null>(null);

  useEffect(() => {
    if (!taken) return;
    const timer = setTimeout(() => setTaken(null), 6000);
    return () => clearTimeout(timer);
  }, [taken]);

  const accept = async (label: string, act: () => Promise<void>, undoIt: () => Promise<void>) => {
    await act();
    setTaken({
      label,
      undo: async () => {
        await undoIt();
        setTaken(null);
      },
    });
  };

  const acceptMove = async () => {
    if (!move) return;
    let from: number | null = null;
    await accept(
      `“${move.record.title}” moved to ${move.day.label}`,
      async () => {
        from = await moveRecord(move.record.id, move.day.date);
      },
      () => setStartAt(move.record.id, from),
    );
  };

  const acceptTray = async () => {
    if (!spill) return;
    await accept(
      `“${spill.title}” moved to the tray`,
      () => moveToTray(spill.id),
      // Back on the day it never left. `state: 'tray'` was the only thing that changed.
      () => setDone(spill.id, false),
    );
  };

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
            {weekdayName(shown)}
          </Text>
          <Text style={[theme.type.screenTitle, styles.date, { color: theme.colors.ink }]}>
            {dayTitle(shown)}
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

      {/* The advisory card. It states the fact, names what could be done, and moves
          nothing: both offers are one tap, and the tap is the user's. */}
      {over.isOver && (
        <View
          style={[
            styles.advisory,
            {
              backgroundColor: theme.colors.overSoft,
              borderColor: theme.colors.over,
              borderRadius: theme.geometry.card.radius,
            },
          ]}
        >
          <Text
            style={[
              theme.type.body,
              styles.advisoryTitle,
              { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.over },
            ]}
          >
            The day is full. Something here will not happen.
          </Text>
          <Text style={[theme.type.bodySmall, styles.advisoryLead, { color: theme.colors.ink2 }]}>
            {move
              ? `${move.detail}. Nothing moves unless you tap.`
              : 'Nothing moves unless you tap.'}
          </Text>

          <View style={styles.offers}>
            {move && (
              <Offer
                label={`${move.record.title} · ${formatMinutes(move.record.lengthMinutes)}`}
                chip={`Move to ${weekdayShort(new Date(move.day.date))}`}
                selected
                onPress={() => void acceptMove()}
              />
            )}
            {spill && (
              <Offer
                label={`${spill.title} · ${formatMinutes(spill.lengthMinutes)}`}
                chip="To tray"
                onPress={() => void acceptTray()}
              />
            )}
          </View>
        </View>
      )}

      {/* Nothing disappears, and the count is the point — a record that has slipped is
          visible from the day it slipped off, not buried in a menu. */}
      {isToday && tray.length > 0 && (
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
                      past={past.has(record.id)}
                    />
                  ))}
                </View>
              </View>
            ))}
        {/* The close is triggered by the evening notification in the finished product.
            Until notifications exist it needs a door, and the foot of the day is where
            someone already is when the day is over. It belongs to today only: there is
            no evening to close on a Thursday that has not happened. */}
        {isToday ? (
          <Pressable onPress={() => router.push('/close')} style={styles.closeRow}>
            <Text style={[theme.type.bodySmall, { color: theme.colors.acc }]}>Close the day</Text>
          </Pressable>
        ) : (
          // The way back, and the only one that does not depend on which tab is
          // remembering which parameter.
          <Pressable
            onPress={() => router.replace('/')}
            style={styles.closeRow}
            accessibilityRole="button"
          >
            <Text style={[theme.type.bodySmall, { color: theme.colors.acc }]}>Back to today</Text>
          </Pressable>
        )}
      </ScrollView>

      {(taken || showUndo) && (
        <Pressable
          onPress={() => void (taken ? taken.undo() : undo())}
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
            {taken ? taken.label : undoLabel}
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

  /** One of the advisory card's two offers: what it would do, and the tap that does it. */
  function Offer({
    label,
    chip,
    selected = false,
    onPress,
  }: {
    label: string;
    chip: string;
    selected?: boolean;
    onPress: () => void;
  }) {
    return (
      <View
        style={[
          styles.offer,
          { backgroundColor: theme.colors.card, borderRadius: theme.geometry.input.radius },
        ]}
      >
        <Text
          style={[
            theme.type.bodySmall,
            styles.offerLabel,
            { fontFamily: theme.fonts.uiMedium, color: theme.colors.ink },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Chip label={chip} compact selected={selected} onPress={onPress} />
      </View>
    );
  }

  function Row({
    record,
    first,
    highlighted,
    past: isPast,
  }: {
    record: PlannerRecord;
    first: boolean;
    highlighted: boolean;
    past: boolean;
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
          // A row past the limit says so instead of saying when it is. The time is the
          // less useful of the two facts once the day cannot hold it.
          meta={isPast ? `${formatMinutes(record.lengthMinutes)} · past the limit` : undefined}
          trailing={isPast ? undefined : trailing}
          first={first || highlighted}
          past={isPast}
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
  advisory: { marginTop: 18, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 17 },
  advisoryTitle: { fontSize: 14, lineHeight: 19.6 },
  advisoryLead: { marginTop: 6 },
  offers: { marginTop: 14, gap: 8 },
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  offerLabel: { flex: 1, fontSize: 12.5 },
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
