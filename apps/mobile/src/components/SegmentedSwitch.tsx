import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

export type CalendarScale = 'week' | 'month';

/**
 * Day / Week / Month, on the Calendar tab.
 *
 * Day jumps to the Today tab rather than rendering a third view here, because Today and
 * Calendar → Day are the same screen and having two of it would be two things to keep
 * in step. Week and month switch in place: changing scale is not navigation.
 */
export function SegmentedSwitch({
  active,
  onScale,
}: {
  active: CalendarScale;
  onScale: (scale: CalendarScale) => void;
}) {
  const theme = useTheme();
  const router = useRouter();

  const segments: { label: string; on: boolean; press: () => void }[] = [
    { label: 'Day', on: false, press: () => router.navigate('/') },
    { label: 'Week', on: active === 'week', press: () => onScale('week') },
    { label: 'Month', on: active === 'month', press: () => onScale('month') },
  ];

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.line,
          borderRadius: theme.geometry.input.radius,
        },
      ]}
    >
      {segments.map((segment) => (
        <Pressable
          key={segment.label}
          onPress={segment.press}
          accessibilityRole="tab"
          accessibilityState={{ selected: segment.on }}
          style={[styles.segment, segment.on && { backgroundColor: theme.colors.accFill }]}
        >
          <Text
            style={[
              theme.type.chip,
              {
                fontFamily: theme.fonts.uiSemiBold,
                fontSize: 12.5,
                color: segment.on ? theme.colors.onAcc : theme.colors.ink2,
              },
            ]}
          >
            {segment.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderWidth: 1, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
});
