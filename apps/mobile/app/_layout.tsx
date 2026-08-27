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
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import migrations from '../drizzle/migrations';
import { db } from '@/db/client';
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

  const ready = (fontsLoaded || fontError !== null) && migrated;
  const failure = migrationError ?? fontError;

  useEffect(() => {
    if (ready || failure) void SplashScreen.hideAsync();
  }, [ready, failure]);

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

  if (!ready) return null;

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
          name="gate"
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
