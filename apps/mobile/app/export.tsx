import { exportFilename, exportSummary } from '@moed/core';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TABLE_NAMES, readEverything } from '@/db/exportData';
import { useTheme } from '@/theme';

/**
 * `export` — not in the design set, and built to the patterns around it.
 *
 * It exists because non-negotiable 9 says export is never gated and a lapsed
 * subscription makes data read-only rather than hidden. Settings has carried the line
 * "Export is never behind the paywall" since it was written, with nothing behind it.
 * A promise printed on the screen where someone would look for the feature, and no
 * feature.
 *
 * Nothing here reads a plan. There is no entitlement check to get wrong later, which
 * is the only way a promise like that holds structurally rather than by remembering.
 *
 * It says what is in the file before it hands it over. This is the one screen in the
 * app that produces something which leaves the device, and it includes the health
 * tables — sleep, workouts and weight, which are local-only everywhere else — so what
 * is being shared has to be readable in advance rather than discovered afterwards.
 */
export default function Export() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [state, setState] = useState<'ready' | 'working' | 'failed'>('ready');

  useEffect(() => {
    let live = true;
    // Counted up front so the sentence is true before anything is written, rather than
    // a spinner that reports what happened after it happened.
    void readEverything(Date.now()).then((envelope) => {
      if (live) setCounts(envelope.counts);
    });
    return () => {
      live = false;
    };
  }, []);

  const total = counts ? Object.values(counts).reduce((n, c) => n + c, 0) : 0;

  const share = async () => {
    setState('working');
    try {
      const at = Date.now();
      const envelope = await readEverything(at);

      // The cache directory, because the file the user keeps is the one the share sheet
      // puts somewhere. Leaving a second copy in the app's documents would be a private
      // pile of exports nobody asked for and nothing ever clears.
      const file = new File(Paths.cache, exportFilename(at));
      file.create({ overwrite: true });
      file.write(JSON.stringify(envelope, null, 2));

      // A file rather than a block of text: an export is something to keep, and a share
      // sheet full of JSON is not something anyone can put anywhere.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export',
          UTI: 'public.json',
        });
        setState('ready');
      } else {
        setState('failed');
      }
    } catch {
      setState('failed');
    }
  };

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>‹ Me</Text>
      </Pressable>

      <Text style={[theme.type.sectionLabel, styles.label, { color: theme.colors.taupe }]}>
        Export
      </Text>
      <Text style={[theme.type.screenTitle, styles.headline, { color: theme.colors.ink }]}>
        Everything,{'\n'}as one file
      </Text>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>
          {counts === null ? 'Counting…' : exportSummary(counts, TABLE_NAMES)}
        </Text>

        <Text style={[theme.type.bodySmall, styles.para, { color: theme.colors.ink2 }]}>
          JSON, readable by anything. It includes what was dropped, what is waiting in the tray, and
          what was deleted — nothing disappears, and an export that tidied those away would be the
          same erasure in a file.
        </Text>

        <Text style={[theme.type.bodySmall, styles.para, { color: theme.colors.ink2 }]}>
          Sleep, workouts and weight stay on this device everywhere else in the app. They are in
          this file, so it is worth knowing where you are sending it.
        </Text>

        {state === 'failed' && (
          <Text style={[theme.type.bodySmall, styles.para, { color: theme.colors.ink2 }]}>
            That did not go anywhere. Nothing was changed, and it can be tried again.
          </Text>
        )}
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 18 }}>
        <Text style={[theme.type.meta, styles.free, { color: theme.colors.ink3 }]}>
          Export is never behind the paywall.
        </Text>
        <Button
          label={state === 'working' ? 'Writing the file…' : 'Export'}
          onPress={() => void share()}
          disabled={state === 'working' || total === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  label: { marginTop: 18 },
  headline: { marginTop: 7 },
  body: { flex: 1, marginTop: 20 },
  para: { marginTop: 14, lineHeight: 20 },
  free: { marginBottom: 10 },
});
