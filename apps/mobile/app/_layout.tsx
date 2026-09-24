// Imported one weight at a time, deliberately. The barrel export of these packages
// pulls every face into the bundle — all nine Archivo weights and both italic sets,
// about 10 MB of type for the seven faces the design actually uses.
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond/300Light';
import { CormorantGaramond_400Regular } from '@expo-google-fonts/cormorant-garamond/400Regular';
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import migrations from '../drizzle/migrations';
import { db } from '@/db/client';
import { useEveningClose } from '@/lib/eveningClose';
import { CLOSE_ACTION_OPEN, registerCloseCategory } from '@/lib/notifications';
import { Splash } from '@/screens/Splash';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();

  // Bundled with the app, never fetched at runtime — offline is a non-negotiable.
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
  });

  const { success: migrated, error: migrationError } = useMigrations(db, migrations);
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  useEveningClose(today);

  // The actions have to exist before anything carrying them is sent, and registering is
  // cheap and idempotent, so it happens once at the root rather than at the moment
  // someone turns the close on.
  useEffect(() => {
    void registerCloseCategory();
  }, []);

  // "Close it" on the notification's face. It opens the close and nothing else — the app
  // does not decide anything on the way in, and "Not tonight" is handled by not being
  // handled: the day stays open and nothing fires again tonight.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier === CLOSE_ACTION_OPEN) router.push('/close');
    });
    return () => sub.remove();
  }, [router]);

  const ready = (fontsLoaded || fontError !== null) && migrated;
  const failure = migrationError ?? fontError;

  // The moment React has something on screen, not when the planner is ready.
  //
  // The native splash is a static image; it cannot show progress, and while it was held
  // until `ready` it covered precisely the window the designed splash exists to fill —
  // which made that screen unreachable. Handing over as soon as this effect runs is
  // safe, because an effect only runs after the first paint: the JS splash is already
  // drawn underneath. The two are the same mark on the same `--bg`, so the swap is not
  // visible.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  // A failure here means the app has no database or no type. Say what happened and
  // what it means, rather than showing an empty planner that looks like data loss.
  if (failure) {
    return (
      <View style={[styles.failure, { backgroundColor: theme.colors.bg }]}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <Text style={[theme.type.sheetTitle, { color: theme.colors.ink }]}>
          Moed could not start
        </Text>
        <Text style={[theme.type.body, { color: theme.colors.ink2 }]}>
          The local database did not open, so nothing has been read or written. Your data is
          untouched. Reopen the app; if this keeps happening, get in touch.
        </Text>
        <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>{failure.message}</Text>
      </View>
    );
  }

  // The two things that have to happen before a planner can open. The splash draws the
  // fraction rather than an invented one, so the rule finishes exactly when the app does
  // — and on the usual launch, where both are already warm, it is never seen at all.
  if (!ready) {
    const done = (fontsLoaded || fontError !== null ? 1 : 0) + (migrated ? 1 : 0);
    return (
      <>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <Splash progress={done / 2} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        {/* Sheets are routes, not local state — so the back gesture, the Android back
            button and the scrim all dismiss the same way without being wired by hand. */}
        <Stack.Screen
          name="capture"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="detail"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="gate"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="newproject"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
        {['types', 'task', 'routine', 'session', 'errand', 'appt', 'repeat', 'search'].map(
          (name) => (
            <Stack.Screen key={name} name={name} options={{ presentation: 'modal' }} />
          ),
        )}
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  failure: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 34,
  },
});
