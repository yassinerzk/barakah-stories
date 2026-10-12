import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toLocaleDigits, type AlertMode, type PrayerName } from '@barakah/core';
import { useT } from '../../i18n';
import { ui } from '../../theme';

export interface TimelineRow {
  id: PrayerName;
  name: string;
  /** The Arabic name, shown beside the name when the app is not in Arabic. */
  arabic: string | null;
  time: string;
  /** Null for sunrise, which has no alert. */
  mode: AlertMode | null;
}

interface Props {
  rows: TimelineRow[];
  /** Today only: the time that has started most recently, and the one coming. */
  current: PrayerName | null;
  next: PrayerName | null;
  passed: number;
  /** "in 3 h 01 min" for the next prayer. */
  nextIn: string | null;
  /** Share of the wait from the current prayer to the next that has gone by, 0..1. */
  nextProgress: number;
  onBell: (id: PrayerName) => void;
}

const MODE_ICON: Record<AlertMode, keyof typeof Ionicons.glyphMap> = {
  adhan: 'musical-notes',
  sound: 'notifications',
  vibrate: 'phone-portrait',
  off: 'notifications-off',
};
const MODE_KEY = { adhan: 'modeAdhan', sound: 'modeSound', vibrate: 'modeVibrate', off: 'modeOff' } as const;
const RAIL = 28;
const GOLD_SOFT = 'rgba(217,182,92,';

/**
 * The day's six times as a timeline: a gold rail through what has passed, a
 * dashed one ahead, the current time marked NOW and the next one opened up
 * with how long is left. On another day than today it is a plain list.
 */
export function PrayerTimeline({ rows, current, next, passed, nextIn, nextProgress, onBell }: Props) {
  const { t, locale, font, row, textAlign } = useT();
  const currentIndex = rows.findIndex((r) => r.id === current);
  const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

  return (
    <View>
      <View style={{ flexDirection: row, alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 18 }}>
          {t('todaysPrayers')}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD_SOFT}0.35)` }} />
        {next !== null && (
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13 }}>
            {fill(t('passedOf'), { n: toLocaleDigits(passed, locale), total: toLocaleDigits(rows.length, locale) })}
          </Text>
        )}
      </View>

      {rows.map((r, i) => {
        const isPassed = currentIndex >= 0 && i < currentIndex;
        const isCurrent = r.id === current;
        const isNext = r.id === next;
        // The rail above a dot is gold once that time has started; below it,
        // once the following one has.
        const goldAbove = currentIndex >= 0 && i <= currentIndex && i > 0;
        const goldBelow = currentIndex >= 0 && i < currentIndex;
        return (
          <View key={r.id} style={{ flexDirection: row, alignItems: 'stretch', gap: 12 }}>
            <View style={{ width: RAIL, alignItems: 'center' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <RailSegment gold={goldAbove} hidden={i === 0} />
              <Dot passed={isPassed} current={isCurrent} next={isNext} />
              <RailSegment gold={goldBelow} hidden={i === rows.length - 1} />
            </View>
            <View style={{ flex: 1, paddingVertical: 4 }}>
              {isNext ? (
                <NextCard r={r} nextIn={nextIn} progress={nextProgress} onBell={onBell} />
              ) : (
                <View
                  style={{
                    minHeight: 60,
                    flexDirection: row,
                    alignItems: 'center',
                    gap: 12,
                    paddingStart: 14,
                    paddingEnd: 8,
                    borderRadius: ui.radius,
                    backgroundColor: ui.bgElev,
                    borderWidth: 1,
                    borderColor: isCurrent ? `${GOLD_SOFT}0.40)` : `${GOLD_SOFT}0.12)`,
                    opacity: isPassed ? 0.85 : 1,
                  }}
                >
                  <View
                    accessible
                    accessibilityLabel={`${r.name}, ${r.time}${isCurrent ? `, ${t('nowBadge')}` : isPassed ? `, ${t('passedLabel')}` : ''}`}
                    style={{ flex: 1, flexDirection: row, alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                  >
                    <Text style={{ color: isCurrent ? ui.accent : ui.text, fontFamily: isCurrent ? font.semibold : font.regular, fontSize: 16, textAlign }}>
                      {r.name}
                    </Text>
                    {r.arabic && <Text style={{ color: isCurrent ? ui.accent : ui.textMuted, fontFamily: 'Amiri_400Regular', fontSize: 16 }}>{r.arabic}</Text>}
                    {isCurrent && (
                      <Text
                        style={{
                          color: ui.accentInk,
                          backgroundColor: ui.accent,
                          fontFamily: font.semibold,
                          fontSize: 11,
                          letterSpacing: 0.8,
                          borderRadius: 8,
                          overflow: 'hidden',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                        }}
                      >
                        {t('nowBadge')}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: isCurrent ? ui.accent : ui.text, fontFamily: isCurrent ? font.semibold : font.regular, fontSize: 16, fontVariant: ['tabular-nums'] }}>
                    {r.time}
                  </Text>
                  <Bell r={r} onBell={onBell} />
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function NextCard({ r, nextIn, progress, onBell }: { r: TimelineRow; nextIn: string | null; progress: number; onBell: (id: PrayerName) => void }) {
  const { font, row, textAlign } = useT();
  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${GOLD_SOFT}0.70)`,
        backgroundColor: ui.bgElev2,
        paddingVertical: 12,
        paddingStart: 14,
        paddingEnd: 8,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
        <View accessible accessibilityLabel={`${r.name}, ${r.time}${nextIn ? `, ${nextIn}` : ''}`} style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: row, alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 18, textAlign }}>{r.name}</Text>
            {r.arabic && <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 18 }}>{r.arabic}</Text>}
          </View>
          {nextIn && <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 13, textAlign }}>{nextIn}</Text>}
        </View>
        <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 22, fontVariant: ['tabular-nums'] }}>{r.time}</Text>
        <Bell r={r} onBell={onBell} gold />
      </View>
      <View
        style={{ height: 4, borderRadius: 2, backgroundColor: ui.line, marginEnd: 6, overflow: 'hidden', flexDirection: row }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`, backgroundColor: ui.accent }} />
      </View>
    </View>
  );
}

function Bell({ r, onBell, gold = false }: { r: TimelineRow; onBell: (id: PrayerName) => void; gold?: boolean }) {
  const { t, font } = useT();
  if (!r.mode) return <View style={{ width: 60 }} />;
  const off = r.mode === 'off';
  const color = gold ? ui.accent : off ? ui.textMuted : ui.text;
  return (
    <Pressable
      onPress={() => onBell(r.id)}
      accessibilityRole="button"
      accessibilityLabel={`${r.name} ${t('alertFor')}: ${t(MODE_KEY[r.mode])}`}
      style={({ pressed }) => ({
        minWidth: 60,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: gold ? `${GOLD_SOFT}0.70)` : ui.lineStrong,
        backgroundColor: pressed ? ui.bgElev2 : 'rgba(11,31,28,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        gap: 1,
      })}
    >
      <Ionicons name={MODE_ICON[r.mode]} size={17} color={color} />
      <Text numberOfLines={1} style={{ color, fontFamily: font.medium, fontSize: 11 }}>
        {t(MODE_KEY[r.mode])}
      </Text>
    </Pressable>
  );
}

function Dot({ passed, current, next }: { passed: boolean; current: boolean; next: boolean }) {
  if (current) {
    return (
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#F6DE97',
          borderWidth: 4,
          borderColor: `${GOLD_SOFT}0.25)`,
          shadowColor: '#F6DE97',
          shadowOpacity: 0.8,
          shadowRadius: 9,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        }}
      />
    );
  }
  if (passed) {
    return (
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="checkmark" size={13} color={ui.accentInk} />
      </View>
    );
  }
  const size = next ? 20 : 16;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: ui.bg,
        borderWidth: 2,
        borderColor: next ? ui.text : 'rgba(169,184,177,0.7)',
      }}
    />
  );
}

function RailSegment({ gold, hidden }: { gold: boolean; hidden: boolean }) {
  if (hidden) return <View style={{ flex: 1 }} />;
  return gold ? (
    <View style={{ flex: 1, width: 2, backgroundColor: ui.accent }} />
  ) : (
    <View style={{ flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(169,184,177,0.45)' }} />
  );
}
