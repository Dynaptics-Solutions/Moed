import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** A tighter chip, used inside the gate's option rows. */
  compact?: boolean;
  /** Fills its share of the row — the close's three choices sit side by side. */
  block?: boolean;
};

/** Pill, 19px radius on both platforms. Selected fills `accFill`. */
export function Chip({
  label,
  selected = false,
  onPress,
  compact = false,
  block = false,
}: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        compact ? styles.compact : styles.regular,
        block && styles.block,
        {
          borderRadius: theme.geometry.chip.radius,
          backgroundColor: selected ? theme.colors.accFill : theme.colors.card,
          borderColor: selected ? theme.colors.accFill : theme.colors.line,
        },
      ]}
    >
      <Text
        style={[theme.type.chip, { color: selected ? theme.colors.onAcc : theme.colors.ink2 }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, flexGrow: 0, flexShrink: 0, alignItems: 'center' },
  block: { flexGrow: 1, flexShrink: 1 },
  regular: { paddingVertical: 8, paddingHorizontal: 12 },
  compact: { paddingVertical: 7, paddingHorizontal: 11 },
});
