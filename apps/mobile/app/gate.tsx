import { dayLoad, formatMinutes, gate, type GateOption } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CapacityBar } from '@/components/CapacityBar';
import { Chip } from '@/components/Chip';
import { Sheet } from '@/components/Sheet';
import { useDayLimit } from '@/db/dayLimits';
import { createRecord, moveRecord, useDayRecords } from '@/db/records';
import { useUpcomingDays } from '@/db/upcoming';
import { useTheme } from '@/theme';

/**
 * `gate` — the over-limit gate, and the core interaction of the whole product.
 *
 * It names the overage in minutes, offers two concrete fixes, and always allows "Add it
 * anyway". It never resolves anything itself: every option here is one tap to accept.
 * The app proposes; it never moves anything.
 */
export default function Gate() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    title: string;
    lengthMinutes: string;
    startAt: string;
  }>();

  const today = useMemo(() => new Date(), []);

  const title = params.title ?? '';
  const lengthMinutes = Number(params.lengthMinutes ?? 0);
  const startAt = Number(params.startAt) || today.getTime();

  const limit = useDayLimit(today);
  const { data: dayRecords } = useDayRecords(today);
  const upcoming = useUpcomingDays(today);

  const load = dayLoad(dayRecords ?? []);
  const decision = gate(
    { ...load, limit, adding: lengthMinutes },
    (dayRecords ?? [])
      .filter((r) => !r.isFixed && r.state === 'open')
      .map((r) => ({ id: r.id, title: r.title, lengthMinutes: r.lengthMinutes })),
    upcoming,
  );

  const land = (id: string) => router.replace({ pathname: '/', params: { landed: id } });

  const addAnyway = async () => {
    const created = await createRecord({ kind: 'task', title, lengthMinutes, startAt });
    land(created.id);
  };

  const accept = async (option: GateOption) => {
    if (option.kind === 'shorten') {
      const created = await createRecord({
        kind: 'task',
        title,
        lengthMinutes: option.toMinutes,
        startAt,
      });
      land(created.id);
      return;
    }

    // Move carries everything: the record keeps its length, reminder and project, and
    // nothing else on either day shifts.
    await moveRecord(option.record.id, option.day.date);
    const created = await createRecord({ kind: 'task', title, lengthMinutes, startAt });
    land(created.id);
  };

  return (
    <Sheet accent={theme.colors.over}>
      <Text style={[theme.type.sectionLabel, { color: theme.colors.over }]}>
        Before you add this
      </Text>
      <Text style={[theme.type.sheetTitle, { color: theme.colors.ink }]}>
        This puts you {formatMinutes(decision.overBy)} over
      </Text>

      <CapacityBar
        committed={load.committed + lengthMinutes}
        fixed={load.fixed}
        limit={limit}
        composition={`${formatMinutes(load.committed + lengthMinutes)} work · ${formatMinutes(load.fixed)} fixed`}
      />

      <View style={styles.options}>
        {decision.options.map((option) => (
          <View
            key={option.kind}
            style={[
              styles.option,
              {
                backgroundColor: theme.colors.bg,
                borderColor: theme.colors.line,
                borderRadius: theme.geometry.input.radius,
              },
            ]}
          >
            <View style={styles.optionText}>
              <Text
                style={[
                  theme.type.bodySmall,
                  { fontFamily: theme.fonts.uiMedium, color: theme.colors.ink },
                ]}
              >
                {option.kind === 'move'
                  ? `Move “${option.record.title}” to ${option.day.label}`
                  : `Shorten this to ${formatMinutes(option.toMinutes)}`}
              </Text>
              {option.kind === 'move' && (
                <Text style={[theme.type.meta, styles.detail, { color: theme.colors.ink3 }]}>
                  {option.detail}
                </Text>
              )}
            </View>
            <Chip
              label="Do it"
              compact
              selected={option.kind === 'move'}
              onPress={() => void accept(option)}
            />
          </View>
        ))}
      </View>

      {/* Always available. A screen that has to say no says why, and offers the way
          through — this is never a dead end. */}
      <Button label="Add it anyway" variant="secondary" onPress={() => void addAnyway()} />

      <Pressable onPress={() => router.replace('/')} style={styles.cancel}>
        <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>Not now</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  optionText: { flex: 1 },
  detail: { marginTop: 3 },
  cancel: { height: 42, alignItems: 'center', justifyContent: 'center' },
});
