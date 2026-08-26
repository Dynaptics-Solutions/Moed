import { formatMinutes } from '@moed/core';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAffordance } from '@/components/AddAffordance';
import { CapacityBar } from '@/components/CapacityBar';
import { RecordRow, type RecordRowProps } from '@/components/RecordRow';
import { PARTS, clockTime, dayPart, dayTitle, weekdayName } from '@/lib/day';
import { useTheme } from '@/theme';

/**
 * `day` — home, and the screen every other list in the planner copies.
 *
 * Static data, deliberately: the build plan puts the day view before capture so the
 * type, the spacing and the grouping can be got right without a form or a database in
 * the way. Records arrive from SQLite when capture lands.
 */

const at = (hour: number, minute = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
};

type PlannedRecord = RecordRowProps & { at?: Date };

const TODAY = new Date();

/** 5h 20m of chosen load, 2h 30m of fixed, against a 9h 30m day. */
const COMMITTED_MINUTES = 320;
const FIXED_MINUTES = 150;
const LIMIT_MINUTES = 570;

const RECORDS: PlannedRecord[] = [
  { title: 'Standup — Operon', done: true, at: at(9, 30) },
  {
    title: 'Rewrite the onboarding copy',
    meta: 'Operon · 2h block',
    at: at(10, 0),
  },
  { title: 'Reply to Marta re: contract', overdue: true, at: at(11, 0) },
  { title: 'Dentist', meta: 'Kensington · leave 13:35', at: at(14, 0) },
  {
    title: 'Draft Q4 roadmap',
    meta: 'Operon · due Friday',
    trailing: '1h',
    at: at(15, 30),
  },
];

export default function Day() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const grouped = PARTS.map((part) => ({
    part,
    records: RECORDS.filter((r) => r.at && dayPart(r.at) === part),
  })).filter((g) => g.records.length > 0);

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
            {weekdayName(TODAY)}
          </Text>
          <Text style={[theme.type.screenTitle, styles.date, { color: theme.colors.ink }]}>
            {dayTitle(TODAY)}
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
          committed={COMMITTED_MINUTES}
          fixed={FIXED_MINUTES}
          limit={LIMIT_MINUTES}
          composition={`${formatMinutes(COMMITTED_MINUTES)} work · ${formatMinutes(FIXED_MINUTES)} fixed`}
        />
      </View>

      {/* Lists scroll, screens do not. */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {grouped.map((group, groupIndex) => (
          <View key={group.part} style={groupIndex > 0 && styles.groupGap}>
            <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
              {group.part}
            </Text>
            <View style={styles.group}>
              {group.records.map((record, i) => (
                <RecordRow
                  key={record.title}
                  {...record}
                  first={i === 0}
                  trailing={record.trailing ?? (record.at ? clockTime(record.at) : undefined)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <AddAffordance bottomInset={insets.bottom} />
    </View>
  );
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
});
