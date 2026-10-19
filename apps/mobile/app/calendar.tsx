import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dayKey, HIJRI_MONTHS, hijriMonth, localeMeta, tagOf, toLocaleDigits, upcomingEvents } from '@barakah/core';
import { useT } from '../src/i18n';
import { ProGate } from '../src/monetization/ProLock';
import { ui } from '../src/theme';
import { ScreenHeader } from '../src/components/ScreenHeader';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
const GOLD_SOFT = 'rgba(217,182,92,';

/** The Hijri month as a grid with the Gregorian date under each day, and the next events with countdowns. */
function CalendarScreen() {
  const { t, l, locale, font, row } = useT();
  const [offset, setOffset] = useState(0);
  const today = new Date();
  const todayKey = dayKey(today);
  const month = hijriMonth(today, offset);
  const events = upcomingEvents(today, 6);
  const digits = (n: number) => toLocaleDigits(n, locale);
  const tag = tagOf(locale);
  const rtl = row === 'row-reverse';

  // Monday-first grid; blanks before day 1 and after the last day.
  const lead = month.days.length ? (month.days[0].date.getDay() + 6) % 7 : 0;
  const cells: ({ key: string; date: Date; hijriDay: number } | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...month.days.map((d) => ({ key: dayKey(d.date), ...d })),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(tag, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)));

  const first = month.days[0]?.date;
  const last = month.days[month.days.length - 1]?.date;
  const gregRange =
    first && last
      ? `${new Intl.DateTimeFormat(tag, { month: 'long' }).format(first)} – ${new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }).format(last)}`
      : '';
  const monthName = HIJRI_MONTHS[month.month - 1];
  const title = monthName ? `${l(monthName)} ${digits(month.year)}` : '';
  const showArabicName = locale !== 'ar' && !!monthName;

  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScreenHeader title={t('calendarTitle')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            borderRadius: 20,
            paddingTop: 12,
            paddingHorizontal: 8,
            paddingBottom: 10,
            backgroundColor: ui.bgElev,
            borderWidth: 1,
            borderColor: `${GOLD_SOFT}0.25)`,
          }}
        >
          <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between' }}>
            <MonthButton icon={rtl ? 'chevron-forward' : 'chevron-back'} label={t('prevMonth')} onPress={() => setOffset((o) => o - 1)} />
            <View accessible accessibilityLiveRegion="polite" style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 18 }}>{title}</Text>
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign: 'center' }}>
                {gregRange}
                {showArabicName ? ' · ' : ''}
                {showArabicName && <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 15 }}>{monthName.ar}</Text>}
              </Text>
            </View>
            <MonthButton icon={rtl ? 'chevron-back' : 'chevron-forward'} label={t('nextMonth')} onPress={() => setOffset((o) => o + 1)} />
          </View>

          <View style={{ flexDirection: row, marginTop: 6 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {weekdays.map((w, i) => (
              <Text key={w} numberOfLines={1} style={{ flex: 1, textAlign: 'center', color: i === 4 ? ui.accent : ui.textMuted, fontFamily: font.medium, fontSize: 11 }}>
                {w.toLocaleUpperCase(locale)}
              </Text>
            ))}
          </View>

          {weeks.map((week) => (
            <View key={week.map((c, i) => c?.key ?? `b${i}`).join('|')} style={{ flexDirection: row, gap: 2, marginTop: 2 }}>
              {week.map((c, ci) => {
                if (!c) return <View key={`blank-${ci}`} style={{ flex: 1, height: 50 }} />;
                const isToday = c.key === todayKey;
                const white = c.hijriDay >= 13 && c.hijriDay <= 15;
                const g = c.date.getDate();
                const gLabel = g === 1 || c.hijriDay === 1 ? new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' }).format(c.date) : digits(g);
                return (
                  <View
                    key={c.key}
                    accessible
                    accessibilityLabel={`${digits(c.hijriDay)} ${monthName ? l(monthName) : ''}, ${new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long' }).format(c.date)}${isToday ? `, ${t('today')}` : ''}`}
                    style={{ flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? ui.accent : 'transparent' }}
                  >
                    <Text style={{ color: isToday ? ui.accentInk : ui.text, fontFamily: font.semibold, fontSize: 17, fontVariant: ['tabular-nums'] }}>{digits(c.hijriDay)}</Text>
                    <Text numberOfLines={1} style={{ color: isToday ? ui.accentInk : ui.textMuted, fontFamily: font.regular, fontSize: 10 }}>
                      {gLabel}
                    </Text>
                    {white && !isToday && <View style={{ position: 'absolute', top: 5, end: 7, width: 5, height: 5, borderRadius: 3, backgroundColor: ui.text }} />}
                  </View>
                );
              })}
            </View>
          ))}

          <View style={{ flexDirection: row, gap: 14, justifyContent: 'center', marginTop: 8 }}>
            <View style={{ flexDirection: row, alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: ui.accent }} />
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 11 }}>{t('today')}</Text>
            </View>
            <View style={{ flexDirection: row, alignItems: 'center', gap: 5 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: ui.text }} />
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 11 }}>{t('whiteDays')}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 20, marginTop: 16, gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 16 }}>
            {t('comingUp')}
          </Text>
          <Text style={{ flexShrink: 1, color: ui.textMuted, fontFamily: font.regular, fontSize: 12 }}>{t('moonNote')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingTop: 10 }}>
          {events.map((e, i) => {
            const when = e.daysAway === 0 ? t('today') : fill(t('daysAway'), { n: digits(e.daysAway) });
            return (
              <View
                key={`${e.id}-${dayKey(e.date)}`}
                accessible
                accessibilityLabel={`${l(e.name)}, ${new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(e.date)}, ${when}`}
                style={{
                  width: 156,
                  borderRadius: 18,
                  padding: 12,
                  gap: 4,
                  backgroundColor: i === 0 ? ui.bgElev2 : ui.bgElev,
                  borderWidth: 1,
                  borderColor: `${GOLD_SOFT}${i === 0 ? '0.5' : '0.22'})`,
                }}
              >
                <Text
                  style={{
                    alignSelf: 'flex-start',
                    color: ui.accentInk,
                    backgroundColor: ui.accent,
                    borderRadius: 10,
                    overflow: 'hidden',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    fontFamily: font.semibold,
                    fontSize: 12,
                  }}
                >
                  {when}
                </Text>
                {localeMeta(locale).dir !== 'rtl' && <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 20, lineHeight: 30 }}>{e.name.ar}</Text>}
                <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15 }}>{l(e.name)}</Text>
                <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12 }}>
                  ~ {new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' }).format(e.date)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

function MonthButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={20} color={ui.text} />
    </Pressable>
  );
}

/** A Pro tool: free users see how to unlock it. */
export default function CalendarRoute() {
  return (
    <ProGate title="calendarTitle">
      <CalendarScreen />
    </ProGate>
  );
}
