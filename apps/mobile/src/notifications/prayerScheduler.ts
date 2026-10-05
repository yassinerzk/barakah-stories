import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  formatClock,
  pick,
  planAlerts,
  planPanel,
  PRAYER_NAMES,
  translate,
  type AlertMode,
  type AlertPrayer,
  type Locale,
  type PrayerAlertPrefs,
  type PrayerSettings,
} from '@barakah/core';
import { clearPanel, setPanel, type PanelEntryInput } from '../../modules/prayer-panel';
import type { PrayerLocation } from '../store';

/**
 * The OS side of prayer alerts. Every alert is a one-shot notification at an
 * absolute instant from `planAlerts`, never a daily hour-and-minute trigger, so
 * it fires at the chosen city's prayer time whatever the phone's own clock says.
 *
 * Local only: nothing is sent anywhere, no push token is requested.
 */

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const PRAYER_PREFIX = 'prayer.';
export const TEST_ALERT_ID = 'prayer-test';

/** The bundled notification clip (under 30 s, as iOS requires). */
const ADHAN_SOUND = 'adhan.wav';

/**
 * Expo Go is Expo's own prebuilt app: config plugins never run for it, so the
 * bundled adhan clip isn't inside it. There, adhan alerts use the system sound
 * instead of logging a missing-sound error on every re-plan. The real build
 * (and a development build) carries the clip.
 */
export const hasBundledSounds = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const channelFor = (mode: Exclude<AlertMode, 'off'>) => CHANNELS[mode === 'adhan' && !hasBundledSounds ? 'sound' : mode];

/**
 * One Android channel per alert style: a channel's sound is fixed when it is
 * created, so switching a prayer from adhan to vibrate means using another
 * channel, not editing this one. The `_v1` suffix is how a sound gets replaced
 * later — a new id, never a mutated channel.
 */
const CHANNELS: Record<Exclude<AlertMode, 'off'>, string> = {
  adhan: 'prayer_adhan_v1',
  sound: 'prayer_sound_v1',
  vibrate: 'prayer_vibrate_v1',
};
const PANEL_DAYS = 4;

// Alerts that arrive while the app is open are still shown and heard.
if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const prayerName = (locale: Locale, id: string) => pick(locale, PRAYER_NAMES.find((p) => p.id === id)!.label);
const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? '');

async function ensureChannels(locale: Locale): Promise<void> {
  if (Platform.OS !== 'android') return;
  const base = translate(locale, 'prayerAlerts');
  if (hasBundledSounds) await Notifications.setNotificationChannelAsync(CHANNELS.adhan, {
    name: `${base} · ${translate(locale, 'modeAdhan')}`,
    importance: Notifications.AndroidImportance.HIGH,
    sound: ADHAN_SOUND,
    vibrationPattern: [0, 300, 200, 300],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.sound, {
    name: `${base} · ${translate(locale, 'modeSound')}`,
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.vibrate, {
    name: `${base} · ${translate(locale, 'modeVibrate')}`,
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    enableVibrate: true,
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

function content(
  locale: Locale,
  prayer: AlertPrayer,
  mode: Exclude<AlertMode, 'off'>,
  at: Date,
  location: PrayerLocation,
  titleOverride?: string,
): Notifications.NotificationContentInput {
  return {
    title: titleOverride ?? fill(translate(locale, 'prayerNotifTitle'), { p: prayerName(locale, prayer) }),
    body: fill(translate(locale, 'prayerNotifBody'), {
      t: formatClock(at, locale, location.timeZone),
      place: location.label,
    }),
    // Android takes the sound from the channel; iOS takes it from here.
    sound: mode === 'adhan' ? (hasBundledSounds ? ADHAN_SOUND : 'default') : mode === 'sound' ? 'default' : false,
    data: { kind: 'prayer', prayer, mode },
    ...(Platform.OS === 'ios' ? { interruptionLevel: 'timeSensitive' as const } : {}),
  };
}

export interface ApplyInput {
  location: PrayerLocation | null;
  settings: PrayerSettings;
  prefs: PrayerAlertPrefs;
  locale: Locale;
  now?: Date;
}

async function cancelPrayerAlerts(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PRAYER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Replaces every scheduled prayer alert, and the panel, with the current plan. */
export async function applyPrayerAlerts({ location, settings, prefs, locale, now = new Date() }: ApplyInput): Promise<number> {
  if (!supported) return 0;
  try {
    await cancelPrayerAlerts();
    applyPanel({ location, settings, prefs, locale, now });
    if (!location || !prefs.enabled) return 0;
    await ensureChannels(locale);
    const plan = planAlerts({ point: location, settings, prefs, now });
    for (const item of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content: content(locale, item.prayer, item.mode, item.at, location),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.at,
          channelId: channelFor(item.mode),
        },
      });
    }
    return plan.length;
  } catch {
    return 0;
  }
}

function applyPanel({ location, settings, prefs, locale, now = new Date() }: ApplyInput): void {
  if (!location || !prefs.enabled || !prefs.panel) {
    clearPanel();
    return;
  }
  const tz = location.timeZone;
  const entries: PanelEntryInput[] = planPanel(location, settings, now, PANEL_DAYS).map((e) => ({
    at: e.at.getTime(),
    countdownTo: e.next.time.getTime(),
    title: fill(translate(locale, 'panelNext'), {
      p: prayerName(locale, e.next.id),
      t: formatClock(e.next.time, locale, tz),
    }),
    body: e.current
      ? fill(translate(locale, 'panelNow'), {
          p: prayerName(locale, e.current.id),
          t: formatClock(e.current.time, locale, tz),
        })
      : location.label,
  }));
  setPanel(entries, translate(locale, 'nextPrayer'));
}

/** A real alert in five seconds, through the same channel the next prayer would use. */
export async function sendTestAlert(
  location: PrayerLocation,
  mode: Exclude<AlertMode, 'off'>,
  locale: Locale,
): Promise<boolean> {
  if (!supported) return false;
  try {
    await ensureChannels(locale);
    await Notifications.scheduleNotificationAsync({
      identifier: TEST_ALERT_ID,
      content: content(locale, 'dhuhr', mode, new Date(), location, translate(locale, 'testNotifTitle')),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: channelFor(mode),
      },
    });
    return true;
  } catch {
    return false;
  }
}
