import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View, type ViewToken } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { designFromVerses, getChapterMeta, toLocaleDigits, type QuranVerse } from '@barakah/core';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../src/i18n';
import { ui } from '../../src/theme';
import { useEditorStore, useQuranStore } from '../../src/store';
import { LARGE_TEXT_SCALE, useA11yStore } from '../../src/a11y';
import { loadChapter } from '../../src/quran/chapters';
import { useChapterTranslation } from '../../src/quran/useChapterTranslation';
import { Chip } from '../../src/components/ui';
import { StarBadge } from '../../src/components/StarBadge';
import { SurahCartouche } from '../../src/quran/SurahCartouche';

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

export default function SurahScreen() {
  const { id, ayah } = useLocalSearchParams<{ id: string; ayah?: string }>();
  const surah = Number(id);
  const { t, locale, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const chapter = useMemo(() => loadChapter(surah), [surah]);
  // Fetched per surah; until it arrives the bundled English stays on screen.
  const { verses: translated, credit } = useChapterTranslation(surah, locale);
  const meta = getChapterMeta(surah);
  const finished = useQuranStore((s) => s.finished);
  const showTranslation = useQuranStore((s) => s.showTranslation);
  const setShowTranslation = useQuranStore((s) => s.setShowTranslation);
  const fontScale = useQuranStore((s) => s.fontScale);
  const largeText = useA11yStore((s) => s.largeText);
  const boldArabic = useA11yStore((s) => s.boldArabic);
  const setFontScale = useQuranStore((s) => s.setFontScale);
  const setLastRead = useQuranStore((s) => s.setLastRead);
  const markFinished = useQuranStore((s) => s.markFinished);
  const unmarkFinished = useQuranStore((s) => s.unmarkFinished);
  const loadDesign = useEditorStore((s) => s.load);
  const bookmarks = useQuranStore((s) => s.bookmarks);
  const toggleBookmark = useQuranStore((s) => s.toggleBookmark);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const createStory = (verse: QuranVerse) => {
    if (!meta) return;
    loadDesign(designFromVerses(meta, [verse], locale));
    router.push('/editor');
  };
  const listRef = useRef<FlatList<QuranVerse>>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = finished.includes(surah);

  // Jump to the requested ayah once the list has rendered.
  useEffect(() => {
    const target = Number(ayah);
    if (!target || target <= 1 || !chapter) return;
    const idx = Math.min(target, chapter.verses.length) - 1;
    const handle = setTimeout(
      () => listRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.1 }),
      300,
    );
    return () => clearTimeout(handle);
  }, [ayah, chapter]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<QuranVerse>[] }) => {
      const first = viewableItems[0]?.item;
      if (!first || !chapter) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setLastRead({ surah, ayah: first.id }), 800);
      const last = viewableItems[viewableItems.length - 1]?.item;
      if (last && last.id === chapter.verses.length && !useQuranStore.getState().finished.includes(surah))
        markFinished(surah);
    },
    [chapter, surah, setLastRead, markFinished],
  );

  if (!chapter || !meta) return null;
  const arabicSize = 26 * fontScale * (largeText ? LARGE_TEXT_SCALE : 1);
  const showBismillah = surah !== 1 && surah !== 9;

  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 4, borderBottomWidth: settingsOpen ? 1 : 0, borderBottomColor: ui.line }}>
        <View style={{ flexDirection: row, alignItems: 'center', minHeight: 56 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={row === 'row-reverse' ? 'chevron-forward' : 'chevron-back'} size={22} color={ui.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 16 }}>
              {meta.transliteration}
            </Text>
            <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12 }}>
              {toLocaleDigits(meta.total_verses, locale)} {t('verses')} · {t(meta.type)}
            </Text>
          </View>
          <Pressable
            onPress={() => setSettingsOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel={t('readingSettings')}
            accessibilityState={{ expanded: settingsOpen }}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: settingsOpen ? ui.accent : ui.text, fontFamily: font.semibold, fontSize: 17 }}>Aa</Text>
          </Pressable>
        </View>
        {settingsOpen && (
          <View style={{ flexDirection: row, gap: 8, flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 10 }}>
            <Chip label={t('showTranslation')} active={showTranslation} onPress={() => setShowTranslation(!showTranslation)} />
            <Chip
              label="A−"
              accessibilityLabel={t('fontSmaller')}
              onPress={() => setFontScale(Math.max(0.7, Math.round((fontScale - 0.1) * 10) / 10))}
            />
            <Chip
              label="A+"
              accessibilityLabel={t('fontLarger')}
              onPress={() => setFontScale(Math.min(1.8, Math.round((fontScale + 0.1) * 10) / 10))}
            />
            <Chip
              label={done ? `✓ ${t('finished')}` : t('markFinished')}
              active={done}
              onPress={() => (done ? unmarkFinished(surah) : markFinished(surah))}
            />
          </View>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={chapter.verses}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: insets.bottom + 40 }}
        initialNumToRender={12}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 400);
        }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 10 }}>
            <SurahCartouche
              name={meta.name}
              subtitle={`${meta.translation} · ${toLocaleDigits(meta.total_verses, locale)} ${t('verses')} · ${t(meta.type)}`}
            />
            {showBismillah && (
              <Text style={{ color: ui.text, fontFamily: 'Amiri_400Regular', fontSize: 24, textAlign: 'center', lineHeight: 46 }}>{BISMILLAH}</Text>
            )}
            {/* Attribution has to travel with the text it belongs to. */}
            {credit && showTranslation && (
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 11, textAlign: 'center' }}>
                {t('translation')}: {credit}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const kept = bookmarks.some((bm) => bm.surah === surah && bm.ayah === item.id);
          const n = toLocaleDigits(item.id, locale);
          return (
            <View
              style={{
                borderRadius: 18,
                backgroundColor: ui.bgElev,
                borderWidth: 1,
                borderColor: 'rgba(217,182,92,0.16)',
                paddingTop: 12,
                paddingHorizontal: 14,
                paddingBottom: 6,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: ui.text,
                  fontFamily: boldArabic ? 'Amiri_700Bold' : 'Amiri_400Regular',
                  fontSize: arabicSize,
                  lineHeight: arabicSize * 1.9,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                }}
              >
                {item.text}
              </Text>
              {showTranslation && (
                <Text style={{ color: ui.text, fontFamily: font.regular, fontSize: 15 * Math.sqrt(fontScale), lineHeight: 23 * Math.sqrt(fontScale), textAlign }}>
                  {translated?.get(item.id) ?? item.translation}
                </Text>
              )}
              <View style={{ flexDirection: row, alignItems: 'center', marginTop: 4 }}>
                <View accessible accessibilityLabel={fill(t('ayahLabel'), { n })}>
                  <StarBadge label={n} size={34} fontFamily={font.semibold} />
                </View>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() => toggleBookmark({ surah, ayah: item.id })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: kept }}
                  accessibilityLabel={fill(t(kept ? 'removeAyah' : 'saveAyah'), { n })}
                  style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={kept ? 'heart' : 'heart-outline'} size={19} color={kept ? ui.accent : ui.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => createStory(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('createStory')}, ${fill(t('ayahLabel'), { n })}`}
                  style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="share-outline" size={19} color={ui.textMuted} />
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
