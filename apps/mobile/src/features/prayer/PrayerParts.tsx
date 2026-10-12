import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../i18n';
import { ui } from '../../theme';

const GOLD_SOFT = 'rgba(217,182,92,';

/** Arabic greetings shown beside the greeting when the app is in another language. */
const ARABIC_GREETING = { greetMorning: 'صباح الخير', greetAfternoon: 'مساء الخير', greetEvening: 'مساء الخير', greetNight: 'ليلة طيبة' } as const;
export type GreetingKey = keyof typeof ARABIC_GREETING;

export function greetingFor(hour: number): GreetingKey {
  if (hour >= 4 && hour < 12) return 'greetMorning';
  if (hour >= 12 && hour < 17) return 'greetAfternoon';
  if (hour >= 17 && hour < 21) return 'greetEvening';
  return 'greetNight';
}

interface HeaderProps {
  greeting: GreetingKey;
  place: string | null;
  topInset: number;
  onPlace: () => void;
  onSettings: () => void;
}

/** Greeting, the place the times are for (tap to change), and the settings button. */
export function PrayerHeader({ greeting, place, topInset, onPlace, onSettings }: HeaderProps) {
  const { t, locale, font, row } = useT();
  const showArabic = locale !== 'ar' && locale !== 'ur';
  return (
    <View style={{ paddingTop: topInset + 12, paddingHorizontal: 16, flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: row, alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 20 }}>
            {t(greeting)}
          </Text>
          {showArabic && <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 18 }}>{ARABIC_GREETING[greeting]}</Text>}
        </View>
        <Pressable
          onPress={onPlace}
          accessibilityRole="button"
          accessibilityLabel={`${t('changeLocation')}${place ? `, ${place}` : ''}`}
          style={{ flexDirection: row, alignItems: 'center', gap: 6, minHeight: 48, alignSelf: 'flex-start' }}
        >
          <Ionicons name="location-outline" size={16} color={ui.accent} />
          <Text
            numberOfLines={1}
            style={{
              color: place ? ui.text : ui.textMuted,
              fontFamily: font.medium,
              fontSize: 15,
              textDecorationLine: 'underline',
              textDecorationColor: `${GOLD_SOFT}0.5)`,
            }}
          >
            {place ?? t('chooseCountry')}
          </Text>
          <Ionicons name="chevron-down" size={14} color={ui.textMuted} />
        </Pressable>
      </View>
      <Pressable
        onPress={onSettings}
        accessibilityRole="button"
        accessibilityLabel={t('method')}
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: ui.lineStrong,
          backgroundColor: 'rgba(18,48,43,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="options-outline" size={20} color={ui.text} />
      </Pressable>
    </View>
  );
}

interface DateProps {
  title: string;
  hijri: string;
  onPrev: () => void;
  onNext: () => void;
}

/** ‹ Gregorian · Hijri › — looks at the times of other days. */
export function DateSwitcher({ title, hijri, onPrev, onNext }: DateProps) {
  const { t, font, row } = useT();
  const rtl = row === 'row-reverse';
  return (
    <View
      style={{
        flexDirection: row,
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: ui.bgElev,
        borderWidth: 1,
        borderColor: `${GOLD_SOFT}0.25)`,
        borderRadius: 28,
        padding: 4,
      }}
    >
      <RoundIcon icon={rtl ? 'chevron-forward' : 'chevron-back'} label={t('prevDay')} onPress={onPrev} />
      <View accessible accessibilityLiveRegion="polite" style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15, textAlign: 'center' }}>{title}</Text>
        <Text style={{ color: ui.accent, fontFamily: font.regular, fontSize: 14, textAlign: 'center' }}>{hijri}</Text>
      </View>
      <RoundIcon icon={rtl ? 'chevron-back' : 'chevron-forward'} label={t('nextDay')} onPress={onNext} />
    </View>
  );
}

function RoundIcon({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? ui.bgElev2 : 'transparent' })}
    >
      <Ionicons name={icon} size={20} color={ui.text} />
    </Pressable>
  );
}

interface QiblaProps {
  degrees: string;
  bearing: number;
  distance: string;
  open: boolean;
  onToggle: () => void;
}

/** Qibla at a glance — bearing and distance — with the live compass behind "Open compass". */
export function QiblaSummary({ degrees, bearing, distance, open, onToggle }: QiblaProps) {
  const { t, font, row, textAlign } = useT();
  return (
    <View
      style={{
        flexDirection: row,
        alignItems: 'center',
        gap: 18,
        padding: 18,
        borderRadius: 18,
        backgroundColor: ui.bgElev,
        borderWidth: 1,
        borderColor: `${GOLD_SOFT}0.30)`,
      }}
    >
      <MiniCompass bearing={bearing} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: row, alignItems: 'baseline', gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 18, textAlign }}>
            {t('qibla')}
          </Text>
          <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 17 }}>القبلة</Text>
        </View>
        <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 26, fontVariant: ['tabular-nums'], textAlign }}>{degrees}</Text>
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 14, fontVariant: ['tabular-nums'], textAlign }}>{distance}</Text>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={{ flexDirection: row, alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' }}
        >
          <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 15 }}>{t('openCompass')}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={ui.accent} />
        </Pressable>
      </View>
    </View>
  );
}

function MiniCompass({ bearing }: { bearing: number }) {
  return (
    <Svg width={112} height={112} viewBox="0 0 112 112" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Circle cx={56} cy={56} r={54} fill={ui.bg} stroke={ui.accent} strokeOpacity={0.5} />
      <Circle cx={56} cy={56} r={46} fill="none" stroke={ui.accent} strokeOpacity={0.35} strokeWidth={5} strokeDasharray="1 7.03" />
      <Path d="M56 22 L60 52 L90 56 L60 60 L56 90 L52 60 L22 56 L52 52 Z" fill={ui.accent} fillOpacity={0.08} stroke={ui.accent} strokeOpacity={0.25} strokeWidth={0.8} />
      <SvgText x={56} y={18} textAnchor="middle" fontSize={10} fontWeight="600" fill={ui.textMuted}>
        N
      </SvgText>
      <G transform={`rotate(${bearing} 56 56)`}>
        <Path d="M56 16 L62 56 L56 62 L50 56 Z" fill={ui.accent} />
        <Path d="M56 62 L62 56 L56 92 L50 56 Z" fill="rgba(255,255,255,0.15)" />
        <Rect x={51} y={5} width={10} height={10} rx={1.5} fill={ui.text} />
        <Rect x={51} y={7.5} width={10} height={1.6} fill={ui.accent} />
      </G>
      <Circle cx={56} cy={56} r={4} fill={ui.bg} stroke={ui.accent} strokeWidth={1.5} />
    </Svg>
  );
}

/** Two-up setting tile: a small label over the current value. */
export function SettingTile({ label, value, open, onPress }: { label: string; value: string; open: boolean; onPress: () => void }) {
  const { font, textAlign } = useT();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 68,
        borderRadius: ui.radius,
        borderWidth: 1,
        borderColor: open ? `${GOLD_SOFT}0.6)` : 'rgba(255,255,255,0.20)',
        backgroundColor: pressed ? ui.bgElev2 : ui.bgElev,
        paddingHorizontal: 14,
        paddingVertical: 10,
        justifyContent: 'center',
        gap: 2,
      })}
    >
      <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>{label}</Text>
      <Text numberOfLines={2} style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15, textAlign }}>
        {value}
      </Text>
    </Pressable>
  );
}
