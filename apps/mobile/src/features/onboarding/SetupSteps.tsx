import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  CALC_METHODS,
  computePrayerTimes,
  formatClock,
  PRAYER_NAMES,
  sunArc,
  type AlertMode,
  type CalcMethodId,
  type MadhabId,
} from '@barakah/core';
import { useT } from '../../i18n';
import { ui } from '../../theme';
import type { PrayerLocation } from '../../store';
import { safePause, safePlay } from '../../media/catalog';
import { canScheduleExactAlarms, openExactAlarmSettings } from '../../../modules/prayer-panel';
import { Chip } from '../../components/ui';
import { Actions, GoldButton, OutlineButton, QuietButton, StepTitle } from './OnbChrome';

const GOLD_SOFT = 'rgba(217,182,92,';
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ADHAN_PREVIEW = require('../../../assets/sounds/adhan_full.mp3');

/* ------------------------------ location ------------------------------ */

interface LocationProps {
  locating: boolean;
  onLocate: () => void;
  onChooseCity: () => void;
  onNotNow: () => void;
}

export function LocationStep({ locating, onLocate, onChooseCity, onNotNow }: LocationProps) {
  const { t, font, row, textAlign } = useT();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 28, gap: 16 }}>
        <Globe />
        <StepTitle title={t('onbLocTitle')} center />
        <View
          style={{
            flexDirection: row,
            alignItems: 'flex-start',
            gap: 10,
            backgroundColor: ui.bgElev,
            borderWidth: 1,
            borderColor: `${GOLD_SOFT}0.2)`,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <Ionicons name="lock-closed-outline" size={20} color={ui.accent} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, color: ui.text, fontFamily: font.regular, fontSize: 15, lineHeight: 22, textAlign }}>{t('onbLocPrivacy')}</Text>
        </View>
      </ScrollView>
      <Actions>
        <GoldButton label={t('useMyLocation')} icon="locate" onPress={onLocate} busy={locating} />
        <OutlineButton label={t('onbChooseCity')} icon="search" onPress={onChooseCity} />
        <QuietButton label={t('onbNotNow')} onPress={onNotNow} />
      </Actions>
    </View>
  );
}

function Globe() {
  return (
    <Svg width={280} height={280} viewBox="0 0 340 340" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Defs>
        <RadialGradient id="core" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#1E4A41" />
          <Stop offset="1" stopColor={ui.bg} />
        </RadialGradient>
        <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F6DE97" stopOpacity={0.35} />
          <Stop offset="1" stopColor={ui.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={170} cy={170} r={160} fill="none" stroke={ui.accent} strokeOpacity={0.1} />
      <Circle cx={170} cy={170} r={124} fill="none" stroke={ui.accent} strokeOpacity={0.16} strokeDasharray="2 6" />
      <Circle cx={170} cy={170} r={88} fill="url(#core)" stroke={ui.accent} strokeOpacity={0.35} />
      <G stroke={ui.accent} strokeOpacity={0.18} fill="none">
        <Ellipse cx={170} cy={170} rx={88} ry={30} />
        <Ellipse cx={170} cy={170} rx={30} ry={88} />
        <Line x1={82} y1={170} x2={258} y2={170} />
      </G>
      <Path d="M170 10 L176 24 L190 28 L176 32 L170 46 L164 32 L150 28 L164 24 Z" fill={ui.accent} fillOpacity={0.6} />
      <Circle cx={170} cy={150} r={46} fill="url(#halo)" />
      <Path d="M170 186 C170 186 146 164 146 146 A24 24 0 0 1 194 146 C194 164 170 186 170 186 Z" fill={ui.accent} />
      <Circle cx={170} cy={146} r={9} fill={ui.bg} />
      <Path d="M262 112 L292 98" stroke={ui.text} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="3 4" />
      <Rect x={292} y={84} width={22} height={22} rx={3} fill={ui.text} />
      <Rect x={292} y={89} width={22} height={3} fill={ui.accent} />
    </Svg>
  );
}

/* ------------------------------ calculation ------------------------------ */

interface SettingsProps {
  location: PrayerLocation;
  suggested: boolean;
  method: CalcMethodId;
  madhab: MadhabId;
  onMethod: (m: CalcMethodId) => void;
  onMadhab: (m: MadhabId) => void;
  onNext: () => void;
}

export function SettingsStep({ location, suggested, method, madhab, onMethod, onMadhab, onNext }: SettingsProps) {
  const { t, l, locale, font, row, textAlign } = useT();
  const [picking, setPicking] = useState(false);
  const now = new Date();
  const times = computePrayerTimes(location, now, { method, madhab });
  const current = sunArc(times, now).current;
  const parts = location.label.split(',').map((p) => p.trim());
  const place = parts[0];
  const countryName = parts[parts.length - 1];
  const methodLabel = l(CALC_METHODS.find((m) => m.id === method)!.label);
  const sectionLabel = (k: string) => (
    <Text style={{ color: ui.textMuted, fontFamily: font.medium, fontSize: 13, letterSpacing: 1, marginBottom: 8, marginHorizontal: 4, textAlign }}>
      {k.toLocaleUpperCase(locale)}
    </Text>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 18 }}>
        <View style={{ paddingHorizontal: 4 }}>
          <StepTitle title={t('onbCalcTitle')} body={suggested ? fill(t('onbCalcSuggested'), { country: countryName }) : t('onbCalcDefault')} />
        </View>

        <View>
          {sectionLabel(t('calcLabel'))}
          <Pressable
            onPress={() => setPicking((p) => !p)}
            accessibilityRole="button"
            accessibilityState={{ expanded: picking }}
            accessibilityLabel={`${t('calcLabel')}: ${methodLabel}`}
            style={{
              minHeight: 64,
              borderRadius: 16,
              backgroundColor: ui.bgElev,
              borderWidth: 1,
              borderColor: `${GOLD_SOFT}0.45)`,
              flexDirection: row,
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 14,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${GOLD_SOFT}0.15)`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="globe-outline" size={18} color={ui.accent} />
            </View>
            <Text style={{ flex: 1, color: ui.text, fontFamily: font.semibold, fontSize: 16, textAlign }}>{methodLabel}</Text>
            <Ionicons name={picking ? 'chevron-up' : 'chevron-down'} size={16} color={ui.textMuted} />
          </Pressable>
          {picking && (
            <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {CALC_METHODS.map((m) => (
                <Chip key={m.id} label={l(m.label)} active={m.id === method} onPress={() => onMethod(m.id)} />
              ))}
            </View>
          )}
        </View>

        <View>
          {sectionLabel(t('asrMethod'))}
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: row, gap: 4, padding: 4, borderRadius: 16, backgroundColor: ui.bgElev, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}
          >
            {(['shafi', 'hanafi'] as const).map((m) => {
              const on = m === madhab;
              return (
                <Pressable
                  key={m}
                  onPress={() => onMadhab(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={{ flex: 1, minHeight: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? ui.accent : 'transparent', paddingVertical: 6 }}
                >
                  <Text style={{ color: on ? ui.accentInk : ui.text, fontFamily: font.semibold, fontSize: 16 }}>{t(m)}</Text>
                  <Text style={{ color: on ? ui.accentInk : ui.textMuted, fontFamily: font.regular, fontSize: 12 }}>{t(m === 'shafi' ? 'onbShafiSub' : 'onbHanafiSub')}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: `${GOLD_SOFT}0.5)`, backgroundColor: ui.bgElev, padding: 14 }}>
          <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15 }}>{fill(t('onbTodayIn'), { place })}</Text>
            <View style={{ flexDirection: row, alignItems: 'center', gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ui.accent }} />
              <Text style={{ color: ui.accent, fontFamily: font.regular, fontSize: 12 }}>{t('onbLivePreview')}</Text>
            </View>
          </View>
          <View accessibilityLiveRegion="polite" style={{ flexDirection: row, flexWrap: 'wrap', gap: 6 }}>
            {times.map((tm, i) => {
              const on = tm.id === current;
              return (
                <View
                  key={tm.id}
                  style={{
                    width: '31.5%',
                    alignItems: 'center',
                    gap: 2,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: on ? `${GOLD_SOFT}0.14)` : 'rgba(11,31,28,0.5)',
                    borderWidth: on ? 1 : 0,
                    borderColor: `${GOLD_SOFT}0.5)`,
                  }}
                >
                  <Text style={{ color: on ? ui.accent : ui.textMuted, fontFamily: font.regular, fontSize: 13 }}>{l(PRAYER_NAMES[i].label)}</Text>
                  <Text style={{ color: on ? ui.accent : ui.text, fontFamily: font.semibold, fontSize: 17, fontVariant: ['tabular-nums'] }}>
                    {formatClock(tm.time, locale, location.timeZone)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <Actions>
        <GoldButton label={t('onbContinue')} onPress={onNext} />
      </Actions>
    </View>
  );
}

/* ------------------------------ alerts ------------------------------ */

type ModeKey = 'modeAdhan' | 'modeSound' | 'modeVibrate' | 'modeOff';
type ModeSubKey = 'modeAdhanSub' | 'modeSoundSub' | 'modeVibrateSub' | 'modeOffSub';
const MODES: ReadonlyArray<{ id: AlertMode; icon: keyof typeof Ionicons.glyphMap; key: ModeKey; sub: ModeSubKey }> = [
  { id: 'adhan', icon: 'musical-notes', key: 'modeAdhan', sub: 'modeAdhanSub' },
  { id: 'sound', icon: 'notifications', key: 'modeSound', sub: 'modeSoundSub' },
  { id: 'vibrate', icon: 'phone-portrait', key: 'modeVibrate', sub: 'modeVibrateSub' },
  { id: 'off', icon: 'notifications-off', key: 'modeOff', sub: 'modeOffSub' },
];

interface AlertsProps {
  mode: AlertMode;
  busy: boolean;
  onMode: (m: AlertMode) => void;
  onTurnOn: () => void;
  onNotNow: () => void;
}

export function AlertsStep({ mode, busy, onMode, onTurnOn, onNotNow }: AlertsProps) {
  const { t, font, row, textAlign } = useT();
  const [exactOk, setExactOk] = useState(() => Platform.OS !== 'android' || canScheduleExactAlarms());
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        <View style={{ paddingHorizontal: 4, marginBottom: 8 }}>
          <StepTitle title={t('onbAlertsTitle')} body={t('onbAlertsBody')} />
        </View>
        <View accessibilityRole="radiogroup" style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
          {MODES.map((m) => {
            const on = m.id === mode;
            const color = on ? ui.accent : m.id === 'off' ? ui.textMuted : ui.text;
            return (
              <Pressable
                key={m.id}
                onPress={() => onMode(m.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${t(m.key)}, ${t(m.sub)}`}
                style={{
                  width: '48.8%',
                  minHeight: 96,
                  borderRadius: 16,
                  padding: 14,
                  gap: 6,
                  justifyContent: 'center',
                  backgroundColor: on ? ui.bgElev2 : ui.bgElev,
                  borderWidth: 1,
                  borderColor: on ? ui.accent : 'rgba(255,255,255,0.14)',
                }}
              >
                <Ionicons name={m.icon} size={22} color={color} />
                <Text style={{ color: on ? ui.accent : ui.text, fontFamily: font.semibold, fontSize: 16, textAlign }}>{t(m.key)}</Text>
                <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, textAlign }}>{t(m.sub)}</Text>
                {on && (
                  <View style={{ position: 'absolute', top: 10, end: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark" size={12} color={ui.accentInk} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <AdhanPreview />

        {!exactOk && (
          <View style={{ flexDirection: row, alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: `${GOLD_SOFT}0.45)` }}>
            <Ionicons name="alarm-outline" size={22} color={ui.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15, textAlign }}>{t('onbExactTitle')}</Text>
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, lineHeight: 18, textAlign }}>{t('onbExactBody')}</Text>
            </View>
            <Pressable
              onPress={() => {
                openExactAlarmSettings();
                setExactOk(true);
              }}
              accessibilityRole="button"
              style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: `${GOLD_SOFT}0.7)`, justifyContent: 'center' }}
            >
              <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 14 }}>{t('onbSetUp')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <Actions>
        <GoldButton label={mode === 'off' ? t('onbContinue') : t('alertsTurnOn')} onPress={onTurnOn} busy={busy} />
        {mode !== 'off' && <QuietButton label={t('onbNotNow')} onPress={onNotNow} />}
      </Actions>
    </View>
  );
}

/** Plays the adhan so the choice is heard, not imagined. Stops when the step is left. */
function AdhanPreview() {
  const { t, font, row } = useT();
  const player = useAudioPlayer(ADHAN_PREVIEW);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;
  useEffect(() => () => safePause(player), [player]);
  return (
    <View style={{ flexDirection: row, alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: ui.bgElev, borderWidth: 1, borderColor: `${GOLD_SOFT}0.25)` }}>
      <Pressable
        onPress={() => (playing ? safePause(player) : safePlay(player))}
        accessibilityRole="button"
        accessibilityLabel={t('onbPreviewAdhan')}
        accessibilityState={{ selected: playing }}
        style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={playing ? 'pause' : 'play'} size={20} color={ui.accentInk} />
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15 }}>{t('onbPreviewAdhan')}</Text>
        <View style={{ flexDirection: row, alignItems: 'center', gap: 2, height: 18 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {WAVE.map(([id, h], i) => (
            <View key={id} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: playing || i < 3 ? ui.accent : 'rgba(169,184,177,0.5)' }} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** A decorative waveform: bar id and height. */
const WAVE: ReadonlyArray<[string, number]> = [6, 12, 16, 10, 14, 8, 16, 11, 6, 13, 9, 15, 7, 12].map((h, i) => [`w${i}`, h]);
