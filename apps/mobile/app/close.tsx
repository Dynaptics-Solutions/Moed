import { leftoverMeta, leftovers } from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { dropRecord, setDone, slipToNextDay, useDayRecords } from '@/db/records';
import { weekdayName } from '@/lib/day';
import { useTheme } from '@/theme';

/**
 * `close` — the evening close, and the one uninvited notification a day.
 *
 * Three buttons per leftover and no free text. The point is not to journal the day, it
 * is to leave nothing undecided: a record that is neither done, moved nor dropped is a
 * record that quietly rolls into tomorrow, and nothing rolls silently into tomorrow.
 *
 * Choices apply as they are tapped and each one is reversible until the day is shut,
 * because a close with a Save button is a close people abandon halfway.
 */
export default function Close() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const { data: records } = useDayRecords(today);
  const rows = useMemo(() => records ?? [], [records]);

  // What was decided in this sitting, so the shut screen can report it without a table
  // to record closes in.
  const [decided, setDecided] = useState<Record<string, 'done' | 'moved' | 'dropped'>>({});

  const open = leftovers(rows);
  const remaining = open.filter((r) => !decided[r.id]);

  const decide = async (id: string, choice: 'done' | 'moved' | 'dropped') => {
    setDecided((d) => ({ ...d, [id]: choice }));
    if (choice === 'done') await setDone(id, true);
    else if (choice === 'moved') await slipToNextDay(id, today);
    else await dropRecord(id);
  };

  const counts = {
    done: Object.values(decided).filter((c) => c === 'done').length,
    moved: Object.values(decided).filter((c) => c === 'moved').length,
    dropped: Object.values(decided).filter((c) => c === 'dropped').length,
  };

  const headline =
    remaining.length === 0
      ? 'Nothing left'
      : `${remaining.length === 1 ? 'One' : remaining.length} left`;

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>
        Closing {weekdayName(today)}
      </Text>
      <Text style={[theme.type.screenTitle, styles.headline, { color: theme.colors.ink }]}>
        {headline}
      </Text>
      <Text style={[theme.type.bodySmall, styles.blurb, { color: theme.colors.ink2 }]}>
        {remaining.length === 0
          ? 'Every record has a decision. Shut it when you are ready.'
          : 'Done, move, or drop. Then it is shut.'}
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {open.map((record) => {
          const choice = decided[record.id];
          const meta = leftoverMeta(record.lengthMinutes, record.slipCount);

          return (
            <View
              key={record.id}
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
              <Text
                style={[
                  theme.type.body,
                  { fontFamily: theme.fonts.uiMedium, color: theme.colors.ink },
                ]}
              >
                {record.title}
              </Text>
              {meta !== '' && (
                <Text style={[theme.type.meta, styles.meta, { color: theme.colors.ink3 }]}>
                  {meta}
                </Text>
              )}

              <View style={styles.choices}>
                {(['done', 'moved', 'dropped'] as const).map((option) => (
                  <Chip
                    key={option}
                    block
                    label={option === 'done' ? 'Done' : option === 'moved' ? 'Move' : 'Drop'}
                    selected={choice === option}
                    onPress={() => void decide(record.id, option)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        {open.length === 0 && (
          <Text style={[theme.type.body, { color: theme.colors.ink3 }]}>
            Nothing was left open today.
          </Text>
        )}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 18 }}>
        <Button
          label="Shut the day"
          onPress={() =>
            router.replace({
              pathname: '/shut',
              params: {
                done: String(counts.done),
                moved: String(counts.moved),
                dropped: String(counts.dropped),
              },
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  headline: { marginTop: 8 },
  blurb: { marginTop: 8 },
  list: { flex: 1, marginTop: 20 },
  listContent: { gap: 11, paddingBottom: 8 },
  card: { borderWidth: 1, paddingVertical: 15, paddingHorizontal: 16 },
  meta: { marginTop: 4 },
  choices: { marginTop: 12, flexDirection: 'row', gap: 7 },
});
