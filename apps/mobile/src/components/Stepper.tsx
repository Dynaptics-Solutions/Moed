import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * A value with a minus and a plus. The recurrence editor's interval control, lifted so
 * the day limit and the week's money limit use the same one rather than a second and a
 * third that drift apart in their spacing.
 *
 * The label is a whole sentence rather than a bare number — "Every 2 weeks", "9h 30m a
 * day" — because a stepper showing "2" tells you nothing about what two is.
 */
export function Stepper({
  children,
  onLess,
  onMore,
  atLeast = false,
  atMost = false,
  lessLabel,
  moreLabel,
}: {
  children: React.ReactNode;
  onLess: () => void;
  onMore: () => void;
  /** At the bottom of the range: minus is dimmed. */
  atLeast?: boolean;
  /** At the top of the range: plus is dimmed. */
  atMost?: boolean;
  lessLabel: string;
  moreLabel: string;
}) {
  const theme = useTheme();

  return (
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
      {children}
      <View style={styles.buttons}>
        <Button label="−" accessibilityLabel={lessLabel} onPress={onLess} dim={atLeast} />
        <Button label="+" accessibilityLabel={moreLabel} onPress={onMore} accent dim={atMost} />
      </View>
    </View>
  );
}

function Button({
  label,
  accessibilityLabel,
  onPress,
  accent = false,
  dim = false,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  accent?: boolean;
  dim?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
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

const styles = StyleSheet.create({
  stepper: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 12,
  },
  buttons: { flexDirection: 'row', gap: 7 },
  step: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
