import {
  capacity,
  dayLoad,
  formatMinutes,
  isSameDay,
  isWeekend,
  isoWeek,
  mondayIndex,
  startOfDay,
} from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SegmentedSwitch, type CalendarScale } from '@/components/SegmentedSwitch';
import { limitFor, useLimitsByDate } from '@/db/dayLimits';
import { useRangeRecords, weekBounds, type PlannerRecord } from '@/db/records';
import { WEEKDAY_INITIALS, weekRangeLabel } from '@/lib/day';
import { useTheme } from '@/theme';
import { useTabScreenInsets } from '@/lib/insets';

/**
 * `week` — seven columns at real block heights, with the now-line across them.
 *
 * The same records as the day view, at a different scale. The footer reports a weekly
 * total but never draws it as a capacity bar: hours are a daily budget and there is no
 * weekly hour limit, so a bar with an over state there would invent a fourth budget the
 * product does not have. "21h 40m committed · 1 day over" is a derived fact, and it
 * reads as one.
 */

/** 74px per two hours, from the prototype's hour gutter. */
const HOUR_HEIGHT = 37;
const GUTTER = 22;
const DEFAULT_WINDOW = { from: 8, to: 19 };

export function WeekView({ onScale }: { onScale: (scale: CalendarScale) => void }) {
  const theme = useTheme();
  const insets = useTabScreenInsets();
  const router = useRouter();

  const today = useMemo(() => new Date(), []);

  /** Open a day at the day scale. Any day — not always this one. */
  const openDay = (date: Date) =>
    router.replace({ pathname: '/', params: { date: String(startOfDay(date).getTime()) } });

  const { start, end } = weekBounds(today);
  const { data: records } = useRangeRecords(start, end);
  const limits = useLimitsByDate();

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        return date;
      }),
    [start],
  );

  const rows = useMemo(() => records ?? [], [records]);

  // The window stretches to cover anything outside the default rather than hiding it —
  // a record you cannot see is worse than a longer grid.
  const window = useMemo(() => {
    let from = DEFAULT_WINDOW.from;
    let to = DEFAULT_WINDOW.to;
    for (const r of rows) {
      if (r.startAt === null) continue;
      const s = new Date(r.startAt);
      const e = new Date(r.startAt + r.lengthMinutes * 60_000);
      from = Math.min(from, s.getHours());
      to = Math.max(to, e.getHours() + (e.getMinutes() > 0 ? 1 : 0));
    }
    return { from, to: Math.max(to, from + 2) };
  }, [rows]);

  const gridHeight = (window.to - window.from) * HOUR_HEIGHT;
  const offsetOf = (d: Date) =>
    (d.getHours() - window.from) * HOUR_HEIGHT + (d.getMinutes() / 60) * HOUR_HEIGHT;

  const perDay = days.map((date) => {
    const dayRows = rows.filter((r) => r.startAt !== null && isSameDay(new Date(r.startAt), date));
    const load = dayLoad(dayRows);
    const c = capacity({ ...load, limit: limitFor(limits, date) });
    return { date, rows: dayRows, load, capacity: c };
  });

  const weekMinutes = perDay.reduce((sum, d) => sum + d.capacity.planned, 0);
  const daysOver = perDay.filter((d) => d.capacity.isOver).length;
  const tallest = Math.max(1, ...perDay.map((d) => d.capacity.planned));

  const nowOffset = offsetOf(today);
  const nowVisible = nowOffset >= 0 && nowOffset <= gridHeight;

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <Text style={[theme.type.sheetTitle, { fontSize: 30, color: theme.colors.ink }]}>
          Week {isoWeek(today)}
        </Text>
        <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
          {weekRangeLabel(days[0]!, days[6]!)}
        </Text>
      </View>

      <View style={styles.switch}>
        <SegmentedSwitch active="week" onScale={onScale} />
      </View>

      <View style={styles.dayHeads}>
        <View style={styles.gutter} />
        {perDay.map(({ date }) => {
          const isToday = isSameDay(date, today);
          return (
            <Pressable
              key={date.toISOString()}
              onPress={() => openDay(date)}
              style={[
                styles.dayHead,
                isToday && { backgroundColor: theme.colors.accSoft, borderRadius: 7 },
              ]}
            >
              <Text
                style={[
                  theme.type.meta,
                  styles.initial,
                  { color: isToday ? theme.colors.acc : theme.colors.ink3 },
                ]}
              >
                {WEEKDAY_INITIALS[mondayIndex(date)]}
              </Text>
              <Text
                style={[
                  theme.type.chip,
                  styles.dayNumber,
                  {
                    fontFamily: theme.fonts.uiSemiBold,
                    color: isToday
                      ? theme.colors.acc
                      : isWeekend(date)
                        ? theme.colors.ink3
                        : theme.colors.ink,
                  },
                ]}
              >
                {date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={[styles.grid, { borderTopColor: theme.colors.line2 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.gridInner, { height: gridHeight }]}>
          <View style={styles.gutter}>
            {Array.from({ length: Math.ceil((window.to - window.from) / 2) }, (_, i) => (
              <Text
                key={i}
                style={[
                  theme.type.meta,
                  styles.hourLabel,
                  { top: i * 2 * HOUR_HEIGHT - 6, color: theme.colors.ink3 },
                ]}
              >
                {String(window.from + i * 2).padStart(2, '0')}
              </Text>
            ))}
          </View>

          {perDay.map(({ date, rows: dayRows }) => (
            <View
              key={date.toISOString()}
              style={[
                styles.column,
                isWeekend(date) && { backgroundColor: theme.colors.line2, borderRadius: 6 },
              ]}
            >
              {dayRows.map((record) => (
                <Block key={record.id} record={record} />
              ))}
            </View>
          ))}

          {nowVisible && (
            <View style={[styles.now, { top: nowOffset, backgroundColor: theme.colors.now }]}>
              <View style={[styles.nowPin, { backgroundColor: theme.colors.now }]} />
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: theme.colors.line, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View>
          <Text style={[theme.type.sectionLabel, { color: theme.colors.ink3 }]}>
            Committed this week
          </Text>
          <Text
            style={[styles.total, { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.ink }]}
          >
            {formatMinutes(weekMinutes)}
            {daysOver > 0 && (
              <Text style={{ fontFamily: theme.fonts.ui, color: theme.colors.ink3 }}>
                {` · ${daysOver} day${daysOver === 1 ? '' : 's'} over`}
              </Text>
            )}
          </Text>
        </View>

        {/* Seven bars, not a capacity bar. There is no weekly hour limit to be over. */}
        <View style={styles.spark}>
          {perDay.map(({ date, capacity: c }) => (
            <View
              key={date.toISOString()}
              style={[
                styles.sparkBar,
                {
                  height: c.planned === 0 ? 4 : Math.max(4, (c.planned / tallest) * 16),
                  backgroundColor: c.isOver
                    ? theme.colors.over
                    : c.planned === 0
                      ? theme.colors.line
                      : theme.colors.accFill,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );

  function Block({ record }: { record: PlannerRecord }) {
    if (record.startAt === null) return null;
    const start = new Date(record.startAt);
    const height = Math.max(14, (record.lengthMinutes / 60) * HOUR_HEIGHT);

    return (
      <Pressable
        onPress={() => openDay(start)}
        style={[
          styles.block,
          {
            top: offsetOf(start),
            height,
            backgroundColor: record.isFixed ? theme.colors.taupeSoft : theme.colors.accSoft,
            borderLeftColor: record.isFixed ? theme.colors.taupe : theme.colors.acc,
          },
        ]}
      >
        <Text
          style={[
            styles.blockTitle,
            {
              fontFamily: theme.fonts.uiSemiBold,
              color: record.isFixed ? theme.colors.taupe : theme.colors.acc,
            },
          ]}
          numberOfLines={2}
        >
          {record.title}
        </Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  switch: { marginTop: 16, marginHorizontal: 20 },
  dayHeads: { marginTop: 18, paddingHorizontal: 14, flexDirection: 'row', gap: 3 },
  gutter: { width: GUTTER },
  dayHead: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  initial: { fontSize: 9 },
  dayNumber: { marginTop: 2 },
  grid: { flex: 1, marginTop: 12, paddingHorizontal: 14, borderTopWidth: 1 },
  gridInner: { flexDirection: 'row', gap: 3, paddingTop: 4 },
  hourLabel: { position: 'absolute', fontSize: 9 },
  column: { flex: 1 },
  block: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 6,
    borderLeftWidth: 2,
    paddingVertical: 4,
    paddingHorizontal: 3,
    overflow: 'hidden',
  },
  blockTitle: { fontSize: 8.5, lineHeight: 10.2 },
  now: { position: 'absolute', left: 0, right: 0, height: 1.5 },
  nowPin: {
    position: 'absolute',
    left: GUTTER - 2,
    top: -3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  footer: {
    flexGrow: 0,
    flexShrink: 0,
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  total: { marginTop: 5, fontSize: 15 },
  spark: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 16 },
  sparkBar: { width: 6, borderRadius: 2 },
});
