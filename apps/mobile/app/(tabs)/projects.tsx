import { canCreate, capNotice, formatMinutes, projectStats, weekBounds } from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { usePlan } from '@/db/plan';
import { useProjectRecords, useProjects } from '@/db/projects';
import { useTheme } from '@/theme';
import { useTabScreenInsets } from '@/lib/insets';

/**
 * `projects` — three on the free plan.
 *
 * The cap is a creation limit, so a lapsed subscriber holding nine keeps nine. The card
 * at the foot states the cap and offers the way through; it never scolds, and it is not
 * drawn in `over`, because a plan boundary is not a limit you have exceeded.
 */
export default function Projects() {
  const theme = useTheme();
  const insets = useTabScreenInsets();
  const router = useRouter();

  const plan = usePlan();
  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => weekBounds(today), [today]);

  const { data: projectRows } = useProjects();
  const { data: recordRows } = useProjectRecords();

  const list = useMemo(() => projectRows ?? [], [projectRows]);
  const records = useMemo(() => recordRows ?? [], [recordRows]);

  const notice = canCreate(plan, 'projects', list.length) ? null : capNotice('projects', plan);

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
            {list.length === 0 ? 'None yet' : `${list.length === 1 ? 'One' : list.length} active`}
          </Text>
          <Text style={[theme.type.screenTitle, styles.title, { color: theme.colors.ink }]}>
            Projects
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="button"
          accessibilityLabel="Search"
          style={[
            styles.searchButton,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.line },
          ]}
        >
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Circle cx={7} cy={7} r={5} stroke={theme.colors.ink2} strokeWidth={1.5} />
            <Path
              d="M10.8 10.8 14 14"
              stroke={theme.colors.ink2}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {list.map((project) => {
          const stats = projectStats(
            records.filter((r) => r.projectId === project.id),
            week,
          );
          const colour = project.colour ?? theme.colors.acc;

          return (
            <Pressable
              key={project.id}
              onPress={() => router.push({ pathname: '/project', params: { id: project.id } })}
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
              <View style={styles.cardHead}>
                <View style={[styles.dot, { backgroundColor: colour }]} />
                <Text style={[theme.type.sheetTitle, styles.name, { color: theme.colors.ink }]}>
                  {project.name}
                </Text>
                <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
                  {stats.open} open
                </Text>
              </View>

              <View style={[styles.track, { backgroundColor: theme.colors.line }]}>
                <View
                  style={[
                    styles.fill,
                    { width: `${stats.progress * 100}%`, backgroundColor: colour },
                  ]}
                />
              </View>

              <View style={styles.cardFoot}>
                <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
                  {stats.done} done
                </Text>
                <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
                  {stats.leftMinutes > 0
                    ? `${formatMinutes(stats.leftMinutes)} left`
                    : 'Nothing left'}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {list.length === 0 && (
          <Text style={[theme.type.body, { color: theme.colors.ink3 }]}>
            No projects yet. A project is somewhere to group records that share an end.
          </Text>
        )}

        {notice === null && (
          <Pressable
            onPress={() => router.push('/newproject')}
            style={[
              styles.capCard,
              { borderColor: theme.colors.line, borderRadius: theme.geometry.card.radius },
            ]}
          >
            <Text
              style={[
                theme.type.bodySmall,
                { fontFamily: theme.fonts.uiMedium, color: theme.colors.acc },
              ]}
            >
              New project
            </Text>
            <Text style={[theme.type.meta, styles.capSub, { color: theme.colors.ink3 }]}>
              Three on the free plan
            </Text>
          </Pressable>
        )}

        {notice !== null && (
          <View
            style={[
              styles.capCard,
              { borderColor: theme.colors.line, borderRadius: theme.geometry.card.radius },
            ]}
          >
            <Text
              style={[
                theme.type.bodySmall,
                { fontFamily: theme.fonts.uiMedium, color: theme.colors.ink2 },
              ]}
            >
              {notice}
            </Text>
            <Text style={[theme.type.meta, styles.capSub, { color: theme.colors.ink3 }]}>
              Unlimited is part of the subscription ›
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { marginTop: 7, fontSize: 32 },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    flexGrow: 0,
    flexShrink: 0,
  },
  list: { flex: 1, marginTop: 22 },
  listContent: { gap: 11, paddingBottom: 20 },
  card: { borderWidth: 1, paddingVertical: 16, paddingHorizontal: 17 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, flexGrow: 0, flexShrink: 0 },
  name: { flex: 1, fontSize: 21 },
  track: { marginTop: 13, height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  cardFoot: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  capCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 18,
    alignItems: 'center',
  },
  capSub: { marginTop: 5 },
});
