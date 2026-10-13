import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CATEGORIES,
  dailyPicks,
  DEFAULT_DESIGN,
  designFromPost,
  getPost,
  getPostsByCategory,
  deedStats,
  POSTS,
  tagOf,
  toLocaleDigits,
  type CategoryId,
  type Post,
} from '@barakah/core';
import { useT } from '../../src/i18n';
import { ui } from '../../src/theme';
import { useEditorStore, useRecentStore } from '../../src/store';
import { useDeedsStore } from '../../src/practice/store';
import { useHijriToday } from '../../src/hooks/useHijriToday';
import { useLayoutWidth } from '../../src/hooks/useLayoutWidth';
import { HomePrayerCard } from '../../src/features/prayer/HomePrayerCard';
import { PostThumb } from '../../src/components/PostThumb';
import { PostStrip } from '../../src/components/PostStrip';
import { ScrollTopButton } from '../../src/components/ScrollTopButton';
import { Ionicons } from '@expo/vector-icons';
import { LanguageSheet } from '../../src/components/LanguageSheet';
import { useScrollTop } from '../../src/hooks/useScrollTop';
import { REMINDER_OFFER_DELAY_MS, useReminderStore } from '../../src/notifications/store';
import { Button, Chip, SectionTitle } from '../../src/components/ui';

/** Home's shortcuts to the daily-practice screens. */
const PRACTICE = [
  { route: '/tasbih', label: 'tasbih', icon: 'radio-button-on-outline' },
  { route: '/deeds', label: 'deeds', icon: 'checkmark-done-outline' },
  { route: '/duas', label: 'duas', icon: 'hand-left-outline' },
  { route: '/names', label: 'names99', icon: 'sparkles-outline' },
  { route: '/calendar', label: 'calendar', icon: 'calendar-outline' },
] as const;

/** Home's shortcuts to what the app can put on the phone itself. */
const FOR_PHONE = [
  { route: '/widgets', title: 'widgetsTitle', body: 'widgetsTagline', icon: 'apps-outline' },
  { route: '/wallpapers', title: 'wallpapersTitle', body: 'wallpapersTagline', icon: 'image-outline' },
] as const;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export default function HomeScreen() {
  const { t, l, locale, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const width = useLayoutWidth();
  const [languageOpen, setLanguageOpen] = useState(false);
  const { now, label: hijriLabel, occasions } = useHijriToday();
  const recentIds = useRecentStore((s) => s.ids);
  const touch = useRecentStore((s) => s.touch);
  const load = useEditorStore((s) => s.load);
  const deedLog = useDeedsStore((s) => s.log);
  const streak = useMemo(() => deedStats(deedLog, now).streak, [deedLog, now]);
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  // The grid runs to ~150 rows, so getting back to the top by hand is a chore.
  const { ref: listRef, visible: canScrollTop, onScroll, scrollToTop } = useScrollTop<Post[]>();

  const colWidth = Math.floor((width - 32 - 12) / 2);
  // Seasonal cards first, then a date-seeded rotation over the whole catalogue,
  // so the section is different each day and never empty. See packages/core/src/daily.ts.
  const todays = useMemo(
    () =>
      dailyPicks({
        all: POSTS,
        seasonal: occasions.flatMap((o) => getPostsByCategory(o.category)),
        date: now,
      }),
    [occasions, now],
  );
  const recent = useMemo(() => recentIds.map((id) => getPost(id)).filter((p): p is Post => !!p), [recentIds]);
  const posts = useMemo(() => (category === 'all' ? [...POSTS] : getPostsByCategory(category)), [category]);
  const rows = useMemo(() => chunk(posts, 2), [posts]);
  const categories = useMemo(() => [...CATEGORIES].sort((a, b) => a.order - b.order), []);

  // Offered a few seconds after the home screen has settled, and read through
  // getState() so the launch counter bumped by the root layout is already in.
  useEffect(() => {
    const id = setTimeout(() => {
      const store = useReminderStore.getState();
      if (store.dueToOffer()) store.openOffer('offer');
    }, REMINDER_OFFER_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  const openPost = (post: Post) => {
    touch(post.id);
    load(designFromPost(post, locale));
    router.push('/editor');
  };
  const openBlank = () => {
    load({ ...DEFAULT_DESIGN, arabic: '' });
    router.push('/editor');
  };

  const header = (
    <View style={{ paddingTop: insets.top + 8 }}>
      {/* greeting */}
      <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 22, textAlign }}>
            {t('homeGreeting')}
          </Text>
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>
            {new Intl.DateTimeFormat(tagOf(locale), { weekday: 'short', day: 'numeric', month: 'short' }).format(now)}
            {hijriLabel !== '' ? ` · ${hijriLabel}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => setLanguageOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('language')}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: ui.lineStrong,
            backgroundColor: ui.bgElev,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="language-outline" size={20} color={ui.text} />
        </Pressable>
      </View>

      <HomePrayerCard onOpen={() => router.push('/prayer')} />

      {/* daily practice */}
      <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20, marginBottom: 10 }}>
        <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 17 }}>
          {t('dailyPractice')}
        </Text>
        {streak > 0 && (
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13 }}>
            {t('streakDays').replace('{n}', toLocaleDigits(streak, locale))}
          </Text>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {PRACTICE.map((p) => (
          <Pressable
            key={p.route}
            onPress={() => router.push(p.route)}
            accessibilityRole="button"
            accessibilityLabel={t(p.label)}
            style={({ pressed }) => ({
              width: 84,
              minHeight: 84,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 8,
              backgroundColor: pressed ? ui.bgElev2 : ui.bgElev,
              borderWidth: 1,
              borderColor: 'rgba(217,182,92,0.18)',
            })}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,182,92,0.14)' }}>
              <Ionicons name={p.icon} size={18} color={ui.accent} />
            </View>
            <Text numberOfLines={1} style={{ color: ui.text, fontFamily: font.medium, fontSize: 12 }}>
              {t(p.label)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* for your phone: widgets and wallpapers */}
      <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 17, textAlign, marginTop: 20, marginBottom: 10 }}>
        {t('forYourPhone')}
      </Text>
      <View style={{ flexDirection: row, gap: 10 }}>
        {FOR_PHONE.map((p) => (
          <Pressable
            key={p.route}
            onPress={() => router.push(p.route)}
            accessibilityRole="button"
            accessibilityLabel={`${t(p.title)}. ${t(p.body)}`}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 96,
              gap: 8,
              padding: 12,
              borderRadius: 16,
              backgroundColor: pressed ? ui.bgElev2 : ui.bgElev,
              borderWidth: 1,
              borderColor: 'rgba(217,182,92,0.18)',
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: row === 'row' ? 'flex-start' : 'flex-end',
                backgroundColor: 'rgba(217,182,92,0.14)',
              }}
            >
              <Ionicons name={p.icon} size={18} color={ui.accent} />
            </View>
            <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15, textAlign }}>{t(p.title)}</Text>
            <Text numberOfLines={2} style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, lineHeight: 16, textAlign }}>
              {t(p.body)}
            </Text>
          </Pressable>
        ))}
      </View>

      <PostStrip title={t('todaysPosts')} posts={todays} hijriLabel={hijriLabel} onOpen={openPost} />
      <PostStrip title={t('recent')} posts={recent} hijriLabel={hijriLabel} onOpen={openPost} />

      <SectionTitle
        right={<Button label={`＋ ${t('blank')}`} onPress={openBlank} size="sm" variant="ghost" />}
      >
        {t('allPosts')}
      </SectionTitle>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16, marginBottom: 12 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        <Chip label={t('all')} active={category === 'all'} onPress={() => setCategory('all')} />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={`${c.icon} ${l(c.label)}`}
            active={category === c.id}
            onPress={() => setCategory(c.id)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={rows}
        keyExtractor={(r) => r.map((p) => p.id).join('|')}
        ListHeaderComponent={header}
        extraData={colWidth}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        initialNumToRender={4}
        windowSize={5}
        renderItem={({ item }) => (
          <View style={{ flexDirection: row, gap: 12, marginBottom: 16 }}>
            {item.map((p) => (
              <PostThumb key={p.id} post={p} width={colWidth} hijriLabel={hijriLabel} onOpen={openPost} />
            ))}
          </View>
        )}
      />
      <ScrollTopButton visible={canScrollTop} onPress={scrollToTop} />
      <LanguageSheet visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </View>
  );
}
