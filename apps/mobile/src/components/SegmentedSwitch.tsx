import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

export type CalendarScale = 'day' | 'week' | 'month';

const ROUTES: Record<CalendarScale, '/' | '/week' | '/month'> = {
  day: '/',
  week: '/week',
  month: '/month',
};

/**
 * Day / Week / Month. The calendar holds one of these; the three scales read the same
 * records, so switching between them is navigation and nothing else.
 */
export function SegmentedSwitch({ active }: { active: CalendarScale }) {
  const theme = useTheme();
  const router = useRouter();

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
      {(['day', 'week', 'month'] as const).map((scale) => {
        const on = scale === active;
        return (
          <Pressable
            key={scale}
            onPress={() => !on && router.replace(ROUTES[scale])}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segment, on && { backgroundColor: theme.colors.accFill }]}
          >
            <Text
              style={[
                theme.type.chip,
                {
                  fontFamily: theme.fonts.uiSemiBold,
                  fontSize: 12.5,
                  color: on ? theme.colors.onAcc : theme.colors.ink2,
                },
              ]}
            >
              {scale[0]!.toUpperCase() + scale.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderWidth: 1, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
});
