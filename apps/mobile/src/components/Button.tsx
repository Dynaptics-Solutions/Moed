import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** `secondary` is the outlined form — "Make this a…", "Add it anyway". */
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * 48 high on both platforms; 13px radius on iOS, a 26px pill on Android. The height is
 * shared and the shape is not, which is the pattern across this design.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        {
          height: theme.geometry.button.height,
          borderRadius: theme.geometry.button.radius,
          backgroundColor: primary ? theme.colors.accFill : theme.colors.card,
          borderWidth: primary ? 0 : 1,
          borderColor: theme.colors.line,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[theme.type.button, { color: primary ? theme.colors.onAcc : theme.colors.ink }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // No flexGrow/flexShrink here, deliberately. They were both 0, which is already
  // Yoga's default in React Native — so they bought nothing, and they collided with
  // callers: `flex: 1` and `flexGrow: 0` flatten into one object and reach Yoga as
  // separate props, so the button kept flexBasis 0 from the shorthand while flexGrow
  // stayed 0 and computed to zero width. That silently emptied the capture sheet and
  // the detail sheet of their buttons. A row that needs these to share width says so
  // with `flex: 1`, and now that works.
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
