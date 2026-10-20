import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES, designFromPost, POSTS, postTranslation, toLocaleDigits, type CategoryId, type Post } from '@barakah/core';
import { useT } from '../src/i18n';
import { ProGate } from '../src/monetization/ProLock';
import { ui } from '../src/theme';
import { useEditorStore, useRecentStore } from '../src/store';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Chip } from '../src/components/ui';

const GOLD_SOFT = 'rgba(217,182,92,';
/** Every dua and dhikr in the catalogue, grouped by the occasion it belongs to. */
const DUAS: readonly Post[] = POSTS.filter((p) => p.kind === 'dua' || p.kind === 'dhikr');

/** Duas and adhkar to read, count and turn into a card. */
function DuasScreen() {
  const { t, l, locale, font, row, textAlign } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const load = useEditorStore((s) => s.load);
  const touch = useRecentStore((s) => s.touch);
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [counts, setCounts] = useState<Record<string, number>>({});

  const categories = useMemo(() => {
    const present = new Set(DUAS.map((p) => p.category));
    return [...CATEGORIES].filter((c) => present.has(c.id)).sort((a, b) => a.order - b.order);
  }, []);
  const list = category === 'all' ? DUAS : DUAS.filter((p) => p.category === category);

  const makeCard = (post: Post) => {
    touch(post.id);
    load(designFromPost(post, locale));
    router.push('/editor');
  };

  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScreenHeader title={t('duasTitle')} />
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
        ListHeaderComponent={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 6 }}
          >
            <Chip label={t('allCategories')} active={category === 'all'} onPress={() => setCategory('all')} />
            {categories.map((c) => (
              <Chip key={c.id} label={`${c.icon} ${l(c.label)}`} active={category === c.id} onPress={() => setCategory(c.id)} />
            ))}
          </ScrollView>
        }
        renderItem={({ item }) => {
          const n = counts[item.id] ?? 0;
          const translation = postTranslation(item, locale);
          return (
            <View style={{ borderRadius: 18, padding: 16, gap: 10, backgroundColor: ui.bgElev, borderWidth: 1, borderColor: `${GOLD_SOFT}0.18)` }}>
              {item.headline && <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 13, textAlign }}>{l(item.headline)}</Text>}
              <Text style={{ color: ui.text, fontFamily: 'Amiri_400Regular', fontSize: 22, lineHeight: 40, textAlign: 'right', writingDirection: 'rtl' }}>{item.arabic}</Text>
              {translation !== '' && <Text style={{ color: ui.text, fontFamily: font.regular, fontSize: 15, lineHeight: 22, textAlign }}>{translation}</Text>}
              {item.source && <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, textAlign }}>{l(item.source)}</Text>}
              <View style={{ flexDirection: row, alignItems: 'center', gap: 8, marginTop: 2 }}>
                <Pressable
                  onPress={() => setCounts((c) => ({ ...c, [item.id]: (c[item.id] ?? 0) + 1 }))}
                  onLongPress={() => setCounts((c) => ({ ...c, [item.id]: 0 }))}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('tasbih')}: ${toLocaleDigits(n, locale)}`}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    minWidth: 64,
                    paddingHorizontal: 14,
                    borderRadius: 22,
                    flexDirection: row,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderWidth: 1,
                    borderColor: `${GOLD_SOFT}0.6)`,
                    backgroundColor: pressed ? ui.bgElev2 : 'transparent',
                  })}
                >
                  <Ionicons name="finger-print" size={16} color={ui.accent} />
                  <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 15, fontVariant: ['tabular-nums'] }}>{toLocaleDigits(n, locale)}</Text>
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() => makeCard(item)}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    minHeight: 44,
                    paddingHorizontal: 14,
                    borderRadius: 22,
                    flexDirection: row,
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: pressed ? '#C9A24A' : ui.accent,
                  })}
                >
                  <Ionicons name="add" size={16} color={ui.accentInk} />
                  <Text style={{ color: ui.accentInk, fontFamily: font.semibold, fontSize: 14 }}>{t('makeCard')}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

/** A Pro feature: free users see how to unlock it. */
export default function DuasRoute() {
  return (
    <ProGate title="duasTitle">
      <DuasScreen />
    </ProGate>
  );
}
