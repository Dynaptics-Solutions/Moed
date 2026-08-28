import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notifications, in one place.
 *
 * The rule, settled in `DECISIONS.md`:
 *
 *   One uninvited notification a day — the evening close. Everything else is either a
 *   consequence of something that just happened, or a reminder the user set. Every
 *   notification carries its decision on its face. If it cannot, it is not sent.
 *
 * So this file schedules exactly one thing. Anything else that ever fires from here has
 * to be traceable to a tap the user made, and has to arrive with its actions attached.
 * There is no re-engagement notification and there will not be one.
 */

/** The category the actions hang off. iOS needs it registered before the first send. */
const CLOSE_CATEGORY = 'moed.eveningClose';

/** Identifies the one scheduled notification, so scheduling twice replaces rather than stacks. */
const CLOSE_ID = 'moed.eveningClose.next';

export const CLOSE_ACTION_OPEN = 'moed.eveningClose.open';
export const CLOSE_ACTION_DISMISS = 'moed.eveningClose.dismiss';

/** 19:00, the time the design's lock screen shows it at. Minutes past midnight. */
export const DEFAULT_CLOSE_MINUTES = 19 * 60;

export const CLOSE_TIME_KEY = 'eveningCloseMinutes';
export const CLOSE_ON_KEY = 'eveningCloseOn';

/** Half-hourly, between mid-afternoon and midnight. Earlier than three is not an evening. */
export const CLOSE_STEP = 30;
export const CLOSE_MIN = 15 * 60;
export const CLOSE_MAX = 23 * 60 + 30;

/**
 * Shown while the app is open too.
 *
 * The alternative — suppressing it in the foreground — means someone looking at the day
 * at seven o'clock is the one person who never learns the close exists.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * The two decisions, on the face, exactly as the design draws them.
 *
 * "Not tonight" is a real answer and not a dismissal dressed up as one: the day stays
 * open, nothing is decided for anyone, and nothing fires again tonight.
 */
export async function registerCloseCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(CLOSE_CATEGORY, [
    {
      identifier: CLOSE_ACTION_DISMISS,
      buttonTitle: 'Not tonight',
      options: { opensAppToForeground: false },
    },
    {
      identifier: CLOSE_ACTION_OPEN,
      buttonTitle: 'Close it',
      options: { opensAppToForeground: true },
    },
  ]);

  // Android puts notifications in channels, and one without a channel is silently
  // dropped on newer versions rather than failing loudly.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('evening-close', {
      name: 'Evening close',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: null,
      enableVibrate: false,
    });
  }
}

/**
 * Asked at the moment someone turns the close on, never at launch.
 *
 * A permission prompt on first run asks for something before saying what it is for, and
 * the answer to that question is usually no.
 */
export async function askForPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * What the close says, given what is still open.
 *
 * The count is exact rather than approximate. Records only change from inside the app,
 * so rescheduling whenever the open count changes keeps the figure true — and a
 * notification that guesses at a number is the one thing this product cannot ship.
 */
export function closeCopy(leftovers: number, weekday: string): { title: string; body: string } {
  if (leftovers === 0) {
    return {
      title: `Nothing left. Shut ${weekday}?`,
      body: 'Every record has a decision already. One tap and it is closed.',
    };
  }

  const count = leftovers === 1 ? 'One thing' : `${leftovers} things`;
  return {
    title: `${count} left. Shut the day?`,
    body: `Two minutes. Done, move or drop, and ${weekday} is closed.`,
  };
}

/**
 * Schedule tonight's close, replacing whatever was scheduled before.
 *
 * One notification, not a repeating trigger, because the copy carries a count that is
 * only true for today. A daily repeat would say "3 things left" every night for a year.
 */
export async function scheduleEveningClose(input: {
  atMinutes: number;
  leftovers: number;
  weekday: string;
  now?: Date;
}): Promise<void> {
  await cancelEveningClose();

  const now = input.now ?? new Date();
  const at = new Date(now);
  at.setHours(Math.floor(input.atMinutes / 60), input.atMinutes % 60, 0, 0);

  // Past the hour already: tonight has gone, so the next one is tomorrow's.
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);

  const { title, body } = closeCopy(input.leftovers, input.weekday);

  await Notifications.scheduleNotificationAsync({
    identifier: CLOSE_ID,
    content: {
      title,
      body,
      categoryIdentifier: CLOSE_CATEGORY,
      // No sound. One notification a day does not need to make a noise to be noticed,
      // and the close is an invitation rather than an alarm.
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      channelId: 'evening-close',
    },
  });
}

export async function cancelEveningClose(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(CLOSE_ID).catch(() => {
    // Nothing was scheduled. Cancelling something absent is the normal case on first run.
  });
}
