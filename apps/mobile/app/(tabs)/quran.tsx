import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Circle, Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { continuePosition, getChapterMeta, QURAN_INDEX, toLocaleDigits } from '@barakah/core';
import { useT } from '../../src/i18n';
import { ui } from '../../src/theme';
import { useQuranStore, type AyahRef } from '../../src/store';
import { loadChapter } from '../../src/quran/chapters';
import { StarBadge } from '../../src/components/StarBadge';
import { SvgFill } from '../../src/components/SvgFill';
import { usePro } from '../../src/monetization/usePro';
import { ProLock } from '../../src/monetization/ProLock';

const GOLD_SOFT = 'rgba(217,182,92,';
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
type Tab = 'surahs' | 'bookmarks';

export default function QuranScreen() {
  const { t, locale, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const finished = useQuranStore((s) => s.finished);
  const lastRead = useQuranStore((s) => s.lastRead);
  const bookmarks = useQuranStore((s) => s.bookmarks);
  const [tab, setTab] = useState<Tab>('surahs');
  const { locked, openPro } = usePro();
  const pos = continuePosition({ lastRead, finished });
  const meta = getChapterMeta(pos.surah)!;
  const digits = (n: number) => toLocaleDigits(n, locale);
  // Nothing read yet means 0%, not ayah 1's share of the surah.
  const surahPercent = lastRead ? Math.round((pos.ayah / meta.total_verses) * 100) : 0;
  const open = (surah: number, ayah?: number) =>
    router.push({ pathname: '/surah/[id]', params: ayah ? { id: String(surah), ayah: String(ayah) } : { id: String(surah) } });

  const header = (
    <View style={{ gap: 14, marginBottom: 8 }}>
      <View>
        <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 26, textAlign }}>
          {t('quranTitle')}
        </Text>
        {locale !== 'ar' && <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 18, textAlign }}>ٱلْقُرْآنُ ٱلْكَرِيمُ</Text>}
      </View>

      {/* continue reading */}
      <Pressable
        // Picking up where you left off is Pro; starting to read is free.
        onPress={() => (locked && lastRead ? openPro('feature') : open(pos.surah, pos.ayah))}
        accessibilityRole="button"
        accessibilityLabel={`${t('continueReading')}: ${meta.transliteration}, ${fill(t('ayahOf'), { n: digits(pos.ayah), total: digits(meta.total_verses) })}`}
        style={{ borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: `${GOLD_SOFT}0.45)`, backgroundColor: ui.bgElev, padding: 18 }}
      >
        <SvgFill>
          <Defs>
            <Pattern id="gQ" width={40} height={40} patternUnits="userSpaceOnUse">
              <Path d="M20 4 L24 16 L36 20 L24 24 L20 36 L16 24 L4 20 L16 16 Z" fill="none" stroke={ui.accent} strokeWidth={0.7} />
            </Pattern>
            <RadialGradient id="qg" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#F6DE97" stopOpacity={0.35} />
              <Stop offset="1" stopColor={ui.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#gQ)" opacity={0.08} />
          <Circle cx="85%" cy={50} r={70} fill="url(#qg)" />
        </SvgFill>
        {locked && lastRead && <ProLock size={14} />}
        <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 11, letterSpacing: 1.5, textAlign }}>
          {(lastRead ? t('continueReading') : t('startReading')).toLocaleUpperCase(locale)}
        </Text>
        <View style={{ flexDirection: row, alignItems: 'baseline', gap: 10, marginTop: 4 }}>
          <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 22 }}>{meta.transliteration}</Text>
          <Text style={{ color: ui.accent, fontFamily: 'Amiri_700Bold', fontSize: 20 }}>{meta.name}</Text>
        </View>
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 14, textAlign, fontVariant: ['tabular-nums'] }}>
          {fill(t('ayahOf'), { n: digits(pos.ayah), total: digits(meta.total_verses) })}
        </Text>
        <View style={{ flexDirection: row, alignItems: 'center', gap: 12, marginTop: 14 }}>
          <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', flexDirection: row }}>
            <View style={{ width: `${surahPercent}%`, backgroundColor: ui.accent }} />
          </View>
          <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 13 }}>{digits(surahPercent)}%</Text>
        </View>
        <View style={{ marginTop: 14, minHeight: 48, borderRadius: 14, backgroundColor: ui.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: ui.accentInk, fontFamily: font.semibold, fontSize: 15 }}>{t('continueBtn')}</Text>
        </View>
      </Pressable>

      {/* surahs / bookmarks */}
      <View accessibilityRole="tablist" style={{ flexDirection: row, gap: 4, padding: 4, borderRadius: 24, backgroundColor: ui.bgElev, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
        {(['surahs', 'bookmarks'] as const).map((k) => {
          const on = tab === k;
          return (
            <Pressable
              key={k}
              onPress={() => (locked && k === 'bookmarks' ? openPro('feature') : setTab(k))}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{ flex: 1, minHeight: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? ui.accent : 'transparent' }}
            >
              <Text style={{ color: on ? ui.accentInk : ui.text, fontFamily: font.semibold, fontSize: 14 }}>
                {t(k)}
                {k === 'bookmarks' && bookmarks.length > 0 ? ` · ${digits(bookmarks.length)}` : ''}
              </Text>
              {locked && k === 'bookmarks' && <ProLock size={12} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  if (tab === 'bookmarks') {
    return (
      <FlatList
        data={bookmarks}
        keyExtractor={(b) => `${b.surah}:${b.ayah}`}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 8 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 15, textAlign: 'center', paddingVertical: 32 }}>{t('noBookmarks')}</Text>
        }
        renderItem={({ item }) => <BookmarkRow item={item} onOpen={() => open(item.surah, item.ayah)} />}
      />
    );
  }

  return (
    <FlatList
      data={QURAN_INDEX}
      keyExtractor={(c) => String(c.id)}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32 }}
      initialNumToRender={20}
      ListHeaderComponent={header}
      renderItem={({ item }) => {
        const done = finished.includes(item.id);
        return (
          <Pressable
            onPress={() => open(item.id)}
            accessibilityRole="button"
            // One clear announcement, including the finished state the badge shows.
            accessibilityLabel={`${digits(item.id)}. ${item.transliteration}, ${item.translation}, ${digits(item.total_verses)} ${t('verses')}${done ? `, ${t('completedLabel')}` : ''}`}
            style={{ flexDirection: row, alignItems: 'center', gap: 12, minHeight: 62, borderBottomWidth: 1, borderBottomColor: ui.line }}
          >
            <StarBadge label={done ? '✓' : digits(item.id)} filled={done} fontFamily={font.semibold} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 16, textAlign }}>{item.transliteration}</Text>
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>
                {item.translation} · {digits(item.total_verses)} {t('verses')} · {t(item.type)}
              </Text>
            </View>
            <Text style={{ color: ui.accent, fontFamily: 'Amiri_700Bold', fontSize: 22 }}>{item.name}</Text>
          </Pressable>
        );
      }}
    />
  );
}

/** A kept ayah: where it is, and the start of its text. */
function BookmarkRow({ item, onOpen }: { item: AyahRef; onOpen: () => void }) {
  const { locale, font, row, textAlign } = useT();
  const meta = getChapterMeta(item.surah);
  const verse = loadChapter(item.surah)?.verses.find((v) => v.id === item.ayah);
  if (!meta || !verse) return null;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${meta.transliteration} ${toLocaleDigits(item.surah, locale)}:${toLocaleDigits(item.ayah, locale)}`}
      style={({ pressed }) => ({
        borderRadius: 16,
        padding: 14,
        gap: 6,
        backgroundColor: pressed ? ui.bgElev2 : ui.bgElev,
        borderWidth: 1,
        borderColor: `${GOLD_SOFT}0.18)`,
      })}
    >
      <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 14, textAlign }}>
          {meta.transliteration} · {toLocaleDigits(item.surah, locale)}:{toLocaleDigits(item.ayah, locale)}
        </Text>
        <Text style={{ color: ui.accent, fontSize: 14 }}>♥</Text>
      </View>
      <Text numberOfLines={2} style={{ color: ui.text, fontFamily: 'Amiri_400Regular', fontSize: 20, lineHeight: 36, textAlign: 'right', writingDirection: 'rtl' }}>
        {verse.text}
      </Text>
    </Pressable>
  );
}
