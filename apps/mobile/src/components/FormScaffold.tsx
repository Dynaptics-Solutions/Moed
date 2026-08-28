import { formatMinutes, gate, type DayLoad } from '@moed/core';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { CapacityBar } from './CapacityBar';
import { useKeyboardInset } from '@/lib/keyboard';
import { useTheme } from '@/theme';

type FormScaffoldProps = {
  /**
   * "New task", "Edit routine" — the small uppercase label in the bar. It names the
   * kind *and* which of the two things is happening, because create and edit are the
   * same screen: a form reached from Edit that still says NEW is telling the plainest
   * possible lie about what the Save button will do.
   */
  kindLabel: string;
  /** "Cancel" from capture, "Back" from the type picker. */
  leading: { label: string; onPress: () => void };
  onSave: () => void;
  saveLabel: string;
  /** Title is edited in place, in Cormorant. It is the only typed field on any form. */
  title: string;
  onTitleChange?: (next: string) => void;
  titlePlaceholder?: string;
  /**
   * When present, the foot carries the bar and the verdict — does this fit — so the
   * gate is a confirmation rather than a surprise. Every kind passes it, the
   * appointment included: fixed time still spends the day, and saying so in the foot
   * costs nothing next to the note it already draws about travel.
   */
  budget?: {
    load: DayLoad;
    limit: number;
    adding: number;
    addingIsFixed?: boolean;
    /**
     * The day being described — "Today", "Thursday". The foot has to name it, because
     * it is the landing day's free time and only sometimes this one's.
     */
    dayLabel: string;
  };
  /**
   * Nothing on this form can be changed, because something else owns the record — an
   * appointment mirrored in from a calendar is edited in the calendar it came from.
   *
   * The save control goes rather than being dimmed. A dimmed button says "not yet";
   * this is "not here", and the two should not look alike.
   */
  readOnly?: boolean;
  children: React.ReactNode;
  /** Extra content above the save button, inside the fixed footer. */
  footer?: React.ReactNode;
};

/**
 * One form per kind, showing only that kind's fields — so the shape is shared and the
 * fields are not. Five near-identical scaffolds is how five forms start drifting apart
 * in their spacing and their save behaviour.
 */
export function FormScaffold({
  kindLabel,
  leading,
  onSave,
  saveLabel,
  title,
  onTitleChange,
  titlePlaceholder = 'What is it',
  budget,
  readOnly = false,
  children,
  footer,
}: FormScaffoldProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();

  // The title is edited in place, so the keyboard is up while the foot still has to be
  // readable: it carries the bar and the verdict, which are the whole reason the gate
  // is a confirmation rather than a surprise. Shrinking the screen by the keyboard's
  // inset lets the fields scroll and keeps the foot above the keys.
  const footRoom = keyboard > 0 ? 0 : insets.bottom;

  const decision = budget
    ? gate({
        committed: budget.load.committed,
        fixed: budget.load.fixed,
        limit: budget.limit,
        adding: budget.adding,
        addingIsFixed: budget.addingIsFixed,
      })
    : null;

  const free = budget ? budget.limit - budget.load.committed - budget.load.fixed : 0;

  /**
   * `save` refuses a record with no title, and used to refuse it in silence: tapping
   * Save on an untitled form did nothing at all, with no message and nothing to read.
   * A screen that has to say no says why.
   *
   * Here rather than in each form, because the rule lives in one place and the control
   * that obeys it should too. It matches the capture sheet, whose Save is already dim
   * until there is something to save.
   */
  const canSave = !readOnly && title.trim().length > 0;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.bg,
          paddingTop: insets.top + 18,
          paddingBottom: keyboard,
        },
      ]}
    >
      <View style={styles.bar}>
        <Pressable onPress={leading.onPress} hitSlop={12}>
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>{leading.label}</Text>
        </Pressable>
        <Text style={[theme.type.sectionLabel, { color: theme.colors.taupe }]}>{kindLabel}</Text>
        {readOnly ? (
          <View style={styles.balance} />
        ) : (
          <Pressable onPress={canSave ? onSave : undefined} hitSlop={12}>
            <Text
              style={[
                theme.type.bodySmall,
                {
                  fontFamily: theme.fonts.uiSemiBold,
                  color: canSave ? theme.colors.acc : theme.colors.ink3,
                },
              ]}
            >
              Save
            </Text>
          </Pressable>
        )}
      </View>

      {onTitleChange ? (
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder={titlePlaceholder}
          placeholderTextColor={theme.colors.ink3}
          style={[theme.type.sheetTitle, styles.title, { color: theme.colors.ink }]}
          selectionColor={theme.colors.acc}
          multiline
        />
      ) : (
        <Text style={[theme.type.sheetTitle, styles.title, { color: theme.colors.ink }]}>
          {title}
        </Text>
      )}

      <ScrollView
        style={styles.fields}
        contentContainerStyle={styles.fieldsContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footRoom + 18 }]}>
        {footer}
        {budget && decision && (
          <>
            <CapacityBar
              committed={budget.load.committed + (budget.addingIsFixed ? 0 : budget.adding)}
              fixed={budget.load.fixed + (budget.addingIsFixed ? budget.adding : 0)}
              limit={budget.limit}
              caption={false}
              height={8}
            />
            {/* The one colour that means past the limit, used at the one moment it
                means it. Fitting is an ordinary fact and reads as one. */}
            <Text
              style={[
                theme.type.meta,
                styles.verdict,
                { color: decision.fits ? theme.colors.ink3 : theme.colors.over },
              ]}
            >
              {decision.fits
                ? `${budget.dayLabel} has ${formatMinutes(free)} free. This fits.`
                : budget.dayLabel === 'Today'
                  ? `This puts you ${formatMinutes(decision.overBy)} over.`
                  : `This puts ${budget.dayLabel} ${formatMinutes(decision.overBy)} over.`}
            </Text>
          </>
        )}
        {readOnly ? (
          <Text style={[theme.type.meta, styles.owned, { color: theme.colors.ink3 }]}>
            This came from your calendar. It is edited there, and read here.
          </Text>
        ) : (
          <Button label={saveLabel} style={styles.save} onPress={onSave} disabled={!canSave} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { marginTop: 20, padding: 0 },
  fields: { flex: 1, marginTop: 22 },
  fieldsContent: { gap: 17, paddingBottom: 8 },
  footer: { flexGrow: 0, flexShrink: 0, gap: 0 },
  verdict: { marginTop: 8 },
  save: { marginTop: 14 },
  balance: { width: 44 },
  owned: { marginTop: 16, lineHeight: 17 },
});
