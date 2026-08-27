import { parseCapture, parsedSummary } from '@moed/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Ring } from '@/components/Ring';
import { Sheet } from '@/components/Sheet';
import { useSaveDraft } from '@/lib/saveDraft';
import { useTheme } from '@/theme';

/**
 * `capture` — one line of text, and the highest-frequency action in the app.
 *
 * The parse is local (`chrono-node`), never a model call: it is cheaper, and it works
 * with no signal, which a planner needs.
 *
 * Saving goes through the gate. The gate fires on save from any form — this is the one
 * people will meet most, so it has to be the same gate and not a lighter version of it.
 */
export default function Capture() {
  const theme = useTheme();
  const router = useRouter();

  const [text, setText] = useState('');
  const [dayChoice, setDayChoice] = useState<'today' | 'tomorrow'>('today');

  const { save, today } = useSaveDraft();

  const parsed = useMemo(() => parseCapture(text), [text]);
  const summary = parsedSummary(parsed);

  const startAt = useMemo(() => {
    if (parsed.startAt !== undefined) return parsed.startAt;
    const d = new Date(today);
    if (dayChoice === 'tomorrow') d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.getTime();
  }, [parsed.startAt, dayChoice, today]);

  const lengthMinutes = parsed.lengthMinutes ?? 30;
  const canSave = parsed.title.trim().length > 0;

  /**
   * Through the same save every form uses.
   *
   * This used to decide the gate for itself and then hand it three loose parameters —
   * title, lengthMinutes, startAt — while the gate reads a single encoded `draft`. So on
   * a full day the gate found no draft and sent itself back to the day, and the line
   * someone had just typed was dropped with nothing said. Silence is the worst possible
   * answer to "does this fit", and this is the path people take most.
   *
   * `useSaveDraft` exists precisely so the limit is enforced in one place. Capture was
   * the sixth place, and the one that broke.
   */
  const onSave = () => {
    if (!canSave) return;
    void save({ kind: 'task', title: parsed.title, lengthMinutes, startAt });
  };

  return (
    <Sheet>
      <View style={styles.line}>
        <Ring done={false} label="New task" />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Call the framer about the print"
          placeholderTextColor={theme.colors.ink3}
          style={[styles.input, { color: theme.colors.ink, fontFamily: theme.fonts.ui }]}
          autoFocus
          multiline
          selectionColor={theme.colors.acc}
          onSubmitEditing={() => void onSave()}
        />
      </View>

      <View style={styles.chips}>
        <Chip
          label="Today"
          selected={dayChoice === 'today' && parsed.startAt === undefined}
          onPress={() => setDayChoice('today')}
        />
        <Chip
          label="Tomorrow"
          selected={dayChoice === 'tomorrow' && parsed.startAt === undefined}
          onPress={() => setDayChoice('tomorrow')}
        />
        <Chip label={parsed.lengthMinutes ? `${parsed.lengthMinutes}m` : '+ Length'} />
        <Chip label="+ Project" />
      </View>

      {summary !== null && (
        <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>{summary}</Text>
      )}

      <View style={styles.actions}>
        <Button
          label="Make this a…"
          variant="secondary"
          style={styles.action}
          onPress={() =>
            router.replace({
              pathname: '/types',
              params: {
                title: parsed.title,
                lengthMinutes: String(lengthMinutes),
                startAt: String(startAt),
              },
            })
          }
        />
        <Button
          label="Save"
          style={styles.action}
          disabled={!canSave}
          onPress={() => void onSave()}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  input: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
    padding: 0,
    marginTop: 1,
  },
  chips: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: 9 },
  action: { flex: 1 },
});
