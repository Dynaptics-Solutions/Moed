import { leftoverMeta, leftovers } from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import {
  dropRecord,
  setDone,
  slipToNextDay,
  unslip,
  useDayRecords,
  type PlannerRecord,
} from '@/db/records';
import { weekdayName } from '@/lib/day';
import { useTheme } from '@/theme';

type Choice = 'done' | 'moved' | 'dropped';

/**
 * A decision taken in this sitting, what it would take to reverse it, and the record as
 * it stood when it was taken — a moved record leaves the day the moment it is tapped,
 * so the card can only keep being drawn from a copy.
 */
type Decision = { choice: Choice; from: number | null; record: PlannerRecord };

/**
 * `close` — the evening close, and the one uninvited notification a day.
 *
 * Three buttons per leftover and no free text. The point is not to journal the day, it
 * is to leave nothing undecided: a record that is neither done, moved nor dropped is a
 * record that quietly rolls into tomorrow, and nothing rolls silently into tomorrow.
 *
 * Choices apply as they are tapped and each one is reversible until the day is shut,
 * because a close with a Save button is a close people abandon halfway.
 *
 * Reversible means the list is the leftovers as they stood when the close opened, held
 * for the sitting. Reading it live would be simpler and wrong: a record goes to `done`
 * or leaves for tomorrow the instant it is tapped, so a live list drops the card at the
 * moment of the decision and there is nothing left to change one's mind with.
 */
export default function Close() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const { data: records } = useDayRecords(today);
  const rows = useMemo(() => records ?? [], [records]);

  // What was decided in this sitting, so the shut screen can report it without a table
  // to record closes in, and so each decision knows how to undo itself.
  const [decided, setDecided] = useState<Record<string, Decision>>({});

  // The sitting's list: everything still open, plus everything decided in this sitting,
  // held from the copy taken when it was decided.
  //
  // The second half is what makes a decision reversible. A record goes to `done` or
  // leaves for tomorrow the instant it is tapped, so reading the list live would drop
  // the card at the moment of the decision and leave nothing to change one's mind with.
  const open = useMemo(() => {
    const undecided = leftovers(rows).filter((r) => !decided[r.id]);
    const settled = Object.values(decided).map((d) => d.record);
    return [...undecided, ...settled].sort((a, b) => (a.startAt ?? 0) - (b.startAt ?? 0));
  }, [rows, decided]);

  const remaining = open.filter((r) => !decided[r.id]);

  /** Put a record back exactly as the close found it. */
  const revert = async (id: string, decision: Decision) => {
    if (decision.choice === 'moved') await unslip(id, decision.from);
    // Done and dropped both left the record where it was and only changed its state, so
    // both come back the same way. There is no third thing to undo.
    else await setDone(id, false);
  };

  /**
   * Tapping the chosen chip again takes the decision back; tapping a different one
   * replaces it. Either way the previous decision is reversed first, so a record never
   * carries two decisions at once — dropping something and then marking it done used to
   * leave it dropped *and* done, and moving then changing one's mind left the slip
   * count up by one for a slip that did not happen.
   */
  const decide = async (record: PlannerRecord, choice: Choice) => {
    const id = record.id;
    const previous = decided[id];
    if (previous) await revert(id, previous);

    if (previous?.choice === choice) {
      setDecided(({ [id]: _cleared, ...rest }) => rest);
      return;
    }

    if (choice === 'done') {
      await setDone(id, true);
      setDecided((d) => ({ ...d, [id]: { choice, from: null, record } }));
    } else if (choice === 'moved') {
      const from = await slipToNextDay(id, today);
      setDecided((d) => ({ ...d, [id]: { choice, from, record } }));
    } else {
      await dropRecord(id);
      setDecided((d) => ({ ...d, [id]: { choice, from: null, record } }));
    }
  };

  const counts = {
    done: Object.values(decided).filter((d) => d.choice === 'done').length,
    moved: Object.values(decided).filter((d) => d.choice === 'moved').length,
    dropped: Object.values(decided).filter((d) => d.choice === 'dropped').length,
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
          const choice = decided[record.id]?.choice;
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
                    onPress={() => void decide(record, option)}
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
