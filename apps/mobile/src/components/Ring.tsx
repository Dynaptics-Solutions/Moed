import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

type RingProps = {
  done: boolean;
  onPress?: () => void;
  /** What the row is, so a screen reader says more than "checkbox". */
  label: string;
};

/**
 * The completion ring. 19x19, a 1.4px `ink3` circle when open; filled `accFill` with a
 * 1.8px tick when done.
 *
 * Deliberately not a platform checkbox: it appears on every row of every list in the
 * planner, and the one thing it must never look like is a form control.
 */
export function Ring({ done, onPress, label }: RingProps) {
  const theme = useTheme();
  const { size, borderWidth, tickWidth } = theme.geometry.ring;

  const body = done ? (
    <View style={[styles.ring, ringSize(size), { backgroundColor: theme.colors.accFill }]}>
      <Svg width={10} height={8} viewBox="0 0 10 8">
        <Path
          d="M1 4.2 3.6 6.8 9 1.4"
          stroke={theme.colors.onAcc}
          strokeWidth={tickWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  ) : (
    <View style={[styles.ring, ringSize(size), { borderWidth, borderColor: theme.colors.ink3 }]} />
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      // The ring is 19px; the tap target is not.
      hitSlop={12}
    >
      {body}
    </Pressable>
  );
}

const ringSize = (size: number) => ({ width: size, height: size, borderRadius: size / 2 });

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexGrow: 0,
    flexShrink: 0,
  },
});
