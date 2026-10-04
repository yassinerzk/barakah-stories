import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  designFromPost,
  getSection,
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
import { ui } from '../../src/theme';
import { useEditorStore, useHadithStore, useRecentStore } from '../../src/store';
import { useHadithLibrary } from '../../src/hadith/library';
import { Button, Chip, SectionTitle } from '../../src/components/ui';
import { HadithCard } from '../../src/components/HadithCard';

const BOOKS: HadithBookId[] = ['bukhari', 'muslim'];

export default function HadithScreen() {
  const { t, l, locale, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
      <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 24, textAlign }}>
        {t('hadithTitle')}
      </Text>
      <View
        style={{
          flexDirection: row,
          alignItems: 'center',
          gap: 8,
          backgroundColor: ui.bgElev,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: ui.lineStrong,
          paddingHorizontal: 12,
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
        />
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
        <Chip label={`🤲 ${t('duaOnly')}`} active={duaOnly} onPress={() => setDuaOnly(!duaOnly)} />
      </View>

      {debounced === '' && (
        <View style={{ gap: 12 }}>
          {BOOKS.map((b) => {
            const meta = HADITH_BOOKS[b];
            const st = status[b];
            const ready = st === 'ready' || !!entries[b];
            const last = lastRead[b];
            return (
              <View
                key={b}
                style={{
                  backgroundColor: ui.bgElev2,
                  borderRadius: ui.radius,
                  borderWidth: 1,
                  borderColor: ui.line,
                  padding: 16,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 18 }}>{meta.name}</Text>
                  <Text style={{ color: ui.accent, fontFamily: 'Amiri_700Bold', fontSize: 22 }}>
                    {meta.nameAr}
                  </Text>
                </View>
                <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>
                  {toLocaleDigits(meta.sections.length, locale)} {t('topics')} ·{' '}
                  {toLocaleDigits(meta.hadithCount, locale)} {t('hadithNumber')}
                </Text>
                {ready ? (
                  <View style={{ flexDirection: row, gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button
                      label={`📖 ${t('readFullBook')}`}
                      size="sm"
                      variant="primary"
                      onPress={() => router.push({ pathname: '/hadith/[book]', params: { book: b } })}
                    />
                    {last && (
                      <Button
                        label={`${t('continueReading')} · ${getSection(b, last.section)?.en ?? ''}`}
                        size="sm"
                        onPress={() =>
                          router.push({
                            pathname: '/hadith/[book]/[section]',
                            params: { book: b, section: String(last.section), number: String(last.number) },
                          })
                        }
                      />
                    )}
                    <Text
                      style={{
                        color: ui.success === '#1f5a44' ? '#7fd1a8' : ui.accent,
                        fontFamily: font.regular,
                        fontSize: 12,
                      }}
                    >
                      ✓ {t('downloadedBook')}
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 6 }}>
                    <Button
                      label={
                        st === 'loading'
                          ? t('downloading')
                          : `⬇ ${t('downloadBook')} (~${HADITH_SOURCES[b].approxMb} MB)`
                      }
                      size="sm"
                      variant="primary"
                      disabled={st === 'loading'}
                      onPress={() => void ensure(b)}
                    />
                    <Text
                      style={{
                        color: st === 'error' ? ui.danger : ui.textMuted,
                        fontFamily: font.regular,
                        fontSize: 12,
                        textAlign,
                      }}
                    >
                      {st === 'error' ? t('shareFailed') : t('downloadHint')}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
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
