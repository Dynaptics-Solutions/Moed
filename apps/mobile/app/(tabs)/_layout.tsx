import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * Today, Calendar, Projects, Me.
 *
 * Four, and there will not be a fifth. Money, the meal plan, the diet plan and activity
 * all hang off Me — a tab bar is a claim about what the product is, and this one says
 * hours first.
 *
 * The bar's height and bottom padding differ by platform, as everything else does:
 * 36 + 26 on iOS, 36 + 14 on Android.
 */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.acc,
        tabBarInactiveTintColor: theme.colors.ink3,
        sceneStyle: { backgroundColor: theme.colors.bg },
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.line,
          borderTopWidth: 1,
          height: theme.geometry.nav.height + theme.geometry.nav.bottomPad + 18,
          paddingTop: 9,
          paddingBottom: theme.geometry.nav.bottomPad,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.uiMedium,
          fontSize: Platform.OS === 'android' ? 9.5 : 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ color }) => <TodayIcon color={color} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: ({ color }) => <CalendarIcon color={color} /> }}
      />
      <Tabs.Screen
        name="projects"
        options={{ title: 'Projects', tabBarIcon: ({ color }) => <ProjectsIcon color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Me', tabBarIcon: ({ color }) => <MeIcon color={color} /> }}
      />
    </Tabs>
  );
}

/** A filled dot inside a ring: the day, and the same mark the logo uses. */
function TodayIcon({ color }: { color: ColorValue }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 19 19" fill="none">
      <Circle cx={9.5} cy={9.5} r={7.5} stroke={color} strokeWidth={1.5} />
      <Circle cx={9.5} cy={9.5} r={2.6} fill={color} />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: ColorValue }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 19 19" fill="none">
      <Rect x={2.5} y={3.75} width={14} height={12.5} rx={2.5} stroke={color} strokeWidth={1.5} />
      <Path d="M2.5 7.75h14" stroke={color} strokeWidth={1.5} />
      <Path d="M6.5 2v3M12.5 2v3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ProjectsIcon({ color }: { color: ColorValue }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 19 19" fill="none">
      <Path
        d="M2.75 5.5h5l1.5 2h7v6.5a1.5 1.5 0 0 1-1.5 1.5h-11a1.5 1.5 0 0 1-1.5-1.5V5.5Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path d="M2.75 5.5V4a1.5 1.5 0 0 1 1.5-1.5h3" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function MeIcon({ color }: { color: ColorValue }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 19 19" fill="none">
      <Circle cx={9.5} cy={6.75} r={3.25} stroke={color} strokeWidth={1.5} />
      <Path
        d="M3.75 16.25c0-2.9 2.58-5 5.75-5s5.75 2.1 5.75 5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
