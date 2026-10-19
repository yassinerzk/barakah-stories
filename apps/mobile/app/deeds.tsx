import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { dayKey, deedStats, formatClock, PRAYER_DEEDS, PRAYER_NAMES, tagOf, toLocaleDigits, type DeedId } from '@barakah/core';
import { useT } from '../src/i18n';
import { ProGate } from '../src/monetization/ProLock';
import { ui } from '../src/theme';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useDeedsStore } from '../src/practice/store';
import { usePrayerTimes } from '../src/features/prayer/usePrayerTimes';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
const OTHER: ReadonlyArray<{ id: DeedId; key: 'deedQuran' | 'deedMorning' | 'deedEvening' | 'deedSalawat' }> = [
  { id: 'quran', key: 'deedQuran' },
  { id: 'morning', key: 'deedMorning' },
  { id: 'evening', key: 'deedEvening' },
  { id: 'salawat', key: 'deedSalawat' },
];
const RING_R = 40;
const RING_C = 2 * Math.PI * RING_R;

/** A checklist for the day — the five prayers and four remembrances — with a streak to keep. */
function DeedsScreen() {
  const { t, l, locale, font, row, textAlign } = useT();
  const log = useDeedsStore((s) => s.log);
  const toggle = useDeedsStore((s) => s.toggle);
  const { times, location } = usePrayerTimes();
  const today = new Date();
  const stats = deedStats(log, today);
  const done = new Set(log[dayKey(today)] ?? []);
  const digits = (n: number) => toLocaleDigits(n, locale);
  const prayersDone = PRAYER_DEEDS.filter((p) => done.has(p)).length;
  const othersDone = OTHER.filter((o) => done.has(o.id)).length;
  const weekday = (d: Date) => new Intl.DateTimeFormat(tagOf(locale), { weekday: 'short' }).format(d);
  // The ring fills over a week of complete days.
  const ringFill = Math.min(1, stats.streak / 7);
  const summary = fill(t('bestDone'), { best: digits(stats.best), done: digits(stats.doneToday), total: digits(stats.total) });

  const sectionHead = (title: string, count: string) => (
    <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 20, marginTop: 18 }}>
      <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15 }}>
        {title}
      </Text>
      <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13 }}>{count}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScreenHeader title={t('deedsTitle')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* streak */}
        <View
          accessible
          accessibilityLabel={`${fill(t('streakDays'), { n: digits(stats.streak) })}. ${summary}`}
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            borderRadius: 20,
            padding: 18,
            flexDirection: row,
            alignItems: 'center',
            gap: 16,
            backgroundColor: ui.bgElev2,
            borderWidth: 1,
            borderColor: 'rgba(217,182,92,0.35)',
          }}
        >
          <View style={{ width: 92, height: 92, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={92} height={92} viewBox="0 0 92 92" style={{ position: 'absolute' }}>
              <Defs>
                <LinearGradient id="srg" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#F0D488" />
                  <Stop offset="1" stopColor="#9C7F38" />
                </LinearGradient>
              </Defs>
              <Circle cx={46} cy={46} r={RING_R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={7} />
              <Circle
                cx={46}
                cy={46}
                r={RING_R}
                fill="none"
                stroke="url(#srg)"
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={`${RING_C * ringFill} ${RING_C}`}
                transform="rotate(-90 46 46)"
              />
            </Svg>
            <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 28, fontVariant: ['tabular-nums'] }}>{digits(stats.streak)}</Text>
            <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 10, marginTop: -4 }}>{t('daysLabel')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 20, textAlign }}>{fill(t('streakDays'), { n: digits(stats.streak) })}</Text>
            <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 14, marginTop: 2, textAlign }}>{summary}</Text>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: ui.line, marginTop: 8, overflow: 'hidden', flexDirection: row }}>
              <View style={{ width: `${Math.round((stats.doneToday / stats.total) * 100)}%`, backgroundColor: ui.accent }} />
            </View>
          </View>
        </View>

        {/* last seven days */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            minHeight: 64,
            flexDirection: row,
            alignItems: 'center',
            borderRadius: 16,
            backgroundColor: ui.bgElev,
            borderWidth: 1,
            borderColor: ui.line,
          }}
        >
          {stats.week.map((d, i) => {
            const isToday = i === stats.week.length - 1;
            return (
              <View
                key={d.key}
                accessible
                accessibilityLabel={`${weekday(d.date)}: ${fill(t('countOf'), { n: digits(d.done), total: digits(stats.total) })}`}
                style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8 }}
              >
                <Text numberOfLines={1} style={{ color: isToday ? ui.accent : ui.textMuted, fontFamily: isToday ? font.semibold : font.regular, fontSize: 11 }}>
                  {isToday ? t('today') : weekday(d.date)}
                </Text>
                {d.complete ? (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark" size={13} color={ui.accentInk} />
                  </View>
                ) : (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: d.done > 0 ? ui.accent : ui.lineStrong,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {d.done > 0 && <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 9 }}>{digits(d.done)}</Text>}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* prayers */}
        {sectionHead(t('fivePrayers'), fill(t('countOf'), { n: digits(prayersDone), total: digits(5) }))}
        <View style={{ marginHorizontal: 16, marginTop: 10, flexDirection: row, justifyContent: 'space-between' }}>
          {PRAYER_DEEDS.map((p) => {
            const on = done.has(p);
            const name = l(PRAYER_NAMES.find((n) => n.id === p)!.label);
            const time = times.find((tm) => tm.id === p)?.time;
            return (
              <Pressable
                key={p}
                onPress={() => toggle(p)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={name}
                style={{ alignItems: 'center', gap: 4, minWidth: 56 }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? ui.accent : 'transparent',
                    borderWidth: on ? 0 : 2,
                    borderColor: ui.lineStrong,
                  }}
                >
                  {on ? (
                    <Ionicons name="checkmark" size={20} color={ui.accentInk} />
                  ) : (
                    <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 10, fontVariant: ['tabular-nums'] }}>
                      {time ? formatClock(time, locale, location?.timeZone) : ''}
                    </Text>
                  )}
                </View>
                <Text style={{ color: ui.text, fontFamily: font.medium, fontSize: 12 }}>{name}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* quran & remembrance */}
        {sectionHead(t('quranRemembrance'), fill(t('countOf'), { n: digits(othersDone), total: digits(OTHER.length) }))}
        <View style={{ marginHorizontal: 16, marginTop: 10, gap: 6 }}>
          {OTHER.map((o) => {
            const on = done.has(o.id);
            return (
              <Pressable
                key={o.id}
                onPress={() => toggle(o.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={({ pressed }) => ({
                  minHeight: 52,
                  flexDirection: row,
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: pressed ? ui.bgElev2 : ui.bgElev,
                  borderWidth: 1,
                  borderColor: 'rgba(217,182,92,0.14)',
                })}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? ui.accent : 'transparent',
                    borderWidth: on ? 0 : 2,
                    borderColor: ui.lineStrong,
                  }}
                >
                  {on && <Ionicons name="checkmark" size={15} color={ui.accentInk} />}
                </View>
                <Text style={{ flex: 1, color: ui.text, fontFamily: font.medium, fontSize: 15, textAlign }}>{t(o.key)}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/** A Pro tool: free users see how to unlock it. */
export default function DeedsRoute() {
  return (
    <ProGate title="deedsTitle">
      <DeedsScreen />
    </ProGate>
  );
}
