import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { Button, Chip } from '../../src/components/ui';

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

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
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 16,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: ui.line,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
          <Button label={`← ${t('back')}`} size="sm" variant="ghost" onPress={() => router.back()} />
          <Text style={{ color: ui.accent, fontFamily: 'Amiri_700Bold', fontSize: 26 }}>{meta.name}</Text>
        </View>
        <View style={{ flexDirection: row, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, flexShrink: 1 }}>
            {meta.transliteration} · {meta.translation} · {toLocaleDigits(meta.total_verses, locale)}{' '}
            {t('verses')}
          </Text>
        </View>
        {/* Attribution has to travel with the text it belongs to. */}
        {credit && showTranslation && (
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 11, textAlign }}>
            {t('translation')}: {credit}
          </Text>
        )}
        <View style={{ flexDirection: row, gap: 8, flexWrap: 'wrap' }}>
          <Chip
            label={t('showTranslation')}
            active={showTranslation}
            onPress={() => setShowTranslation(!showTranslation)}
          />
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
      </View>

      <FlatList
        ref={listRef}
        data={chapter.verses}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        initialNumToRender={12}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 400);
        }}
        ListHeaderComponent={
          showBismillah ? (
            <Text
              style={{
                color: ui.accent,
                fontFamily: 'Amiri_400Regular',
                fontSize: 28,
                textAlign: 'center',
                marginBottom: 16,
                lineHeight: 52,
              }}
            >
              {BISMILLAH}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: ui.line, gap: 10 }}>
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
              {item.text}{' '}
              <Text style={{ color: ui.accent, fontSize: arabicSize * 0.75 }}>
                ﴿{toLocaleDigits(item.id, 'ar')}﴾
              </Text>
            </Text>
            {showTranslation && (
              <Text
                style={{
                  color: ui.textMuted,
                  fontFamily: font.regular,
                  fontSize: 15 * Math.sqrt(fontScale),
                  lineHeight: 24 * Math.sqrt(fontScale),
                }}
              >
                {toLocaleDigits(item.id, locale)}. {translated?.get(item.id) ?? item.translation}
              </Text>
            )}
            <Pressable
              onPress={() => createStory(item)}
              accessibilityRole="button"
              accessibilityLabel={t('createStory')}
              style={({ pressed }) => ({
                flexDirection: row,
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-start',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="share-social-outline" size={16} color={ui.accent} />
              <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 13 }}>
                {t('createStory')}
              </Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
