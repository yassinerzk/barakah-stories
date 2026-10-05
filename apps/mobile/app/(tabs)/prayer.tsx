import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useIsFocused } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  CALC_METHODS,
  formatClock,
  PRAYER_NAMES,
  toLocaleDigits,
  type AlertMode,
  type AlertPrayer,
} from '@barakah/core';
import { useT } from '../../src/i18n';
import { ui } from '../../src/theme';
import { usePrayerStore, useToastStore } from '../../src/store';
import { usePrayerTimes } from '../../src/features/prayer/usePrayerTimes';
import { useHeading } from '../../src/features/prayer/useHeading';
import { QiblaCompass } from '../../src/features/prayer/QiblaCompass';
import { LocationSheet } from '../../src/features/prayer/LocationSheet';
import { PrayerAlertSheet } from '../../src/features/prayer/PrayerAlertSheet';
import { usePrayerAlertStore } from '../../src/notifications/prayerAlertStore';
import { openBatterySettings, openExactAlarmSettings, panelSupported } from '../../modules/prayer-panel';
import { announce, useA11yStore, useScreenReader } from '../../src/a11y';
import { Button, Chip, SectionTitle } from '../../src/components/ui';

const MODE_ICON: Record<AlertMode, keyof typeof Ionicons.glyphMap> = {
  adhan: 'musical-notes',
  sound: 'notifications',
  vibrate: 'phone-portrait',
  off: 'notifications-off',
};
const MODE_KEY = { adhan: 'modeAdhan', sound: 'modeSound', vibrate: 'modeVibrate', off: 'modeOff' } as const;
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

/** Within this many degrees counts as facing the Qibla. */
const QIBLA_TOLERANCE = 5;
/** Must turn this far away again before alignment can re-trigger the buzz and announcement. */
const QIBLA_RELEASE = 9;
/** Minimum gap between spoken directions. */
const VOICE_GAP_MS = 2500;

export default function PrayerScreen() {
  const { t, l, locale, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const toast = useToastStore((s) => s.show);
  const { location, times, next, countdown, qibla } = usePrayerTimes();
  const setLocation = usePrayerStore((s) => s.setLocation);
  const method = usePrayerStore((s) => s.method);
  const setMethod = usePrayerStore((s) => s.setMethod);
  const madhab = usePrayerStore((s) => s.madhab);
  const setMadhab = usePrayerStore((s) => s.setMadhab);
  const [locating, setLocating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [alertFor, setAlertFor] = useState<AlertPrayer | null>(null);
  // The compass runs whenever this tab is on screen and a location is set, so a
  // returning user sees it turning at once. It stops when the tab is left, and it
  // never prompts: without permission it shows the static bearing and a button.
  const focused = useIsFocused();
  const [compassAttempt, setCompassAttempt] = useState(0);
  const heading = useHeading(focused && location !== null, compassAttempt);

  const prefs = usePrayerAlertStore((s) => s.prefs);
  const exactAllowed = usePrayerAlertStore((s) => s.exactAllowed);
  const enableAlerts = usePrayerAlertStore((s) => s.enable);
  const disableAlerts = usePrayerAlertStore((s) => s.disable);
  const setPanel = usePrayerAlertStore((s) => s.setPanel);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast(t('locationDenied'), 'error');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let label = `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;
      if (Platform.OS !== 'web') {
        const places = await Location.reverseGeocodeAsync(pos.coords).catch(() => []);
        const p = places[0];
        if (p) label = [p.city ?? p.subregion ?? p.region, p.country].filter(Boolean).join(', ');
      }
      // No time zone: a position is wherever the phone is, so the phone's own clock applies.
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label });
      setCompassAttempt((n) => n + 1);
    } catch {
      toast(t('locationDenied'), 'error');
    } finally {
      setLocating(false);
    }
  };

  const enableCompass = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') setCompassAttempt((n) => n + 1);
    else toast(t('locationDenied'), 'error');
  };

  const turnOnAlerts = async () => {
    if (!location) {
      toast(t('alertsNeedLocation'), 'error');
      return;
    }
    const outcome = await enableAlerts();
    if (outcome === 'granted') toast(t('alertsOnToast'), 'success');
    else toast(t('alertsBlocked'), 'error');
  };

  const tz = location?.timeZone;
  const guidance = useQiblaGuidance(qibla, heading);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 40, gap: 6 }}>
      <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 24, textAlign }}>
        {t('prayerTimes')}
      </Text>

      {/* location */}
      <SectionTitle>{t('location')}</SectionTitle>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t('changeLocation')}${location ? `, ${location.label}` : ''}`}
        style={{
          flexDirection: row,
          alignItems: 'center',
          gap: 10,
          minHeight: 52,
          paddingHorizontal: 14,
          backgroundColor: ui.bgElev,
          borderRadius: ui.radius,
          borderWidth: 1,
          borderColor: ui.line,
        }}
      >
        <Ionicons name="location" size={20} color={ui.accent} importantForAccessibility="no" />
        <Text style={{ flex: 1, color: location ? ui.text : ui.textMuted, fontFamily: font.medium, fontSize: 16, textAlign }} numberOfLines={1}>
          {location ? location.label : t('chooseCountry')}
        </Text>
        <Text style={{ color: ui.accent, fontFamily: font.semibold }}>{t('changeLocation')}</Text>
      </Pressable>

      {!location ? (
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, textAlign: 'center', paddingVertical: 30 }}>
          {t('noLocation')}
        </Text>
      ) : (
        <>
          {/* next prayer */}
          {next && countdown && (
            <View
              accessible
              accessibilityLabel={`${t('nextPrayer')}: ${l(PRAYER_NAMES.find((p) => p.id === next.id)!.label)}, ${formatClock(next.time, locale, tz)}`}
              style={{ backgroundColor: ui.bgElev2, borderRadius: ui.radius, padding: 16, marginTop: 12, borderWidth: 1, borderColor: ui.line }}
            >
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>{t('nextPrayer')}</Text>
              <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 28 }}>
                  {l(PRAYER_NAMES.find((p) => p.id === next.id)!.label)}
                </Text>
                <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 28, fontVariant: ['tabular-nums'] }}>
                  {formatClock(next.time, locale, tz)}
                </Text>
              </View>
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, textAlign }}>
                {t('inTime')} {toLocaleDigits(countdown.hours, locale)}
                {t('hoursShort')} {toLocaleDigits(countdown.minutes, locale)}
                {t('minutesShort')}
              </Text>
            </View>
          )}

          {/* times, each with its alert */}
          <View style={{ backgroundColor: ui.bgElev, borderRadius: ui.radius, marginTop: 12, borderWidth: 1, borderColor: ui.line, overflow: 'hidden' }}>
            {times.map((tm, i) => {
              const meta = PRAYER_NAMES[i];
              const isNext = next?.id === tm.id;
              const alertPrayer = meta.isPrayer ? (tm.id as AlertPrayer) : null;
              const mode: AlertMode = alertPrayer && prefs.enabled ? prefs.modes[alertPrayer] : 'off';
              return (
                <View
                  key={tm.id}
                  style={{
                    flexDirection: row,
                    alignItems: 'center',
                    paddingVertical: 6,
                    paddingStart: 16,
                    paddingEnd: 4,
                    minHeight: 52,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: ui.line,
                    backgroundColor: isNext ? 'rgba(217,182,92,0.12)' : 'transparent',
                  }}
                >
                  <Text style={{ flex: 1, color: meta.isPrayer ? ui.text : ui.textMuted, fontFamily: isNext ? font.semibold : font.regular, fontSize: 16, textAlign }}>
                    {l(meta.label)}
                  </Text>
                  <Text style={{ color: isNext ? ui.accent : ui.text, fontFamily: font.medium, fontSize: 16, fontVariant: ['tabular-nums'] }}>
                    {formatClock(tm.time, locale, tz)}
                  </Text>
                  {alertPrayer ? (
                    <Pressable
                      onPress={() => (prefs.enabled ? setAlertFor(alertPrayer) : void turnOnAlerts())}
                      accessibilityRole="button"
                      accessibilityLabel={`${l(meta.label)} ${t('alertFor')}: ${t(MODE_KEY[mode])}`}
                      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name={MODE_ICON[mode]} size={20} color={mode === 'off' ? ui.textMuted : ui.accent} />
                    </Pressable>
                  ) : (
                    <View style={{ width: 48 }} />
                  )}
                </View>
              );
            })}
          </View>

          {/* alerts */}
          <SectionTitle>{t('prayerAlerts')}</SectionTitle>
          <View style={{ backgroundColor: ui.bgElev, borderRadius: ui.radius, padding: 16, borderWidth: 1, borderColor: ui.line, gap: 12 }}>
            <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 14, textAlign }}>{t('prayerAlertsDesc')}</Text>
            {prefs.enabled ? (
              <>
                {Platform.OS === 'android' && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15, textAlign }}>{t('exactAlarmTitle')}</Text>
                    <Text style={{ color: exactAllowed ? ui.success : ui.textMuted, fontFamily: font.regular, fontSize: 14, textAlign }}>
                      {exactAllowed ? t('exactAlarmOn') : t('exactAlarmOff')}
                    </Text>
                    {!exactAllowed && <Button label={t('allow')} onPress={() => openExactAlarmSettings()} size="sm" />}
                    <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>{t('batteryHint')}</Text>
                    <Button label={t('batterySettings')} variant="ghost" size="sm" onPress={() => openBatterySettings()} />
                  </View>
                )}
                {panelSupported && (
                  <View style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15, textAlign }}>{t('panelLabel')}</Text>
                      <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>{t('panelDesc')}</Text>
                    </View>
                    <Switch
                      value={prefs.panel}
                      onValueChange={setPanel}
                      accessibilityLabel={t('panelLabel')}
                      trackColor={{ true: ui.accent, false: ui.line }}
                    />
                  </View>
                )}
                <Button label={t('alertsTurnOff')} variant="ghost" onPress={disableAlerts} />
              </>
            ) : (
              <Button label={t('alertsTurnOn')} onPress={turnOnAlerts} />
            )}
          </View>

          {/* qibla */}
          <SectionTitle>{t('qibla')}</SectionTitle>
          {qibla !== null && (
            <View style={{ backgroundColor: ui.bgElev, borderRadius: ui.radius, padding: 16, borderWidth: 1, borderColor: ui.line, gap: 12 }}>
              <View
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${fill(t('qiblaCompassLabel'), { d: toLocaleDigits(Math.round(qibla), locale) })}${guidance ? ` ${guidance}` : ''}`}
              >
                <QiblaCompass qibla={qibla} heading={heading} />
              </View>
              <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 18, textAlign: 'center' }}>
                {toLocaleDigits(Math.round(qibla), locale)}° {t('degreesFromNorth')}
              </Text>
              {/* Alignment in words, not only in the ring's colour. */}
              {guidance && (
                <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 16, textAlign: 'center' }}>{guidance}</Text>
              )}
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign: 'center' }}>
                {heading === null ? t('qiblaStatic') : t('qiblaHint')}
              </Text>
              {heading === null && Platform.OS !== 'web' && (
                <Button label={`🧭 ${t('qibla')}`} onPress={enableCompass} size="sm" />
              )}
            </View>
          )}

          {/* settings */}
          <SectionTitle>{t('method')}</SectionTitle>
          <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
            {CALC_METHODS.map((m) => (
              <Chip key={m.id} label={l(m.label)} active={method === m.id} onPress={() => setMethod(m.id)} />
            ))}
          </View>
          <SectionTitle>{t('madhab')}</SectionTitle>
          <View style={{ flexDirection: row, gap: 8 }}>
            <Chip label={t('shafi')} active={madhab === 'shafi'} onPress={() => setMadhab('shafi')} />
            <Chip label={t('hanafi')} active={madhab === 'hanafi'} onPress={() => setMadhab('hanafi')} />
          </View>
        </>
      )}

      <LocationSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPick={setLocation}
        onUseMyLocation={useMyLocation}
        locating={locating}
      />
      <PrayerAlertSheet prayer={alertFor} onClose={() => setAlertFor(null)} />
    </ScrollView>
  );
}

/**
 * "Turn left 40°" / "You are facing the Qibla", from the live heading. Vibrates
 * once on reaching alignment and, with a screen reader on, speaks a change of
 * direction — throttled, so it guides rather than chatters.
 */
function useQiblaGuidance(qibla: number | null, heading: number | null): string | null {
  const { t, locale } = useT();
  const haptics = useA11yStore((s) => s.haptics);
  const voice = useA11yStore((s) => s.qiblaVoice);
  const screenReader = useScreenReader();
  const wasAligned = useRef(false);
  const lastSpoken = useRef({ text: '', at: 0 });

  let text: string | null = null;
  let aligned = false;
  let released = true;
  if (qibla !== null && heading !== null) {
    const diff = ((qibla - heading + 540) % 360) - 180; // -180..180, positive = turn right
    aligned = Math.abs(diff) <= QIBLA_TOLERANCE;
    released = Math.abs(diff) > QIBLA_RELEASE;
    const deg = toLocaleDigits(Math.round(Math.abs(diff) / 5) * 5, locale);
    text = aligned ? t('qiblaAligned') : fill(t(diff > 0 ? 'qiblaTurnRight' : 'qiblaTurnLeft'), { d: deg });
  }

  useEffect(() => {
    if (aligned && !wasAligned.current) {
      wasAligned.current = true;
      if (haptics && Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    } else if (released) {
      wasAligned.current = false;
    }
  }, [aligned, released, haptics]);

  useEffect(() => {
    if (!text || !voice || !screenReader) return;
    const now = Date.now();
    const changed = text !== lastSpoken.current.text;
    if (changed && now - lastSpoken.current.at > VOICE_GAP_MS) {
      lastSpoken.current = { text, at: now };
      announce(text);
    }
  }, [text, voice, screenReader, aligned]);

  return text;
}
