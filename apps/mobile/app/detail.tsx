import { describeRecurrence, formatMinutes } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { useProjects } from '@/db/projects';
import { dropRecord, setDone, slipToNextDay, useRecord } from '@/db/records';
import { useRecurrence } from '@/db/recurrences';
import type { RecordKind } from '@/db/schema';
import { clockTime, weekdayName } from '@/lib/day';
import { recurrenceLabels } from '@/lib/recurrenceParams';
import { useTheme } from '@/theme';

/**
 * `detail` — read first.
 *
 * Tapping a record opens what it is, not a form. Most of the time the question is "what
 * did I mean by this" or "when is it", and answering that should not put every field
 * one keystroke from being changed.
 *
 * Three actions on the face — Done, Edit, and one more — with everything else behind
 * the overflow. A sheet with seven buttons has no primary action.
 */

const KIND_ROUTE: Record<RecordKind, string> = {
  task: 'task',
  routine: 'routine',
  session: 'session',
  errand: 'errand',
  appointment: 'appt',
};

const KIND_LABEL: Record<RecordKind, string> = {
  task: 'Task',
  routine: 'Routine',
  session: 'Session',
  errand: 'Errand',
  appointment: 'Appointment',
};

export default function Detail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const record = useRecord(id);
  const { data: projects } = useProjects();
  const recurrence = useRecurrence(record?.recurrenceId);
  const [showMore, setShowMore] = useState(false);

  // The query has not answered yet, or the record has gone. An empty sheet says
  // nothing; the day is where the answer is either way.
  //
  // Only a missing id is a dead link. A missing record while `id` is set is the live
  // query still loading, and sending that back to the day would close the sheet before
  // it opened. The redirect goes through an effect because navigating during render
  // sets state on the navigator mid-render, which React rejects.
  useEffect(() => {
    if (id === undefined) router.replace('/');
  }, [id, router]);

  if (!record) return null;

  const project = (projects ?? []).find((p) => p.id === record.projectId);
  const colour = project?.colour ?? theme.colors.acc;
  const start = record.startAt !== null ? new Date(record.startAt) : null;
  const end = start ? new Date(start.getTime() + record.lengthMinutes * 60_000) : null;
  const steps = record.steps ?? [];
  const stops = record.stops ?? [];

  const close = () => router.back();
  const after = async (action: () => Promise<void>) => {
    await action();
    close();
  };

  return (
    <Sheet>
      <View style={styles.kind}>
        <View style={[styles.dot, { backgroundColor: colour }]} />
        <Text style={[theme.type.sectionLabel, { color: theme.colors.acc }]}>
          {project ? `${project.name} · ` : ''}
          {KIND_LABEL[record.kind]}
        </Text>
      </View>

      <Text style={[theme.type.sheetTitle, { color: theme.colors.ink }]}>{record.title}</Text>

      <View>
        <Row
          label="When"
          value={
            start && end
              ? `${weekdayName(start)} · ${clockTime(start)} — ${clockTime(end)}`
              : 'Not scheduled'
          }
          first
        />
        {record.lengthMinutes > 0 && (
          <Row label="Length" value={formatMinutes(record.lengthMinutes)} />
        )}
        {recurrence !== null && (
          <Row label="Repeats" value={describeRecurrence(recurrence, recurrenceLabels)} />
        )}
        {record.slipCount > 0 && (
          <Row
            label="Slipped"
            value={`${record.slipCount} time${record.slipCount === 1 ? '' : 's'}`}
          />
        )}
        {steps.length > 0 && <Row label="Steps" value={String(steps.length)} last />}
        {stops.length > 0 && <Row label="Stops" value={stops.join(', ')} last />}
      </View>

      {record.notes !== null && record.notes !== '' && (
        <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>{record.notes}</Text>
      )}

      {showMore ? (
        <View style={styles.more}>
          <Button
            label={`Move to ${weekdayName(nextDay(start ?? new Date()))}`}
            variant="secondary"
            onPress={() => void after(() => slipToNextDay(record.id, start ?? new Date()))}
          />
          {/* Dropped, not deleted. It stays readable, exportable, and counted in the day
              it was dropped from. */}
          <Button
            label="Drop it"
            variant="secondary"
            onPress={() => void after(() => dropRecord(record.id))}
          />
          <Pressable onPress={() => setShowMore(false)} style={styles.back}>
            <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>Back</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          {/* A session cannot be finished, only fed — so it does not get a Done. */}
          {record.kind !== 'session' && (
            <Button
              label={record.state === 'done' ? 'Not done' : 'Done'}
              style={styles.action}
              onPress={() => void after(() => setDone(record.id, record.state !== 'done'))}
            />
          )}
          <Button
            label="Edit"
            variant="secondary"
            style={styles.action}
            onPress={() =>
              router.replace({
                pathname: `/${KIND_ROUTE[record.kind]}`,
                params: { id: record.id },
              })
            }
          />
          <Button
            label="⋯"
            variant="secondary"
            style={styles.overflow}
            onPress={() => setShowMore(true)}
          />
        </View>
      )}
    </Sheet>
  );

  function Row({
    label,
    value,
    first = false,
    last = false,
  }: {
    label: string;
    value: string;
    first?: boolean;
    last?: boolean;
  }) {
    return (
      <View
        style={[
          styles.row,
          { borderTopWidth: 1, borderTopColor: theme.colors.line2 },
          first && { borderTopColor: theme.colors.line2 },
          last && { borderBottomWidth: 1, borderBottomColor: theme.colors.line2 },
        ]}
      >
        <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>{label}</Text>
        <Text
          style={[
            theme.type.bodySmall,
            styles.value,
            { fontFamily: theme.fonts.uiMedium, color: theme.colors.ink },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    );
  }
}

function nextDay(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  return d;
}

const styles = StyleSheet.create({
  kind: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, flexGrow: 0, flexShrink: 0 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  value: { flexShrink: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 9 },
  action: { flex: 1 },
  overflow: { width: 52 },
  more: { gap: 9 },
  back: { height: 42, alignItems: 'center', justifyContent: 'center' },
});
