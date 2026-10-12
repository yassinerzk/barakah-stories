import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useIsFocused } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CALC_METHODS,
  computePrayerTimes,
  distanceToKaabaKm,
  formatClock,
  formatHijri,
  PRAYER_NAMES,
  sunArc,
  tagOf,
  toHijri,
  toLocaleDigits,
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
import { locateMe } from '../../src/features/prayer/locateMe';
import { PrayerHero } from '../../src/features/prayer/PrayerHero';
import { PrayerTimeline } from '../../src/features/prayer/PrayerTimeline';
import { DateSwitcher, PrayerHeader, QiblaSummary, SettingTile, greetingFor } from '../../src/features/prayer/PrayerParts';
import { usePrayerAlertStore } from '../../src/notifications/prayerAlertStore';
import { openBatterySettings, openExactAlarmSettings, panelSupported } from '../../modules/prayer-panel';
import { announce, useA11yStore, useScreenReader } from '../../src/a11y';
import { Button, Chip } from '../../src/components/ui';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

/** Widest the cards under the sky get on a tablet. */
const CONTENT_MAX_W = 720;

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
  const { location, times, next, countdown, qibla, now } = usePrayerTimes();
  const setLocation = usePrayerStore((s) => s.setLocation);
  const method = usePrayerStore((s) => s.method);
  const setMethod = usePrayerStore((s) => s.setMethod);
  const madhab = usePrayerStore((s) => s.madhab);
  const setMadhab = usePrayerStore((s) => s.setMadhab);
  const [locating, setLocating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [alertFor, setAlertFor] = useState<AlertPrayer | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [compassOpen, setCompassOpen] = useState(false);
  const [openSetting, setOpenSetting] = useState<'method' | 'madhab' | null>(null);
  const scroll = useRef<ScrollView>(null);
  const [settingsY, setSettingsY] = useState(0);
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
    const result = await locateMe();
    setLocating(false);
    if (!result.ok) {
      toast(t('locationDenied'), 'error');
      return;
    }
    setLocation(result.location);
    setCompassAttempt((n) => n + 1);
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
  const digits = (n: number) => toLocaleDigits(n, locale);
  const nameOf = (id: string) => l(PRAYER_NAMES.find((p) => p.id === id)!.label);

  // Today drives the arc and countdown; the date switcher only changes the list.
  const arc = sunArc(times, now);
  const day = new Date(now);
  day.setDate(day.getDate() + dayOffset);
  const dayTimes = location && dayOffset !== 0 ? computePrayerTimes(location, day, { method, madhab }) : times;
  const isToday = dayOffset === 0;

  const nextName = next ? nameOf(next.id) : '';
  const nextIn =
    next && countdown
      ? fill(t('nextIn'), { h: digits(countdown.hours), m: digits(countdown.minutes).padStart(2, digits(0)) })
      : null;
  const currentStart = times.find((tm) => tm.id === arc.current)?.time ?? null;
  const nextProgress =
    next && currentStart ? (now.getTime() - currentStart.getTime()) / Math.max(1, next.time.getTime() - currentStart.getTime()) : 0;

  const hijri = toHijri(day);
  const dayTitle = `${isToday ? `${t('today')} · ` : ''}${new Intl.DateTimeFormat(tagOf(locale), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(day)}`;

  const header = (
    <PrayerHeader
      greeting={greetingFor(now.getHours())}
      place={location?.label ?? null}
      topInset={insets.top}
      onPlace={() => setSheetOpen(true)}
      onSettings={() => scroll.current?.scrollTo({ y: settingsY, animated: true })}
    />
  );

  return (
    <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 120 }}>
      {!location ? (
        <>
          <PrayerHero arc={{ ...arc, markers: [] }} labels={{}} next={null} header={header} summary={t('noLocation')} />
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 18, textAlign: 'center' }}>{t('noLocation')}</Text>
            <Button label={t('useMyLocation')} onPress={useMyLocation} />
            <Button label={t('chooseCountry')} variant="ghost" onPress={() => setSheetOpen(true)} />
          </View>
        </>
      ) : (
        <>
          <PrayerHero
            arc={arc}
            labels={Object.fromEntries(times.map((tm) => [tm.id, { name: nameOf(tm.id), time: formatClock(tm.time, locale, tz) }]))}
            next={next ? { id: next.id, name: nextName, time: fill(t('adhanAt'), { time: formatClock(next.time, locale, tz) }), at: next.time } : null}
            header={header}
            summary={next ? `${t('nextPrayer')}: ${nextName}, ${formatClock(next.time, locale, tz)}${nextIn ? `, ${nextIn}` : ''}` : t('prayerTimes')}
          />

          {/* On tablets the cards keep a readable width instead of stretching across the screen. */}
          <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 28, width: '100%', maxWidth: CONTENT_MAX_W, alignSelf: 'center' }}>
            <DateSwitcher
              title={dayTitle}
              hijri={hijri ? formatHijri(hijri, locale) : ''}
              onPrev={() => setDayOffset((d) => d - 1)}
              onNext={() => setDayOffset((d) => d + 1)}
            />

            <PrayerTimeline
              rows={dayTimes.map((tm, i) => {
                const meta = PRAYER_NAMES[i];
                const alertPrayer = meta.isPrayer ? (tm.id as AlertPrayer) : null;
                return {
                  id: tm.id,
                  name: l(meta.label),
                  arabic: locale === 'ar' || locale === 'ur' ? null : (meta.label.ar ?? null),
                  time: formatClock(tm.time, locale, tz),
                  mode: alertPrayer ? (prefs.enabled ? prefs.modes[alertPrayer] : 'off') : null,
                };
              })}
              current={isToday ? arc.current : null}
              next={isToday ? (next?.id ?? null) : null}
              passed={arc.passed}
              nextIn={isToday ? nextIn : null}
              nextProgress={nextProgress}
              onBell={(id) => (prefs.enabled ? setAlertFor(id as AlertPrayer) : void turnOnAlerts())}
            />

            {/* alerts: a single call to action while off, the device settings once on */}
            <View style={{ backgroundColor: ui.bgElev, borderRadius: ui.radius, padding: 16, borderWidth: 1, borderColor: ui.line, gap: 12 }}>
              <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 16, textAlign }}>
                {t('prayerAlerts')}
              </Text>
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
                      <Switch value={prefs.panel} onValueChange={setPanel} accessibilityLabel={t('panelLabel')} trackColor={{ true: ui.accent, false: ui.line }} />
                    </View>
                  )}
                  <Button label={t('alertsTurnOff')} variant="ghost" onPress={disableAlerts} />
                </>
              ) : (
                <Button label={t('alertsTurnOn')} onPress={turnOnAlerts} />
              )}
            </View>

            {qibla !== null && (
              <View style={{ gap: 12 }}>
                <QiblaSummary
                  degrees={`${digits(Math.round(qibla))}°`}
                  bearing={heading === null ? qibla : qibla - heading}
                  distance={fill(t('kmToKaaba'), { km: Math.round(distanceToKaabaKm(location)).toLocaleString(tagOf(locale)) })}
                  open={compassOpen}
                  onToggle={() => setCompassOpen((o) => !o)}
                />
                {compassOpen && (
                  <View style={{ backgroundColor: ui.bgElev, borderRadius: ui.radius, padding: 16, borderWidth: 1, borderColor: ui.line, gap: 12 }}>
                    <View
                      accessible
                      accessibilityRole="image"
                      accessibilityLabel={`${fill(t('qiblaCompassLabel'), { d: digits(Math.round(qibla)) })}${guidance ? ` ${guidance}` : ''}`}
                    >
                      <QiblaCompass qibla={qibla} heading={heading} />
                    </View>
                    {/* Alignment in words, not only in the ring's colour. */}
                    {guidance && <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 16, textAlign: 'center' }}>{guidance}</Text>}
                    <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign: 'center' }}>
                      {heading === null ? t('qiblaStatic') : t('qiblaHint')}
                    </Text>
                    {heading === null && Platform.OS !== 'web' && <Button label={t('openCompass')} onPress={enableCompass} size="sm" />}
                  </View>
                )}
              </View>
            )}

            {/* calculation settings */}
            <View onLayout={(e) => setSettingsY(e.nativeEvent.layout.y)} style={{ gap: 8 }}>
              <View style={{ flexDirection: row, gap: 8 }}>
                <SettingTile
                  label={t('calcLabel')}
                  value={l(CALC_METHODS.find((m) => m.id === method)!.label)}
                  open={openSetting === 'method'}
                  onPress={() => setOpenSetting((o) => (o === 'method' ? null : 'method'))}
                />
                <SettingTile
                  label={t('asrMethod')}
                  value={madhab === 'hanafi' ? t('hanafi') : t('shafi')}
                  open={openSetting === 'madhab'}
                  onPress={() => setOpenSetting((o) => (o === 'madhab' ? null : 'madhab'))}
                />
              </View>
              {openSetting === 'method' && (
                <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
                  {CALC_METHODS.map((m) => (
                    <Chip key={m.id} label={l(m.label)} active={method === m.id} onPress={() => setMethod(m.id)} />
                  ))}
                </View>
              )}
              {openSetting === 'madhab' && (
                <View style={{ flexDirection: row, gap: 8 }}>
                  <Chip label={t('shafi')} active={madhab === 'shafi'} onPress={() => setMadhab('shafi')} />
                  <Chip label={t('hanafi')} active={madhab === 'hanafi'} onPress={() => setMadhab('hanafi')} />
                </View>
              )}
            </View>
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
