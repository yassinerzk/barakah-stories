import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { formatClock, PRAYER_NAMES, sunArc } from '@barakah/core';
import { useT } from '../../i18n';
import { ui } from '../../theme';
import { usePrayerTimes } from './usePrayerTimes';
import { Countdown } from './PrayerHero';

const H = 196;
const CX = 195;
const BASE_Y = 300;
const RX = 150;
const RY = 170;

/**
 * Home's window onto the prayer screen: the next prayer with a live countdown
 * over a small version of the day's arc. Tapping anywhere opens the full
 * prayer screen; with no location yet it asks for one instead.
 */
export function HomePrayerCard({ onOpen }: { onOpen: () => void }) {
  const { t, l, locale, font, row } = useT();
  const { location, times, next, now } = usePrayerTimes();
  const rtl = row === 'row-reverse';
  const arc = sunArc(times, now);
  const nameOf = (id: string) => l(PRAYER_NAMES.find((p) => p.id === id)!.label);
  const tz = location?.timeZone;
  const place = location?.label.split(',')[0].trim();
  const at = (t01: number) => ({ x: CX - RX * Math.cos(Math.PI * t01), y: BASE_Y - RY * Math.sin(Math.PI * t01) });
  const sun = at(arc.t);
  const nextLine = next ? `${t('nextPrayer')} · ${nameOf(next.id)} ${formatClock(next.time, locale, tz)}` : t('noLocation');

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={next ? `${nextLine}. ${t('allTimes')}` : t('noLocation')}
      style={({ pressed }) => ({
        height: H,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(217,182,92,0.4)',
        marginTop: 14,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Svg width="100%" height={H} style={{ position: 'absolute' }} viewBox={`0 0 358 ${H}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#05110E" />
            <Stop offset="0.55" stopColor="#0C2520" />
            <Stop offset="1" stopColor="#163F35" />
          </LinearGradient>
          <RadialGradient id="hsun" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFF1C4" />
            <Stop offset="0.3" stopColor="#F6DE97" stopOpacity={0.55} />
            <Stop offset="1" stopColor={ui.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={358} height={H} fill="url(#hsky)" />
        <G fill={ui.text}>
          {/* Kept to the right, clear of the text on the left. */}
          <Circle cx={250} cy={22} r={1} />
          <Circle cx={300} cy={58} r={1.2} />
          <Circle cx={338} cy={24} r={1} />
        </G>
        {location && (
          <G transform={rtl ? 'translate(198 -20) scale(-0.5 0.5)' : 'translate(160 -20) scale(0.5)'}>
            <G fill={ui.accent} fillOpacity={0.22}>
              <Rect x={113} y={226} width={11} height={74} rx={2} />
              <Path d="M113 226 L118.5 206 L124 226 Z" />
              <Rect x={266} y={226} width={11} height={74} rx={2} />
              <Path d="M266 226 L271.5 206 L277 226 Z" />
              <Path d="M154 300 L154 286 Q154 266 195 262 Q236 266 236 286 L236 300 Z" />
              <Rect x={128} y={284} width={134} height={16} rx={2} />
            </G>
            <Path d="M45 300 A150 170 0 0 1 345 300" fill="none" stroke={ui.textMuted} strokeOpacity={0.55} strokeWidth={3} strokeDasharray="4 10" />
            {arc.t > 0 && (
              <Path
                d={`M45 300 A150 170 0 0 1 ${sun.x.toFixed(1)} ${sun.y.toFixed(1)}`}
                fill="none"
                stroke={ui.accent}
                strokeWidth={5}
                strokeLinecap="round"
              />
            )}
            <Circle cx={sun.x} cy={sun.y} r={48} fill="url(#hsun)" opacity={arc.isNight ? 0.5 : 1} />
            <Circle cx={sun.x} cy={sun.y} r={13} fill="#FFF1C4" />
          </G>
        )}
        <Line x1={0} y1={130} x2={358} y2={130} stroke={ui.accent} strokeOpacity={0.3} />
      </Svg>

      <View style={{ position: 'absolute', top: 16, start: 18, end: 18 }}>
        <Text style={{ color: ui.textMuted, fontFamily: font.medium, fontSize: 12, letterSpacing: 1.5 }} numberOfLines={1}>
          {nextLine.toLocaleUpperCase(locale)}
        </Text>
        {next && <Countdown at={next.time} locale={locale} fontFamily={font.semibold} size={40} />}
      </View>
      <View style={{ position: 'absolute', start: 18, end: 18, bottom: 14, flexDirection: row, alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13 }} numberOfLines={1}>
          {place ? `${place}${arc.current ? ` · ${nameOf(arc.current)}` : ''}` : t('chooseCountry')}
        </Text>
        <View style={{ flexDirection: row, alignItems: 'center', gap: 4 }}>
          <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 14 }}>{location ? t('allTimes') : t('useMyLocation')}</Text>
          <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={14} color={ui.text} />
        </View>
      </View>
    </Pressable>
  );
}
