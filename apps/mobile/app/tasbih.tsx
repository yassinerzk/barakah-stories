import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { DHIKR_PRESETS, tallyStats, tagOf, toLocaleDigits } from '@barakah/core';
import { useT } from '../src/i18n';
import { ProGate } from '../src/monetization/ProLock';
import { ui } from '../src/theme';
import { announce, useA11yStore } from '../src/a11y';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useTasbihStore, type TasbihTarget } from '../src/practice/store';

const RING = 240;
const R = 112;
const CIRC = 2 * Math.PI * R;
const TARGETS: readonly TasbihTarget[] = [33, 99, 100];
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

/** A digital tasbih: one big button, a ring that fills to the target, and today's tally. */
function TasbihScreen() {
  const { t, l, locale, font, row } = useT();
  const haptics = useA11yStore((s) => s.haptics);
  const tally = useTasbihStore((s) => s.tally);
  const dhikrId = useTasbihStore((s) => s.dhikrId);
  const target = useTasbihStore((s) => s.target);
  const count = useTasbihStore((s) => s.count);
  const tap = useTasbihStore((s) => s.tap);
  const undo = useTasbihStore((s) => s.undo);
  const reset = useTasbihStore((s) => s.reset);
  const select = useTasbihStore((s) => s.select);
  const setTarget = useTasbihStore((s) => s.setTarget);
  const dhikr = DHIKR_PRESETS.find((p) => p.id === dhikrId) ?? DHIKR_PRESETS[0];
  const stats = tallyStats(tally, new Date());
  const digits = (n: number) => toLocaleDigits(n, locale);
  const big = (n: number) => n.toLocaleString(tagOf(locale));
  const progress = Math.min(1, count / target);

  const onTap = () => {
    const done = tap();
    if (haptics && Platform.OS !== 'web') {
      void (done ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.selectionAsync()).catch(() => undefined);
    }
    if (done) announce(t('targetReached'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScreenHeader title={t('tasbih')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32, alignItems: 'center' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ alignSelf: 'stretch' }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingTop: 4 }}>
          {DHIKR_PRESETS.map((p) => {
            const on = p.id === dhikr.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => select(p.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 14,
                  borderRadius: 22,
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: on ? ui.accent : 'rgba(255,255,255,0.20)',
                  backgroundColor: on ? ui.accent : ui.bgElev,
                }}
              >
                <Text style={{ color: on ? ui.accentInk : ui.text, fontFamily: on ? font.semibold : font.medium, fontSize: 14 }}>{p.transliteration}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 }}>
          <Text style={{ color: ui.text, fontFamily: 'Amiri_400Regular', fontSize: 40, lineHeight: 64, textAlign: 'center' }}>{dhikr.arabic}</Text>
          <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 17 }}>{dhikr.transliteration}</Text>
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 15, marginTop: 2, textAlign: 'center' }}>{l(dhikr.meaning)}</Text>
        </View>

        <View style={{ flexDirection: row, gap: 8, paddingHorizontal: 16, paddingTop: 14, alignSelf: 'stretch' }}>
          {[
            { label: t('today'), value: stats.today, gold: false },
            { label: t('yesterday'), value: stats.yesterday, gold: false },
            { label: t('allTime'), value: stats.allTime, gold: true },
          ].map((s) => (
            <View
              key={s.label}
              accessible
              accessibilityLabel={`${s.label}: ${big(s.value)}`}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, backgroundColor: ui.bgElev, borderWidth: 1, borderColor: 'rgba(217,182,92,0.15)' }}
            >
              <Text style={{ color: s.gold ? ui.accent : ui.text, fontFamily: font.semibold, fontSize: 18, fontVariant: ['tabular-nums'] }}>{big(s.value)}</Text>
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ width: RING, height: RING, marginTop: 18 }}>
          <Svg width={RING} height={RING} style={{ position: 'absolute' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Defs>
              <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#F0D488" />
                <Stop offset="1" stopColor="#9C7F38" />
              </LinearGradient>
              <RadialGradient id="btn" cx="35%" cy="30%" r="75%">
                <Stop offset="0" stopColor="#F6DE97" />
                <Stop offset="0.45" stopColor={ui.accent} />
                <Stop offset="1" stopColor="#A8873C" />
              </RadialGradient>
            </Defs>
            <Circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              fill="none"
              stroke="url(#ring)"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${CIRC * progress} ${CIRC}`}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
            <Circle cx={RING / 2} cy={RING / 2} r={96} fill="url(#btn)" />
          </Svg>
          <Pressable
            onPress={onTap}
            accessibilityRole="button"
            accessibilityLabel={fill(t('tasbihCountA11y'), { n: digits(count), target: digits(target) })}
            style={({ pressed }) => ({
              position: 'absolute',
              left: 24,
              top: 24,
              width: 192,
              height: 192,
              borderRadius: 96,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            {count >= target ? (
              <Ionicons name="checkmark" size={64} color={ui.accentInk} />
            ) : (
              <Text style={{ color: ui.accentInk, fontFamily: font.semibold, fontSize: 64, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{digits(count)}</Text>
            )}
            <Text style={{ color: ui.accentInk, fontFamily: font.semibold, fontSize: 15, marginTop: 2 }}>{fill(t('ofTarget'), { n: digits(target) })}</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingTop: 16, alignSelf: 'stretch' }}>
          <RoundButton icon="arrow-undo" label={t('undo')} onPress={undo} />
          <View
            accessibilityRole="radiogroup"
            style={{ flex: 1, maxWidth: 220, flexDirection: row, gap: 4, padding: 4, borderRadius: 26, backgroundColor: ui.bgElev, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}
          >
            {TARGETS.map((n) => {
              const on = n === target;
              return (
                <Pressable
                  key={n}
                  onPress={() => setTarget(n)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={{ flex: 1, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? ui.accent : 'transparent' }}
                >
                  <Text style={{ color: on ? ui.accentInk : ui.text, fontFamily: font.semibold, fontSize: 15 }}>{digits(n)}</Text>
                </Pressable>
              );
            })}
          </View>
          <RoundButton icon="refresh" label={t('reset')} onPress={reset} />
        </View>
      </ScrollView>
    </View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: ui.lineStrong,
        backgroundColor: pressed ? ui.bgElev2 : ui.bgElev,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Ionicons name={icon} size={20} color={ui.text} />
    </Pressable>
  );
}

/** A Pro tool: free users see how to unlock it. */
export default function TasbihRoute() {
  return (
    <ProGate title="tasbih">
      <TasbihScreen />
    </ProGate>
  );
}
