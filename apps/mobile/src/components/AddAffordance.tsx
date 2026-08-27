import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

type AddAffordanceProps = {
  onPress?: () => void;
  /** The safe-area bottom inset, so neither shape sits under the home indicator. */
  bottomInset?: number;
};

/**
 * Capture, which is the highest-frequency action in the app — so it gets each
 * platform's own shape rather than one compromise on both. Both variants position
 * themselves, so a screen renders this once and does not branch.
 *
 * iOS: an inline 50-high pill in the flow, reading "Add anything…".
 * Android: a 58x58 FAB with a 19px radius, floating bottom-right over the list.
 *
 * Two readings of the prototype worth naming. It fakes both shapes from one element by
 * hiding the label on Android, which leaves the FAB card-coloured — that is a
 * prototyping artefact rather than an intent, since a FAB is the screen's primary
 * action, so it is drawn in `accFill` here. And its `right: 18` is measured from the
 * screen edge while the content gutter is 20; the FAB aligns to the gutter instead, so
 * it lines up with everything above it.
 *
 * That alignment has to be stated as the gutter and cannot be inherited. An absolutely
 * positioned child resolves `right` against its parent's padding box, so `right: 0`
 * inside a screen padded by 20 still lands hard against the screen edge — which is
 * where the FAB was sitting, touching the bezel and out of line with the date and the
 * capacity bar above it.
 */
export function AddAffordance({ onPress, bottomInset = 0 }: AddAffordanceProps) {
  const theme = useTheme();

  const plus = (
    <Svg width={15} height={15} viewBox="0 0 15 15">
      <Path
        d="M7.5 2v11M2 7.5h11"
        stroke={theme.colors.onAcc}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  );

  if (Platform.OS === 'android') {
    const add = theme.geometry.add as { kind: 'fab'; size: number; radius: number };
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Add anything"
        style={[
          styles.fab,
          theme.shadow,
          {
            width: add.size,
            height: add.size,
            borderRadius: add.radius,
            backgroundColor: theme.colors.accFill,
            bottom: bottomInset + 16,
          },
        ]}
      >
        {plus}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add anything"
      style={[
        styles.pill,
        theme.shadow,
        {
          borderRadius: 25,
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.line,
          marginBottom: bottomInset + 16,
        },
      ]}
    >
      <Text style={[theme.type.bodySmall, styles.pillLabel, { color: theme.colors.ink2 }]}>
        Add anything…
      </Text>
      <View style={[styles.pillPlus, { backgroundColor: theme.colors.accFill }]}>{plus}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 5,
    flexGrow: 0,
    flexShrink: 0,
  },
  pillLabel: { flex: 1 },
  pillPlus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    /** The 20 content gutter, matching every screen's `paddingHorizontal`. */
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
