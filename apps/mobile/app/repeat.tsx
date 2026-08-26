import { describeRecurrence, recurrenceCost, type Frequency, type Recurrence } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Field, Note } from '@/components/Field';
import { Ring } from '@/components/Ring';
import { WEEKDAY_INITIALS } from '@/lib/day';
import {
  fromParams,
  recurrenceLabels,
  toParams,
  type RecurrenceParams,
} from '@/lib/recurrenceParams';
import { useTheme } from '@/theme';

/**
 * `repeat` — the recurrence editor.
 *
 * The controls are the easy half. The sentence at the foot is the screen: a frequency,
 * an interval and seven chips are three settings nobody reads back as a rule, and
 * "Every 2 weeks on Mon, Wed and Fri, until 12 December" is what tells someone they
 * have set the wrong thing before they save it.
 *
 * Underneath it, the line this product exists to print: a repeat is not one commitment,
 * it is twenty-six, and each one costs its day.
 */

const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
const FREQ_LABEL: Record<Frequency, string> = {
  daily: 'Day',
  weekly: 'Week',
  monthly: 'Month',
  yearly: 'Year',
};

export default function Repeat() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<
    RecurrenceParams & Record<string, string> & { from?: string; lengthMinutes?: string }
  >();

  const today = useMemo(() => new Date(), []);
  const lengthMinutes = Number(params.lengthMinutes) || 0;
  const returnTo = (params.from ?? 'task') as string;

  const [rule, setRule] = useState<Recurrence>(
    () =>
      fromParams(params) ?? {
        freq: 'weekly',
        interval: 1,
        byWeekday: [today.getDay()],
        ends: 'never',
      },
  );

  const set = (next: Partial<Recurrence>) => setRule((r) => ({ ...r, ...next }));

  const toggleWeekday = (day: number) => {
    const days = new Set(rule.byWeekday ?? []);
    if (days.has(day)) days.delete(day);
    else days.add(day);
    // Never leave the rule with no day at all — it would mean "every week on nothing".
    set({ byWeekday: days.size === 0 ? [day] : [...days] });
  };

  const sentence = describeRecurrence(rule, recurrenceLabels);
  const cost = recurrenceCost(rule, today, lengthMinutes);

  const done = () =>
    router.replace({
      pathname: `/${returnTo}`,
      params: { ...params, ...toParams(rule), from: undefined },
    });

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 18 }]}
    >
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>Back</Text>
        </Pressable>
        <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>Repeats</Text>
        <Pressable onPress={done} hitSlop={12}>
          <Text
            style={[
              theme.type.bodySmall,
              { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.acc },
            ]}
          >
            Done
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.track,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.line,
              borderRadius: theme.geometry.input.radius,
            },
          ]}
        >
          {FREQUENCIES.map((freq) => {
            const on = rule.freq === freq;
            return (
              <Pressable
                key={freq}
                onPress={() => set({ freq })}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.segment, on && { backgroundColor: theme.colors.accFill }]}
              >
                <Text
                  style={[
                    theme.type.chip,
                    {
                      fontFamily: theme.fonts.uiSemiBold,
                      fontSize: 12.5,
                      color: on ? theme.colors.onAcc : theme.colors.ink2,
                    },
                  ]}
                >
                  {FREQ_LABEL[freq]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field label="How often">
          <View
            style={[
              styles.stepper,
              {
                minHeight: theme.geometry.input.minHeight,
                borderRadius: theme.geometry.input.radius,
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.line,
              },
            ]}
          >
            <Text style={[theme.type.body, { color: theme.colors.ink }]}>
              Every <Text style={{ fontFamily: theme.fonts.uiSemiBold }}>{rule.interval}</Text>{' '}
              {FREQ_LABEL[rule.freq].toLowerCase()}
              {rule.interval === 1 ? '' : 's'}
            </Text>
            <View style={styles.stepperButtons}>
              <StepButton
                label="−"
                onPress={() => set({ interval: Math.max(1, rule.interval - 1) })}
                dim={rule.interval === 1}
              />
              <StepButton label="+" onPress={() => set({ interval: rule.interval + 1 })} accent />
            </View>
          </View>
        </Field>

        {rule.freq === 'weekly' && (
          <Field label="On these days">
            <View style={styles.days}>
              {WEEKDAY_INITIALS.map((initial, i) => {
                // The row reads Monday-first; the value is 0 = Sunday.
                const day = (i + 1) % 7;
                const on = (rule.byWeekday ?? []).includes(day);
                return (
                  <Pressable
                    key={i}
                    onPress={() => toggleWeekday(day)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[
                      styles.day,
                      {
                        backgroundColor: on ? theme.colors.accFill : theme.colors.card,
                        borderColor: on ? theme.colors.accFill : theme.colors.line,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        theme.type.chip,
                        {
                          fontFamily: theme.fonts.uiSemiBold,
                          color: on ? theme.colors.onAcc : theme.colors.ink2,
                        },
                      ]}
                    >
                      {initial}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>
        )}

        <Field label="Ends">
          <View
            style={[
              styles.ends,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.line,
                borderRadius: theme.geometry.card.radius,
              },
            ]}
          >
            <EndsRow
              label="Never"
              on={rule.ends === 'never'}
              onPress={() => set({ ends: 'never' })}
              first
            />
            <EndsRow
              label={rule.endsOn ? `On ${recurrenceLabels.date(rule.endsOn)}` : 'On a date'}
              on={rule.ends === 'onDate'}
              onPress={() =>
                set({
                  ends: 'onDate',
                  endsOn: rule.endsOn ?? defaultEndDate(today),
                })
              }
            />
            <EndsRow
              label={`After ${rule.endsAfter ?? 12} times`}
              on={rule.ends === 'afterN'}
              onPress={() => set({ ends: 'afterN', endsAfter: rule.endsAfter ?? 12 })}
            />
          </View>
        </Field>

        <Note>{`${sentence}.${cost ? `\n${cost}` : ''}`}</Note>
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 18 }}>
        <Button label="Set repeat" onPress={done} />
      </View>
    </View>
  );

  function StepButton({
    label,
    onPress,
    accent = false,
    dim = false,
  }: {
    label: string;
    onPress: () => void;
    accent?: boolean;
    dim?: boolean;
  }) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label === '+' ? 'More often' : 'Less often'}
        style={[
          styles.step,
          {
            backgroundColor: accent ? theme.colors.accSoft : 'transparent',
            borderWidth: accent ? 0 : 1,
            borderColor: theme.colors.line,
            opacity: dim ? 0.4 : 1,
          },
        ]}
      >
        <Text
          style={[
            theme.type.body,
            {
              fontFamily: theme.fonts.uiSemiBold,
              color: accent ? theme.colors.acc : theme.colors.ink2,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function EndsRow({
    label,
    on,
    onPress,
    first = false,
  }: {
    label: string;
    on: boolean;
    onPress: () => void;
    first?: boolean;
  }) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        style={[
          styles.endsRow,
          !first && { borderTopWidth: 1, borderTopColor: theme.colors.line2 },
        ]}
      >
        <Text style={[theme.type.body, styles.endsLabel, { color: theme.colors.ink }]}>
          {label}
        </Text>
        <Ring done={on} label={label} />
      </Pressable>
    );
  }
}

/** Three months out — far enough to be a real choice, near enough to be edited. */
function defaultEndDate(from: Date): number {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 3);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { flex: 1, marginTop: 20 },
  bodyContent: { gap: 18, paddingBottom: 8 },
  track: { flexDirection: 'row', borderWidth: 1, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8 },
  stepper: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  stepperButtons: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  step: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  days: { flexDirection: 'row', gap: 5 },
  day: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
  ends: { borderWidth: 1, paddingHorizontal: 15 },
  endsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  endsLabel: { flex: 1 },
});
