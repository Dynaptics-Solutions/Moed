import { formatMinutes, projectStats, weekBounds } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { RecordRow } from '@/components/RecordRow';
import { useProjectRecords, useProjects } from '@/db/projects';
import { setDone } from '@/db/records';
import { clockTime } from '@/lib/day';
import { useTheme } from '@/theme';

/**
 * `project` — one project, its numbers, and what is still open.
 *
 * Three figures and none of them predictive: minutes still owed, minutes scheduled this
 * week, and how many of its records have slipped. Every one is a sum of the user's own
 * records, which is what makes them worth printing.
 */
export default function Project() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => weekBounds(today), [today]);

  const { data: projectRows, updatedAt } = useProjects();
  const { data: recordRows } = useProjectRecords();

  const project = (projectRows ?? []).find((p) => p.id === id);
  const mine = useMemo(
    () => (recordRows ?? []).filter((r) => r.projectId === id),
    [recordRows, id],
  );
  const stats = projectStats(mine, week);
  const open = mine.filter((r) => r.state === 'open');

  // Reached by a stale link or a project archived since. The list is the honest place
  // to be rather than an empty screen with a title — but only once the query has
  // actually answered, and `data` cannot tell you that. Drizzle's useLiveQuery seeds
  // `data` to [] rather than undefined, so "no such project" and "has not read the
  // table yet" look identical through it. `updatedAt` is the difference: undefined
  // until the first result lands. Redirecting on the empty first frame made this screen
  // unreachable — it bounced straight back to the list every time.
  //
  // The redirect belongs in an effect too, because navigating during render sets state
  // on the navigator mid-render, which React rejects outright.
  const answered = updatedAt !== undefined;

  useEffect(() => {
    if (answered && !project) router.replace('/projects');
  }, [answered, project, router]);

  if (!project) return null;

  const colour = project.colour ?? theme.colors.acc;

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <Pressable onPress={() => router.replace('/projects')} hitSlop={12}>
        <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>‹ Projects</Text>
      </Pressable>

      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: colour }]} />
        <Text style={[theme.type.screenTitle, styles.name, { color: theme.colors.ink }]}>
          {project.name}
        </Text>
      </View>

      <Text style={[theme.type.bodySmall, styles.summary, { color: theme.colors.ink2 }]}>
        {stats.open} open, {stats.done} done
      </Text>

      <View style={[styles.track, { backgroundColor: theme.colors.line }]}>
        <View
          style={[styles.fill, { width: `${stats.progress * 100}%`, backgroundColor: colour }]}
        />
      </View>

      <View style={styles.stats}>
        <Stat label="Left" value={formatMinutes(stats.leftMinutes)} />
        <Stat label="This week" value={formatMinutes(stats.thisWeekMinutes)} />
        <Stat label="Slipped" value={String(stats.slipped)} />
      </View>

      <Text style={[theme.type.sectionLabel, styles.openLabel, { color: theme.colors.taupe }]}>
        Open
      </Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {open.length === 0 ? (
          <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>Nothing open.</Text>
        ) : (
          open.map((record, i) => (
            <RecordRow
              key={record.id}
              title={record.title}
              meta={record.slipCount > 0 ? `slipped ${record.slipCount} times` : undefined}
              trailing={
                record.startAt !== null
                  ? clockTime(new Date(record.startAt))
                  : formatMinutes(record.lengthMinutes)
              }
              first={i === 0}
              onPress={() => router.push({ pathname: '/detail', params: { id: record.id } })}
              onToggle={() => void setDone(record.id, true)}
            />
          ))
        )}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 18 }}>
        <Button label={`Add to ${project.name}`} onPress={() => router.push('/capture')} />
      </View>
    </View>
  );

  function Stat({ label, value }: { label: string; value: string }) {
    return (
      <View
        style={[
          styles.stat,
          theme.shadow,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.line,
            borderRadius: theme.geometry.card.radius,
          },
        ]}
      >
        <Text style={[theme.type.sectionLabel, { color: theme.colors.ink3 }]}>{label}</Text>
        <Text style={[theme.type.sheetTitle, styles.statValue, { color: theme.colors.ink }]}>
          {value}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  head: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 4.5, flexGrow: 0, flexShrink: 0 },
  name: { fontSize: 32 },
  summary: { marginTop: 8 },
  track: { marginTop: 18, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  stats: { marginTop: 18, flexDirection: 'row', gap: 9 },
  stat: { flex: 1, borderWidth: 1, padding: 13 },
  statValue: { marginTop: 4, fontSize: 22 },
  openLabel: { marginTop: 22 },
  list: { flex: 1, marginTop: 8 },
});
