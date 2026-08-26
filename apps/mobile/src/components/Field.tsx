import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={style}>
      <Text style={[theme.type.fieldLabel, styles.label, { color: theme.colors.ink3 }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

/**
 * The read-only-looking row every form uses for a value that opens a picker. It is a
 * button, not an input: nothing in these forms is typed except the title.
 */
export function Input({
  value,
  trailing = '▾',
  muted = false,
  dashed = false,
  onPress,
}: {
  value: string;
  trailing?: string;
  muted?: boolean;
  dashed?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[
        styles.input,
        {
          minHeight: theme.geometry.input.minHeight,
          borderRadius: theme.geometry.input.radius,
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.line,
          borderStyle: dashed ? 'dashed' : 'solid',
        },
      ]}
    >
      <Text
        style={[theme.type.body, { color: muted ? theme.colors.ink3 : theme.colors.ink }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>{trailing}</Text>
    </Pressable>
  );
}

/** 42x25 track, 19px knob — the switch on the appointment form. */
export function Toggle({
  on,
  onPress,
  label,
}: {
  on: boolean;
  onPress?: () => void;
  label: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[
        styles.track,
        {
          backgroundColor: on ? theme.colors.accFill : 'transparent',
          borderWidth: on ? 0 : 1,
          borderColor: theme.colors.line,
          justifyContent: on ? 'flex-end' : 'flex-start',
        },
      ]}
    >
      <View style={[styles.knob, { backgroundColor: on ? '#FFFFFF' : theme.colors.ink3 }]} />
    </Pressable>
  );
}

/** The accent-tinted card every form uses to explain what a choice costs. */
export function Note({ children, tone = 'acc' }: { children: string; tone?: 'acc' | 'taupe' }) {
  const theme = useTheme();
  const accent = tone === 'acc' ? theme.colors.acc : theme.colors.taupe;
  const surface = tone === 'acc' ? theme.colors.accSoft : theme.colors.taupeSoft;

  return (
    <View
      style={[
        styles.note,
        {
          backgroundColor: surface,
          borderColor: accent,
          borderRadius: theme.geometry.card.radius,
        },
      ]}
    >
      <Text
        style={[
          theme.type.bodySmall,
          styles.noteText,
          { fontFamily: theme.fonts.uiMedium, color: accent },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 7 },
  input: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  track: {
    width: 42,
    height: 25,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    flexGrow: 0,
    flexShrink: 0,
  },
  knob: { width: 19, height: 19, borderRadius: 9.5 },
  note: { borderWidth: 1, paddingVertical: 13, paddingHorizontal: 15 },
  noteText: { fontSize: 12.5, lineHeight: 18.75 },
});
