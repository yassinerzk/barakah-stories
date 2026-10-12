import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LOCALES, type Locale } from '@barakah/core';
import { useT } from '../../i18n';
import { ui } from '../../theme';
import { Actions, GoldButton, OutlineButton, StepTitle } from './OnbChrome';

const GOLD_SOFT = 'rgba(217,182,92,';
const ENGLISH_NAME: Record<Locale, string> = {
  en: 'English',
  ar: 'Arabic · RTL',
  fr: 'French',
  id: 'Indonesian',
  ms: 'Malay',
  th: 'Thai',
  ur: 'Urdu · RTL',
};

/* ------------------------------ 1 · language ------------------------------ */

export function LanguageStep({ locale, onPick, onNext }: { locale: Locale; onPick: (l: Locale) => void; onNext: () => void }) {
  const { t, font, row } = useT();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
        <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 12 }}>
          <Emblem />
          <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 26, marginTop: 4 }}>بركة</Text>
          <Text style={{ color: ui.textMuted, fontFamily: font.medium, fontSize: 13, letterSpacing: 3 }}>BARAKAH STORIES</Text>
          <View style={{ height: 18 }} />
          <StepTitle title={t('onbChooseLanguage')} center />
        </View>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {LOCALES.map((l) => {
            const on = l.id === locale;
            return (
              <Pressable
                key={l.id}
                onPress={() => onPick(l.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={l.label}
                style={({ pressed }) => ({
                  minHeight: 58,
                  flexDirection: row,
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: on ? ui.accent : 'rgba(255,255,255,0.14)',
                  backgroundColor: on || pressed ? ui.bgElev2 : ui.bgElev,
                })}
              >
                {on ? (
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark" size={14} color={ui.accentInk} />
                  </View>
                ) : (
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: ui.lineStrong }} />
                )}
                <Text style={{ flex: 1, color: ui.text, fontSize: 17, fontFamily: on ? font.semibold : font.medium, textAlign: row === 'row' ? 'left' : 'right' }}>{l.label}</Text>
                <Text style={{ color: on ? ui.accent : ui.textMuted, fontFamily: font.regular, fontSize: 13 }}>{on ? t('onbSelected') : ENGLISH_NAME[l.id]}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <Actions>
        <GoldButton label={t('onbContinue')} onPress={onNext} />
      </Actions>
    </View>
  );
}

/** Crescent inside an eight-point star: the mark at the top of the first step. */
function Emblem() {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Path d="M32 4 L38 22 L56 26 L42 38 L46 58 L32 48 L18 58 L22 38 L8 26 L26 22 Z" fill="none" stroke={ui.accent} strokeWidth={1.2} opacity={0.6} />
      <Path d="M40 20 A16 16 0 1 1 24 44 A13 13 0 1 0 40 20 Z" fill="#F6DE97" />
    </Svg>
  );
}

/* ------------------------------ 2 · welcome ------------------------------ */

const CARDS = [
  { title: 'onbW1Title', body: 'onbW1Body', art: 'card' },
  { title: 'onbW2Title', body: 'onbW2Body', art: 'arc' },
  { title: 'onbW3Title', body: 'onbW3Body', art: 'book' },
] as const;

/** Three swipeable cards. "Next" pages through them, then moves on. */
export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { t, row } = useT();
  const { width } = useWindowDimensions();
  const pageW = Math.min(width, 560);
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW));
  const next = () => {
    if (page < CARDS.length - 1) {
      pager.current?.scrollTo({ x: (page + 1) * pageW, animated: true });
      setPage(page + 1);
    } else onNext();
  };
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          style={{ width: pageW, flexGrow: 0 }}
        >
          {CARDS.map((c, i) => (
            <View
              key={c.title}
              style={{ width: pageW, paddingHorizontal: 28, paddingTop: 8, alignItems: 'center', gap: 18 }}
              accessibilityElementsHidden={i !== page}
              importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}
            >
              <Showcase art={c.art} />
              <StepTitle title={t(c.title)} body={t(c.body)} center />
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: row, gap: 6, marginTop: 14 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {CARDS.map((c, i) => (
            <View key={c.title} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? ui.text : 'rgba(255,255,255,0.25)' }} />
          ))}
        </View>
      </View>
      <Actions>
        <GoldButton label={t('onbNext')} onPress={next} />
      </Actions>
    </View>
  );
}

/** A small framed picture for each welcome card, in the app's own palette. */
function Showcase({ art }: { art: 'card' | 'arc' | 'book' }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: 240, height: 300, borderRadius: 26, borderWidth: 1, borderColor: `${GOLD_SOFT}0.6)`, overflow: 'hidden', backgroundColor: '#0C2520' }}
    >
      <Svg width={240} height={300} viewBox="0 0 240 300">
        <Defs>
          <Pattern id="gw" width={34} height={34} patternUnits="userSpaceOnUse">
            <Path d="M17 3 L21 13 L31 17 L21 21 L17 31 L13 21 L3 17 L13 13 Z" fill="none" stroke={ui.accent} strokeWidth={0.6} />
          </Pattern>
          <RadialGradient id="mg" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#F6DE97" stopOpacity={0.4} />
            <Stop offset="1" stopColor={ui.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={240} height={300} fill="url(#gw)" opacity={0.08} />
        <Rect x={12} y={12} width={216} height={276} rx={16} fill="none" stroke={ui.accent} strokeOpacity={0.4} />
        {art === 'card' && (
          <>
            <Circle cx={172} cy={64} r={40} fill="url(#mg)" />
            <Path d="M180 52 A16 16 0 1 1 164 76 A13 13 0 1 0 180 52 Z" fill="#FFF1C4" />
            <G fill={ui.accent} fillOpacity={0.22}>
              <Rect x={54} y={226} width={8} height={50} />
              <Path d="M54 226 L58 212 L62 226 Z" />
              <Rect x={178} y={226} width={8} height={50} />
              <Path d="M178 226 L182 212 L186 226 Z" />
              <Path d="M86 276 L86 258 Q86 236 120 232 Q154 236 154 258 L154 276 Z" />
            </G>
            <Line x1={0} y1={276} x2={240} y2={276} stroke={ui.accent} strokeOpacity={0.4} />
          </>
        )}
        {art === 'arc' && (
          <>
            <Line x1={20} y1={220} x2={220} y2={220} stroke={ui.accent} strokeOpacity={0.4} />
            <Path d="M40 220 A80 110 0 0 1 200 220" fill="none" stroke={ui.textMuted} strokeOpacity={0.5} strokeDasharray="2 6" />
            <Path d="M40 220 A80 110 0 0 1 150 120" fill="none" stroke={ui.accent} strokeWidth={3} strokeLinecap="round" />
            <Circle cx={150} cy={120} r={26} fill="url(#mg)" />
            <Circle cx={150} cy={120} r={7} fill="#FFF1C4" />
            {ARC_DOTS.map(([x, y], i) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r={4} fill={i < 3 ? ui.accent : ui.bg} stroke={i < 3 ? ui.accent : ui.textMuted} />
            ))}
          </>
        )}
        {art === 'book' && (
          <>
            <Circle cx={120} cy={130} r={70} fill="url(#mg)" />
            <Path d="M120 100 C100 88 72 86 52 92 L52 196 C72 190 100 192 120 204 Z" fill="none" stroke={ui.accent} strokeWidth={2} />
            <Path d="M120 100 C140 88 168 86 188 92 L188 196 C168 190 140 192 120 204 Z" fill="none" stroke={ui.accent} strokeWidth={2} />
            <Line x1={120} y1={100} x2={120} y2={204} stroke={ui.accent} strokeWidth={2} />
          </>
        )}
      </Svg>
      {art === 'card' && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 96, alignItems: 'center', gap: 10, paddingHorizontal: 20 }}>
          <Text style={{ color: ui.text, fontFamily: 'Amiri_400Regular', fontSize: 26, lineHeight: 44 }}>فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا</Text>
          <Text style={{ color: ui.accent, fontSize: 11, letterSpacing: 1.5 }}>94:5</Text>
        </View>
      )}
      {art === 'book' && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 230, alignItems: 'center' }}>
          <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 28 }}>ٱقْرَأْ</Text>
        </View>
      )}
    </View>
  );
}

const ARC_DOTS: ReadonlyArray<[number, number]> = [
  [40, 220],
  [52, 178],
  [120, 110],
  [175, 140],
  [196, 190],
  [200, 220],
];

/* ------------------------------ last · ready ------------------------------ */

export function ReadyStep({ chips, onFirstCard, onPrayer }: { chips: string[]; onFirstCard: () => void; onPrayer: () => void }) {
  const { t, font, row } = useT();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 28, paddingTop: 24, gap: 10 }}>
        <Svg width={220} height={220} viewBox="-110 -110 220 220" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Defs>
            <RadialGradient id="rg" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#F6DE97" stopOpacity={0.45} />
              <Stop offset="0.5" stopColor={ui.accent} stopOpacity={0.1} />
              <Stop offset="1" stopColor={ui.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle r={110} fill="url(#rg)" />
          <Rect x={-70} y={-70} width={140} height={140} fill="none" stroke={ui.accent} strokeWidth={1.5} />
          <Rect x={-70} y={-70} width={140} height={140} fill="none" stroke={ui.accent} strokeWidth={1.5} transform="rotate(45)" />
          <Circle r={58} fill={ui.bg} stroke={ui.accent} strokeOpacity={0.5} />
          <Path d="M-18 2 L-5 15 L22 -14" fill="none" stroke="#F6DE97" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 26 }}>بارك الله فيك</Text>
        <StepTitle title={t('onbReadyTitle')} body={t('onbReadyBody')} center />
        <View style={{ flexDirection: row, flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 6 }}>
          {chips.map((c) => (
            <View
              key={c}
              style={{ flexDirection: row, alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: ui.bgElev, borderWidth: 1, borderColor: `${GOLD_SOFT}0.3)` }}
            >
              <Ionicons name="checkmark" size={13} color={ui.accent} />
              <Text style={{ color: ui.text, fontFamily: font.regular, fontSize: 13 }}>{c}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <Actions>
        <GoldButton label={t('onbFirstCard')} icon="add" onPress={onFirstCard} />
        <OutlineButton label={t('onbGoPrayer')} onPress={onPrayer} />
      </Actions>
    </View>
  );
}
