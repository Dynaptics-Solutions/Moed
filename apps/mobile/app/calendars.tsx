import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toggle } from '@/components/Field';
import {
  WINDOW_BACK_DAYS,
  WINDOW_FORWARD_DAYS,
  askForCalendarPermission,
  exportToCalendar,
  importCalendar,
  listCalendars,
  setConnectedCalendar,
  setWriteOut,
  useConnectedCalendarId,
  useWriteOut,
  withdrawFromCalendar,
  type PhoneCalendar,
} from '@/db/calendar';
import { useTheme } from '@/theme';

/**
 * `calendars` — not in the design set, and built to the patterns around it.
 *
 * The package lists calendar connect as part of the first-run set, which was never
 * designed (`REQUIREMENTS-REVIEW.md`). So this is a decision rather than a recreation,
 * like the tray and the project sheet before it, and it is deliberately the plainest
 * thing that keeps the promises the rest of the product makes.
 *
 * One list of the phone's calendars, one tap to connect, one switch for whether Moed
 * writes back. No preview, no per-event choosing, no rules. Free is one calendar, so a
 * picker offering multi-select would be a control whose second use is behind a paywall.
 *
 * The two directions are separated because they are not equally consequential. Reading
 * a calendar changes what Moed shows; writing to one changes what other people see.
 * The first happens on connect, the second only once it is switched on, and turning it
 * off takes back everything it put there.
 */
export default function Calendars() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const connectedId = useConnectedCalendarId();
  const writeOut = useWriteOut();

  const [calendars, setCalendars] = useState<PhoneCalendar[] | null>(null);
  const [denied, setDenied] = useState(false);
  const [result, setResult] = useState<{ key: string; changed: number; failed?: boolean } | null>(
    null,
  );

  // Permission is asked for here rather than at launch, and the answer decides whether
  // there is a list to show at all. Resolved through a promise chain rather than an
  // async effect body so the state lands in a callback: setting it straight from an
  // effect is what makes a render cascade.
  useEffect(() => {
    let live = true;

    askForCalendarPermission()
      .then(async (granted) => {
        const found = granted ? await listCalendars() : [];
        if (!live) return;
        setDenied(!granted);
        setCalendars(found);
      })
      .catch(() => {
        if (live) setCalendars([]);
      });

    return () => {
      live = false;
    };
  }, []);

  /**
   * Reading is what a connected calendar is for, so it runs whenever this screen is
   * opened rather than waiting to be asked. Writing does not: it is off until switched
   * on, and then it follows the same sync.
   */
  /**
   * Reading is what a connected calendar is for, so it runs whenever this screen is
   * opened rather than waiting to be asked. Writing does not: it stays off until it is
   * switched on, and then it follows the same pass.
   *
   * "Reading…" is derived from whether a result has come back for the current calendar
   * rather than set when the pass starts. Setting it in the effect body is a cascading
   * render, and the derived form cannot get stuck on either.
   */
  const passKey = `${connectedId}|${writeOut}`;
  const reading = connectedId !== '' && result?.key !== passKey;

  useEffect(() => {
    if (connectedId === '') return;
    let live = true;

    importCalendar(connectedId)
      .then(async (touched) => {
        if (writeOut) await exportToCalendar(connectedId);
        return touched;
      })
      .then((touched) => {
        if (live) setResult({ key: passKey, changed: touched });
      })
      .catch(() => {
        if (live) setResult({ key: passKey, changed: 0, failed: true });
      });

    return () => {
      live = false;
    };
  }, [connectedId, writeOut, passKey]);

  const connect = async (calendar: PhoneCalendar) => {
    // Tapping the connected one disconnects. Anything already mirrored in stays: it is
    // on the days it happened on, and nothing disappears.
    if (connectedId === calendar.id) {
      if (writeOut) await withdrawFromCalendar();
      await setWriteOut(false);
      await setConnectedCalendar('');
      setResult(null);
      return;
    }

    await setConnectedCalendar(calendar.id);
  };

  const toggleWriteOut = async () => {
    // Turning it off takes back every event this app put there. Leaving them behind
    // would be a pile of rows in someone's calendar that Moed no longer knows about and
    // they never chose to keep.
    if (writeOut) {
      await withdrawFromCalendar();
      await setWriteOut(false);
      return;
    }

    await setWriteOut(true);
  };

  const connected = (calendars ?? []).find((c) => c.id === connectedId);

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 20 }]}
    >
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>‹ Me</Text>
      </Pressable>

      <Text style={[theme.type.sectionLabel, styles.label, { color: theme.colors.taupe }]}>
        Calendars
      </Text>
      <Text style={[theme.type.screenTitle, styles.headline, { color: theme.colors.ink }]}>
        One calendar,{'\n'}in and out
      </Text>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {denied ? (
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>
            Calendar access is turned off for Moed in your phone&apos;s settings. Turn it on there
            and this will start working.
          </Text>
        ) : calendars === null ? (
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink3 }]}>Looking…</Text>
        ) : calendars.length === 0 ? (
          <Text style={[theme.type.bodySmall, { color: theme.colors.ink2 }]}>
            This phone has no calendars on it yet. Add one in the Calendar app and it will appear
            here.
          </Text>
        ) : (
          calendars.map((calendar, i) => {
            const isConnected = calendar.id === connectedId;

            return (
              <Pressable
                key={calendar.id}
                onPress={() => void connect(calendar)}
                accessibilityRole="button"
                style={[
                  styles.row,
                  i > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.line2 },
                ]}
              >
                <View style={styles.rowBody}>
                  <Text
                    style={[
                      theme.type.rowTitle,
                      { color: isConnected ? theme.colors.acc : theme.colors.ink },
                    ]}
                  >
                    {calendar.title}
                  </Text>
                  {calendar.source !== '' && (
                    <Text style={[theme.type.meta, styles.source, { color: theme.colors.ink3 }]}>
                      {calendar.source}
                    </Text>
                  )}
                </View>
                <Text style={[theme.type.meta, { color: theme.colors.ink3 }]}>
                  {isConnected ? 'Connected' : ''}
                </Text>
              </Pressable>
            );
          })
        )}

        {connected && (
          <View style={styles.connected}>
            <View style={styles.outRow}>
              <View style={styles.rowBody}>
                <Text style={[theme.type.rowTitle, { color: theme.colors.ink }]}>
                  Put Moed&apos;s records in it
                </Text>
                <Text style={[theme.type.meta, styles.source, { color: theme.colors.ink3 }]}>
                  {writeOut
                    ? 'Tasks, routines, sessions and errands appear in ' + connected.title + '.'
                    : 'Off. Nothing of yours is written to this calendar.'}
                </Text>
              </View>
              <Toggle
                on={writeOut}
                onPress={() => void toggleWriteOut()}
                label="Put Moed's records in it"
              />
            </View>

            <Text style={[theme.type.meta, styles.note, { color: theme.colors.ink3 }]}>
              {reading
                ? 'Reading the calendar…'
                : result?.failed === true
                  ? 'That calendar could not be read just now. Nothing has been changed, and it can be tried again.'
                  : result === null
                    ? `${WINDOW_BACK_DAYS} days back and ${WINDOW_FORWARD_DAYS} forward, read whenever this screen is opened.`
                    : result.changed === 0
                      ? 'Up to date. Nothing has changed since the last read.'
                      : `${result.changed} ${result.changed === 1 ? 'appointment' : 'appointments'} added, changed or withdrawn.`}
            </Text>

            <Text style={[theme.type.meta, styles.note, { color: theme.colors.ink3 }]}>
              An imported appointment is fixed time: it spends the day whether or not you chose it,
              and it is edited in the calendar it came from. All-day events are left out — they are
              a label on the date rather than hours, and importing one as a whole day would put that
              day past its limit for good.
            </Text>
          </View>
        )}
      </ScrollView>

      <Text
        style={[
          theme.type.meta,
          { color: theme.colors.ink3, paddingBottom: insets.bottom + 18, paddingTop: 10 },
        ]}
      >
        One calendar is free. More arrive with the paid plan.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  label: { marginTop: 18 },
  headline: { marginTop: 7 },
  body: { flex: 1, marginTop: 20 },
  bodyContent: { paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBody: { flex: 1 },
  source: { marginTop: 3 },
  connected: { marginTop: 24, gap: 14 },
  outRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { lineHeight: 17 },
});
