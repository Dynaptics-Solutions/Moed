import { formatMinutes } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProjects } from '@/db/projects';
import { useRecord } from '@/db/records';
import { elapsedSeconds, isRunning, startTimer, stopTimer } from '@/db/timer';
import { useTheme } from '@/theme';

/**
 * `timer` — a session running, full-bleed in `accFill`.
 *
 * The one screen that inverts the palette: the field is the accent and everything on it
 * is `onAcc`. That is the point of it. A session under way is the only thing the app
 * asks you to look at rather than decide about, so it takes the whole screen and stops
 * looking like the rest of the app.
 *
 * The clock is read from the record, not counted here — see `db/timer`. This ticks once
 * a second only to re-read it, so leaving the screen, or the app, does not stop time.
 *
 * Pause and Done write the same thing. Neither marks the session finished: a session
 * cannot be finished, only fed, which is why it has no Done on its detail sheet either.
 * Done means this sitting is over.
 */
export default function Timer() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const record = useRecord(id);
  const { data: projects } = useProjects();
  const [now, setNow] = useState(() => Date.now());

  const running = record !== undefined && isRunning(record);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [running]);

  useEffect(() => {
    if (id === undefined) router.replace('/');
  }, [id, router]);

  if (!record) return null;

  const project = (projects ?? []).find((p) => p.id === record.projectId);
  const elapsed = elapsedSeconds(record, now);
  const givenSeconds = record.lengthMinutes * 60;

  // Capped at full, and never recoloured. A session running past what it was given has
  // not put the day over — the day counted the length it was promised — so `over` would
  // be the wrong word for it. The caption below says both numbers instead, which is the
  // honest way to report an overrun.
  const fraction = givenSeconds > 0 ? Math.min(1, elapsed / givenSeconds) : 0;

  const close = () => router.replace('/');
  const stop = async () => {
    await stopTimer(record.id);
  };

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.colors.accFill, paddingTop: insets.top + 20 },
      ]}
    >
      <View style={styles.bar}>
        <Pressable onPress={close} hitSlop={12}>
          <Text style={[theme.type.bodySmall, styles.dim, { color: theme.colors.onAcc }]}>
            Close
          </Text>
        </Pressable>
        <Text style={[theme.type.sectionLabel, styles.dim, { color: theme.colors.onAcc }]}>
          {running ? 'Running' : 'Paused'}
        </Text>
        <View style={styles.barSpacer} />
      </View>

      <View style={styles.centre}>
        {project !== undefined && (
          <Text style={[theme.type.sectionLabel, styles.dim, { color: theme.colors.onAcc }]}>
            {project.name}
          </Text>
        )}

        <Text style={[theme.type.sheetTitle, styles.title, { color: theme.colors.onAcc }]}>
          {record.title}
        </Text>

        <Text style={[theme.type.bigNumber, styles.clock, { color: theme.colors.onAcc }]}>
          {clock(elapsed)}
        </Text>

        <View style={styles.track}>
          <View
            style={[
              styles.trackFill,
              { width: `${fraction * 100}%`, backgroundColor: theme.colors.onAcc },
            ]}
          />
        </View>

        <Text style={[theme.type.bodySmall, styles.dim, { color: theme.colors.onAcc }]}>
          {formatMinutes(Math.round(elapsed / 60))} of {formatMinutes(record.lengthMinutes)} given
        </Text>
      </View>

      {/* Not the shared Button: on a full-bleed accent field the whole palette inverts —
          the primary fill is `onAcc` and its label is `accFill` — which is the one thing
          that component is not parameterised for. Duplicating the two shapes here is
          smaller than teaching every other button about a field it will never sit on. */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 22 }]}>
        <Pressable
          onPress={() => void (running ? stop() : startTimer(record.id))}
          accessibilityRole="button"
          style={[
            styles.action,
            styles.secondary,
            { height: theme.geometry.button.height, borderRadius: theme.geometry.button.radius },
          ]}
        >
          <Text style={[theme.type.button, { color: theme.colors.onAcc }]}>
            {running ? 'Pause' : 'Start'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => void stop().then(close)}
          accessibilityRole="button"
          style={[
            styles.action,
            {
              height: theme.geometry.button.height,
              borderRadius: theme.geometry.button.radius,
              backgroundColor: theme.colors.onAcc,
            },
          ]}
        >
          <Text style={[theme.type.button, { color: theme.colors.accFill }]}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** 58:12 under an hour, 1:02:14 over it. Seconds always, because a timer is watched. */
function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barSpacer: { width: 40 },
  /** The prototype's .65–.7 on everything that is not the count itself. */
  dim: { opacity: 0.7 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  title: { textAlign: 'center', maxWidth: 230 },
  clock: { fontSize: 62, lineHeight: 62, marginTop: 10 },
  track: {
    width: 190,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.24)',
    overflow: 'hidden',
  },
  trackFill: { height: '100%' },
  actions: { flexDirection: 'row', gap: 9 },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  secondary: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
});
