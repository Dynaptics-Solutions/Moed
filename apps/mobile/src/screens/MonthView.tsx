import { capacity, dayLoad, formatMinutes, isSameDay, startOfDay } from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CapacityBar } from '@/components/CapacityBar';
import { RecordRow } from '@/components/RecordRow';
import { SegmentedSwitch, type CalendarScale } from '@/components/SegmentedSwitch';
import { limitFor, useLimitsByDate } from '@/db/dayLimits';
import { monthGridBounds, setDone, useRangeRecords } from '@/db/records';
import { WEEKDAY_INITIALS, clockTime, monthName, weekdayShort } from '@/lib/day';
import { useTheme } from '@/theme';
import { useTabScreenInsets } from '@/lib/insets';

/**
 * `month` — no text in the cells. One load bar per day, `over` where the day is over.
 *
 * Thirty-one days of titles is a wall nobody reads. The bar answers the only question
 * this scale can honestly answer — how full was that day — and tapping a cell peeks the
 * day at the bottom for the rest.
 */
export function MonthView({ onScale }: { onScale: (scale: CalendarScale) => void }) {
  const theme = useTheme();
  const insets = useTabScreenInsets();
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const { start, end, firstOfMonth } = monthGridBounds(today);
  const { data: records } = useRangeRecords(start, end);
  const limits = useLimitsByDate();

  const [peeked, setPeeked] = useState<number>(() => startOfDay(today).getTime());

  const rows = useMemo(() => records ?? [], [records]);

  const cells = useMemo(() => {
    const count = Math.round((end - start) / 86_400_000);
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dayRows = rows.filter(
        (r) => r.startAt !== null && isSameDay(new Date(r.startAt), date),
      );
      const c = capacity({ ...dayLoad(dayRows), limit: limitFor(limits, date) });
      return {
        date,
        rows: dayRows,
        capacity: c,
        inMonth: date.getMonth() === firstOfMonth.getMonth(),
      };
    });
  }, [start, end, rows, limits, firstOfMonth]);

  const peekedCell = cells.find((c) => isSameDay(c.date, new Date(peeked)));
  const openCount = peekedCell?.rows.filter((r) => r.state === 'open').length ?? 0;

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <Text style={[theme.type.sheetTitle, { fontSize: 30, color: theme.colors.ink }]}>
          {monthName(firstOfMonth)}
        </Text>
        <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
          {firstOfMonth.getFullYear()}
        </Text>
      </View>

      <View style={styles.switch}>
        <SegmentedSwitch active="month" onScale={onScale} />
      </View>

      <View style={styles.weekdays}>
        {WEEKDAY_INITIALS.map((initial, i) => (
          <Text key={i} style={[theme.type.meta, styles.weekday, { color: theme.colors.ink3 }]}>
            {initial}
          </Text>
        ))}
      </View>

      {/* Laid out as rows of seven rather than a wrapping grid: percentage widths do
          not account for the gaps between cells, and the drift shows by the fifth
          column. */}
      <View style={styles.grid}>
        {weeksOf(cells).map((week, w) => (
          <View key={w} style={styles.gridRow}>
            {week.map((cell) => {
              const selected = isSameDay(cell.date, new Date(peeked));
              const isToday = isSameDay(cell.date, today);
              const fill = cell.capacity.isOver
                ? 1
                : Math.min(1, cell.capacity.planned / Math.max(1, cell.capacity.denominator));

              return (
                <Pressable
                  key={cell.date.toISOString()}
                  onPress={() => setPeeked(startOfDay(cell.date).getTime())}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: selected ? theme.colors.accSoft : theme.colors.card,
                      borderColor: isToday ? theme.colors.acc : theme.colors.line,
                      opacity: cell.inMonth ? 1 : 0.45,
                    },
                  ]}
                >
                  <Text
                    style={[
                      theme.type.chip,
                      { fontFamily: theme.fonts.uiMedium, fontSize: 10, color: theme.colors.ink },
                    ]}
                  >
                    {cell.date.getDate()}
                  </Text>
                  <View style={[styles.loadTrack, { backgroundColor: theme.colors.line2 }]}>
                    <View
                      style={[
                        styles.loadFill,
                        {
                          width: `${fill * 100}%`,
                          backgroundColor: cell.capacity.isOver
                            ? theme.colors.over
                            : theme.colors.accFill,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <Legend colour={theme.colors.accFill} label="load" />
        <Legend colour={theme.colors.over} label="over the limit" />
      </View>

      <View style={styles.spacer} />

      {peekedCell && (
        <Pressable
          // The peek answers "how full was that day"; tapping it opens that day, not
          // this one. Opening today from a cell in the middle of last month was the
          // month view's only way out and it went to the wrong place.
          onPress={() =>
            router.replace({
              pathname: '/',
              params: { date: String(startOfDay(peekedCell.date).getTime()) },
            })
          }
          style={[
            styles.peek,
            theme.shadow,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.line,
              borderRadius: theme.geometry.card.radius,
              marginBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.peekHead}>
            <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
              {weekdayShort(peekedCell.date)} {peekedCell.date.getDate()} ·{' '}
              {formatMinutes(peekedCell.capacity.planned)}
            </Text>
            <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>{openCount} left</Text>
          </View>

          <View style={styles.peekBar}>
            <CapacityBar
              committed={dayLoad(peekedCell.rows).committed}
              fixed={dayLoad(peekedCell.rows).fixed}
              limit={limitFor(limits, peekedCell.date)}
              caption={false}
              height={8}
            />
          </View>

          <ScrollView style={styles.peekList} showsVerticalScrollIndicator={false}>
            {peekedCell.rows.length === 0 ? (
              <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>Nothing planned.</Text>
            ) : (
              peekedCell.rows.map((record, i) => (
                <RecordRow
                  key={record.id}
                  title={
                    record.startAt !== null
                      ? `${record.title} · ${clockTime(new Date(record.startAt))}`
                      : record.title
                  }
                  done={record.state === 'done'}
                  first={i === 0}
                  onToggle={() => void setDone(record.id, record.state !== 'done')}
                />
              ))
            )}
          </ScrollView>
        </Pressable>
      )}
    </View>
  );

  function Legend({ colour, label }: { colour: string; label: string }) {
    return (
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: colour }]} />
        <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>{label}</Text>
      </View>
    );
  }
}

function weeksOf<T>(cells: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
  return out;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  switch: { marginTop: 16 },
  weekdays: { marginTop: 20, flexDirection: 'row', gap: 5 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 9 },
  grid: { marginTop: 8, gap: 5 },
  gridRow: { flexDirection: 'row', gap: 5 },
  cell: {
    flex: 1,
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  loadTrack: { marginTop: 5, height: 3, borderRadius: 2, overflow: 'hidden' },
  loadFill: { height: 3, borderRadius: 2 },
  legend: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 3, borderRadius: 2 },
  spacer: { flex: 1 },
  peek: { borderWidth: 1, paddingVertical: 15, paddingHorizontal: 16, maxHeight: 190 },
  peekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  peekBar: { marginTop: 10 },
  peekList: { marginTop: 4 },
});
