import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { DHIKR_PRESETS, formatClock, pick, PRAYER_NAMES, toLocaleDigits } from '@barakah/core';
import { useT } from '../i18n';
import { ui } from '../theme';
import { usePrayerTimes } from '../features/prayer/usePrayerTimes';
import { Countdown } from '../features/prayer/PrayerHero';
import { useTasbihStore } from '../practice/store';

/*
 * In-app pictures of the two home-screen widgets, drawn to match the native
 * layouts in modules/widgets/android/src/main/res/layout (and the WidgetKit
 * views in targets/widget) and filled with the person's own data, so what
 * they see here is what lands on their home screen.
 */

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

/** The widgets' own shell: the dark green gradient with a thin gold edge. */
function Shell({ children, style }: { children: React.ReactNode; style: object }) {
  const id = `wbg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[{ borderRadius: 24, borderWidth: 1, borderColor: 'rgba(217,182,92,0.45)', overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#12302B" />
            <Stop offset="1" stopColor="#0B1F1C" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}

/** The 4×2 prayer timer: live countdown to the next prayer and the day's six times. */
export function PrayerWidgetPreview({ width }: { width: number }) {
  const { t, locale, font, row } = useT();
  const { location, times, next } = usePrayerTimes();
  const nameOf = (id: string) => pick(locale, PRAYER_NAMES.find((n) => n.id === id)?.label ?? { en: id });
  const clock = (d: Date) => formatClock(d, locale, location?.timeZone);
  const label = next ? `${t('nextPrayer')} · ${nameOf(next.id)}` : t('nextPrayer');
  const place = location?.label.split(',')[0].trim();
  const shown = times.filter((p) => Number.isFinite(p.time.getTime()));
  return (
    <Shell style={{ width, padding: 14 }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={fill(t('widgetPreviewA11y'), { name: t('widgetPrayerTitle') })}
      >
        <View style={{ flexDirection: row, alignItems: 'flex-start', gap: 8 }}>
          {/* The countdown sits under its label on the reading side, in Arabic and Urdu too. */}
          <View style={{ flex: 1, alignItems: row === 'row' ? 'flex-start' : 'flex-end' }}>
            <Text numberOfLines={1} style={{ color: ui.textMuted, fontFamily: font.medium, fontSize: 11, letterSpacing: 1 }}>
              {label.toLocaleUpperCase(locale)}
            </Text>
            {next ? (
              <Countdown at={next.time} locale={locale} fontFamily={font.semibold} size={30} />
            ) : (
              <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 30 }}>–:––</Text>
            )}
          </View>
          <View style={{ alignItems: row === 'row' ? 'flex-end' : 'flex-start', maxWidth: '45%' }}>
            {next && <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 17 }}>{clock(next.time)}</Text>}
            <Text numberOfLines={2} style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 11, textAlign: row === 'row' ? 'right' : 'left' }}>
              {place ?? t('widgetSetUp')}
            </Text>
          </View>
        </View>
        {shown.length > 0 && (
          <View style={{ flexDirection: row, marginTop: 10 }}>
            {shown.map((p) => {
              const on = p.id === next?.id;
              return (
                <View key={p.id} style={{ flex: 1, alignItems: 'center', borderRadius: 8, paddingVertical: 3, backgroundColor: on ? 'rgba(217,182,92,0.18)' : 'transparent' }}>
                  <Text numberOfLines={1} style={{ color: on ? ui.accent : ui.textMuted, fontFamily: on ? font.semibold : font.regular, fontSize: 10 }}>
                    {nameOf(p.id)}
                  </Text>
                  <Text numberOfLines={1} style={{ color: on ? ui.accent : ui.text, fontFamily: on ? font.semibold : font.regular, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                    {clock(p.time)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Shell>
  );
}

/** The 2×2 dhikr counter: the current dhikr and this round's count, as the widget shows it. */
export function DhikrWidgetPreview({ size }: { size: number }) {
  const { t, locale, font } = useT();
  const dhikrId = useTasbihStore((s) => s.dhikrId);
  const count = useTasbihStore((s) => s.count);
  const target = useTasbihStore((s) => s.target);
  const preset = DHIKR_PRESETS.find((p) => p.id === dhikrId) ?? DHIKR_PRESETS[0];
  const digits = (n: number) => toLocaleDigits(n, locale);
  const tally = count >= target ? `✓ ${digits(target)}` : `${digits(count)} / ${digits(target)}`;
  return (
    <Shell style={{ width: size, height: size }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={fill(t('widgetPreviewA11y'), { name: t('widgetDhikrTitle') })}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 }}
      >
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: ui.text, fontFamily: 'Amiri_400Regular', fontSize: 20 }}>
          {preset.arabic}
        </Text>
        <View style={{ borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: ui.accent }}>
          <Text style={{ color: ui.accentInk, fontFamily: font.semibold, fontSize: 18, fontVariant: ['tabular-nums'] }}>{tally}</Text>
        </View>
        <Text numberOfLines={1} style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 11 }}>
          {preset.transliteration}
        </Text>
      </View>
    </Shell>
  );
}
