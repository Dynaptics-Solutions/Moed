import { capNotice, formatMinutes } from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Chip } from '@/components/Chip';
import { RecordRow } from '@/components/RecordRow';
import { usePlan } from '@/db/plan';
import { setDone } from '@/db/records';
import { useSearch } from '@/db/search';
import { clockTime } from '@/lib/day';
import { useTheme } from '@/theme';

/**
 * `search` — the last thirty days on the free plan.
 *
 * The card at the foot says which window is being searched rather than letting someone
 * conclude their older records are gone. They are not gone: they are on the days they
 * live on, exportable, and outside what search returns. That distinction is the whole
 * difference between a cap and a hostage.
 */

const FILTERS = ['All', 'Tasks', 'Projects', 'Done'] as const;
type Filter = (typeof FILTERS)[number];

export default function Search() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const plan = usePlan();
  const today = useMemo(() => new Date(), []);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const results = useSearch(query, plan, today);

  const records = results.records.filter((r) => {
    if (filter === 'Done') return r.state === 'done';
    if (filter === 'Tasks') return r.state !== 'done';
    if (filter === 'Projects') return false;
    return true;
  });
  const projects = filter === 'Tasks' || filter === 'Done' ? [] : results.projects;
  const total = records.length + projects.length;

  const notice = results.windowed ? capNotice('historyDays', plan) : null;

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 18 }]}
    >
      <View style={styles.bar}>
        <View
          style={[
            styles.field,
            {
              minHeight: theme.geometry.input.minHeight,
              borderRadius: theme.geometry.input.radius,
              backgroundColor: theme.colors.card,
              borderColor: query === '' ? theme.colors.line : theme.colors.acc,
            },
          ]}
        >
          <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
            <Circle
              cx={7}
              cy={7}
              r={5}
              stroke={query === '' ? theme.colors.ink3 : theme.colors.acc}
              strokeWidth={1.5}
            />
            <Path
              d="M10.8 10.8 14 14"
              stroke={query === '' ? theme.colors.ink3 : theme.colors.acc}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </Svg>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={theme.colors.ink3}
            selectionColor={theme.colors.acc}
            autoFocus
            autoCorrect={false}
            style={[theme.type.body, styles.input, { color: theme.colors.ink }]}
          />
        </View>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
        ))}
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {query.trim() !== '' && (
          <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
            {total === 0 ? 'Nothing found' : `${total} result${total === 1 ? '' : 's'}`}
          </Text>
        )}

        <View style={styles.results}>
          {records.map((record, i) => (
            <RecordRow
              key={record.id}
              title={record.title}
              done={record.state === 'done'}
              meta={record.slipCount > 0 ? `slipped ${record.slipCount} times` : undefined}
              trailing={
                record.startAt !== null
                  ? clockTime(new Date(record.startAt))
                  : formatMinutes(record.lengthMinutes)
              }
              first={i === 0}
              onPress={() => router.push({ pathname: '/detail', params: { id: record.id } })}
              onToggle={() => void setDone(record.id, record.state !== 'done')}
            />
          ))}

          {projects.map((project, i) => (
            <RecordRow
              key={project.id}
              title={project.name}
              meta="Project"
              trailing="›"
              first={records.length === 0 && i === 0}
              projectColour={project.colour ?? theme.colors.acc}
              onPress={() => router.replace({ pathname: '/project', params: { id: project.id } })}
            />
          ))}
        </View>

        {notice !== null && (
          <View
            style={[
              styles.notice,
              {
                backgroundColor: theme.colors.taupeSoft,
                borderColor: theme.colors.taupe,
                borderRadius: theme.geometry.card.radius,
              },
            ]}
          >
            <View style={styles.noticeText}>
              <Text
                style={[
                  theme.type.bodySmall,
                  { fontFamily: theme.fonts.uiMedium, fontSize: 12.5, color: theme.colors.ink },
                ]}
              >
                {notice}
              </Text>
              <Text style={[theme.type.meta, styles.noticeSub, { color: theme.colors.ink3 }]}>
                Older records are still on their days and still export. Full history is part of the
                subscription.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  bar: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  field: {
    flex: 1,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
  },
  input: { flex: 1, padding: 0 },
  filters: { marginTop: 14, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  list: { flex: 1, marginTop: 20 },
  results: { marginTop: 6 },
  notice: {
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  noticeText: { flex: 1 },
  noticeSub: { marginTop: 3 },
});
