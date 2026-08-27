import { dayLoad, formatMinutes, gate, type GateOption } from '@moed/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CapacityBar } from '@/components/CapacityBar';
import { Chip } from '@/components/Chip';
import { Sheet } from '@/components/Sheet';
import { moveRecord } from '@/db/records';
import { decodeDraft } from '@/lib/draft';
import { useSaveDraft } from '@/lib/saveDraft';
import { useTheme } from '@/theme';

/**
 * `gate` — the over-limit gate, and the core interaction of the whole product.
 *
 * It names the overage in minutes, offers at most two concrete fixes, and always allows
 * "Add it anyway". It never resolves anything itself: every option here is one tap to
 * accept. The app proposes; it never moves anything.
 */
export default function Gate() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ draft?: string }>();
  const { commit, load, limit, rows, upcoming } = useSaveDraft();

  const draft = decodeDraft(params.draft);

  // Nothing to decide about. Reached by a stale link or a reload; the day is the
  // honest place to be rather than an empty sheet. Through an effect, because
  // navigating during render sets state on the navigator mid-render and React rejects
  // it — the same fault that made the project screen unreachable.
  const hasDraft = draft !== null;

  useEffect(() => {
    if (!hasDraft) router.replace('/');
  }, [hasDraft, router]);

  if (!draft) return null;

  const adding = draft.lengthMinutes ?? 0;
  const decision = gate(
    { committed: load.committed, fixed: load.fixed, limit, adding, addingIsFixed: draft.isFixed },
    rows
      .filter((r) => !r.isFixed && r.state === 'open')
      .map((r) => ({ id: r.id, title: r.title, lengthMinutes: r.lengthMinutes })),
    upcoming,
  );

  const accept = async (option: GateOption) => {
    if (option.kind === 'shorten') {
      await commit({ ...draft, lengthMinutes: option.toMinutes });
      return;
    }

    // Move carries everything: the record keeps its length, reminder and project, and
    // nothing else on either day shifts.
    await moveRecord(option.record.id, option.day.date);
    await commit(draft);
  };

  const after = dayLoad([
    ...rows,
    { lengthMinutes: adding, isFixed: draft.isFixed ?? false, state: 'open' },
  ]);

  return (
    <Sheet accent={theme.colors.over}>
      <Text style={[theme.type.sectionLabel, { color: theme.colors.over }]}>
        Before you add this
      </Text>
      <Text style={[theme.type.sheetTitle, { color: theme.colors.ink }]}>
        This puts you {formatMinutes(decision.overBy)} over
      </Text>

      <CapacityBar
        committed={after.committed}
        fixed={after.fixed}
        limit={limit}
        composition={`${formatMinutes(after.committed)} work · ${formatMinutes(after.fixed)} fixed`}
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
      <Button label="Add it anyway" variant="secondary" onPress={() => void commit(draft)} />

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
