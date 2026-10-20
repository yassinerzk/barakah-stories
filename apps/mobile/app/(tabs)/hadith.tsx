import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  designFromPost,
  HADITH_BOOKS,
  HADITH_SOURCES,
  normalizeText,
  POSTS,
  searchHadith,
  toLocaleDigits,
  type HadithBookId,
  type HadithEntry,
  type Post,
} from '@barakah/core';
import { useT } from '../../src/i18n';
import { usePro } from '../../src/monetization/usePro';
import { ProLock } from '../../src/monetization/ProLock';
import { ui } from '../../src/theme';
import { useEditorStore, useHadithStore, useRecentStore } from '../../src/store';
import { useHadithLibrary } from '../../src/hadith/library';
import { Chip, SectionTitle } from '../../src/components/ui';
import { HadithCard } from '../../src/components/HadithCard';

const BOOKS: HadithBookId[] = ['bukhari', 'muslim'];

export default function HadithScreen() {
  const { t, l, locale, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Reading Bukhari and Muslim is free; search, the dua filter and 'continue reading' are Pro.
  const { locked, openPro } = usePro();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [duaOnly, setDuaOnly] = useState(false);
  const status = useHadithLibrary((s) => s.status);
  const entries = useHadithLibrary((s) => s.entries);
  const ensure = useHadithLibrary((s) => s.ensure);
  const downloaded = useHadithStore((s) => s.downloaded);
  const lastRead = useHadithStore((s) => s.lastRead);
  const load = useEditorStore((s) => s.load);
  const touch = useRecentStore((s) => s.touch);

  useEffect(() => {
    const h = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(h);
  }, [query]);

  // Books already on disk load silently so search works right away.
  useEffect(() => {
    for (const b of BOOKS) if (downloaded[b] && !entries[b] && status[b] !== 'loading') void ensure(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloaded]);

  const loadedEntries = useMemo(() => BOOKS.flatMap((b) => entries[b] ?? []), [entries]);
  const results = useMemo(
    () => (debounced ? searchHadith(loadedEntries, debounced, { duaOnly, limit: 60 }) : []),
    [loadedEntries, debounced, duaOnly],
  );
  const postMatches = useMemo(() => {
    if (!debounced) return [];
    const q = normalizeText(debounced);
    return POSTS.filter(
      (p) =>
        (p.kind === 'dua' || p.kind === 'dhikr' || !duaOnly) &&
        normalizeText(
          `${p.arabic} ${p.translation ?? ''} ${p.headline?.en ?? ''} ${p.headline?.ar ?? ''} ${p.tags?.join(' ') ?? ''}`,
        ).includes(q),
    ).slice(0, 6);
  }, [debounced, duaOnly]);

  const openPost = (post: Post) => {
    touch(post.id);
    load(designFromPost(post, locale));
    router.push('/editor');
  };

  const header = (
    <View style={{ gap: 12, paddingTop: insets.top + 12 }}>
      <View>
        <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 26, textAlign }}>
          {t('hadithTitle')}
        </Text>
        {locale !== 'ar' && <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 18, textAlign }}>ٱلْحَدِيث</Text>}
      </View>
      <View
        style={{
          flexDirection: row,
          alignItems: 'center',
          gap: 8,
          backgroundColor: ui.bgElev,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.20)',
          paddingHorizontal: 14,
          minHeight: 48,
        }}
      >
        <Ionicons name="search" size={18} color={ui.textMuted} importantForAccessibility="no" accessibilityElementsHidden />
        <TextInput
          accessibilityLabel={t('searchHadith')}
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchHadith')}
          placeholderTextColor={ui.textMuted}
          style={{
            flex: 1,
            color: ui.text,
            fontFamily: font.regular,
            fontSize: 15,
            paddingVertical: 12,
            textAlign,
          }}
          autoCorrect={false}
          returnKeyType="search"
          editable={!locked}
        />
        {locked && <ProLock size={14} corner={false} />}
        {/* Search is Pro: for free users the whole field opens the Pro screen. */}
        {locked && (
          <Pressable
            onPress={() => openPro('feature')}
            accessibilityRole="button"
            accessibilityLabel={`${t('searchHadith')}, ${t('proOnly')}`}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
        )}
        {query !== '' && (
          <Pressable
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel={t('clearSearch')}
            hitSlop={14}
          >
            <Ionicons name="close-circle" size={18} color={ui.textMuted} />
          </Pressable>
        )}
      </View>
      <View style={{ flexDirection: row, gap: 8 }}>
        <Chip
          label={`${locked ? '🔒 ' : ''}🤲 ${t('duaOnly')}`}
          active={duaOnly && !locked}
          onPress={() => (locked ? openPro('feature') : setDuaOnly(!duaOnly))}
        />
      </View>

      {debounced === '' && (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: row, gap: 10 }}>
            {BOOKS.map((b) => {
              const meta = HADITH_BOOKS[b];
              const st = status[b];
              const ready = st === 'ready' || !!entries[b];
              const last = lastRead[b];
              const openBook = () => router.push({ pathname: '/hadith/[book]', params: { book: b } });
              return (
                <View
                  key={b}
                  style={{
                    flex: 1,
                    minHeight: 220,
                    borderRadius: 20,
                    padding: 14,
                    gap: 6,
                    overflow: 'hidden',
                    backgroundColor: ui.bgElev,
                    borderWidth: 1,
                    borderColor: 'rgba(217,182,92,0.22)',
                  }}
                >
                  <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: ready ? 'rgba(217,182,92,0.16)' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Ionicons name="book-outline" size={21} color={ready ? ui.accent : ui.textMuted} />
                    </View>
                    {ready ? (
                      <View style={{ flexDirection: row, alignItems: 'center', gap: 3 }}>
                        <Ionicons name="checkmark" size={14} color={ui.accent} />
                        <Text style={{ color: ui.accent, fontFamily: font.regular, fontSize: 11 }}>{t('downloadedBook')}</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: row, alignItems: 'center', gap: 3 }}>
                        <Ionicons name="cloud-download-outline" size={15} color={ui.textMuted} />
                        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 11 }}>~{HADITH_SOURCES[b].approxMb} MB</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 16, lineHeight: 20, textAlign }}>{meta.name}</Text>
                  <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 17, textAlign }}>{meta.nameAr}</Text>
                  <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, textAlign }}>
                    {toLocaleDigits(meta.sections.length, locale)} {t('topics')} · {toLocaleDigits(meta.hadithCount, locale)} {t('hadithNumber')}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {ready ? (
                    <Pressable
                      onPress={openBook}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('readFullBook')}: ${meta.name}`}
                      style={({ pressed }) => ({ minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#C9A24A' : ui.accent })}
                    >
                      <Text style={{ color: ui.accentInk, fontFamily: font.semibold, fontSize: 14 }}>{t('readFullBook')}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => void ensure(b)}
                      disabled={st === 'loading'}
                      accessibilityRole="button"
                      accessibilityState={{ busy: st === 'loading' }}
                      accessibilityLabel={`${t('downloadBook')}: ${meta.name}`}
                      style={({ pressed }) => ({
                        minHeight: 44,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: ui.lineStrong,
                        backgroundColor: pressed ? ui.bgElev2 : 'transparent',
                      })}
                    >
                      <Text style={{ color: st === 'error' ? ui.danger : ui.text, fontFamily: font.semibold, fontSize: 14 }}>
                        {st === 'loading' ? t('downloading') : st === 'error' ? t('shareFailed') : t('downloadBook')}
                      </Text>
                    </Pressable>
                  )}
                  {ready && last && (
                    <Pressable
                      onPress={() =>
                        locked
                          ? openPro('feature')
                          : router.push({
                              pathname: '/hadith/[book]/[section]',
                              params: { book: b, section: String(last.section), number: String(last.number) },
                            })
                      }
                      accessibilityRole="button"
                      style={{ minHeight: 40, justifyContent: 'center' }}
                    >
                      <Text numberOfLines={1} style={{ color: ui.accent, fontFamily: font.medium, fontSize: 12, textAlign: 'center' }}>
                        {locked ? '🔒 ' : ''}
                        {t('continueReading')} ›
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, textAlign }}>{t('downloadHint')}</Text>
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 11, textAlign }}>
            {t('attribution')}
          </Text>
        </View>
      )}

      {debounced !== '' && postMatches.length > 0 && (
        <View>
          <SectionTitle>{t('fromYourPosts')}</SectionTitle>
          <View style={{ gap: 8 }}>
            {postMatches.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => openPost(p)}
                style={{
                  backgroundColor: ui.bgElev,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: ui.line,
                  padding: 12,
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    color: ui.text,
                    fontFamily: 'Amiri_400Regular',
                    fontSize: 20,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  }}
                  numberOfLines={2}
                >
                  {p.arabic}
                </Text>
                {p.translation && (
                  <Text
                    style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13 }}
                    numberOfLines={2}
                  >
                    {p.translation}
                  </Text>
                )}
                {p.source && (
                  <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 12 }}>
                    {l(p.source)}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {debounced !== '' && (
        <SectionTitle>
          {loadedEntries.length === 0
            ? t('needDownload')
            : `${toLocaleDigits(results.length, locale)} ${t('results')}`}
        </SectionTitle>
      )}
      {debounced !== '' && loadedEntries.length > 0 && results.length === 0 && (
        <Text
          style={{ color: ui.textMuted, fontFamily: font.regular, textAlign: 'center', paddingVertical: 20 }}
        >
          {t('noResults')}
        </Text>
      )}
    </View>
  );

  return (
    <FlatList<HadithEntry>
      data={results}
      keyExtractor={(e) => `${e.book}-${e.number}`}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 12 }}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => <HadithCard entry={item} showBook />}
    />
  );
}
