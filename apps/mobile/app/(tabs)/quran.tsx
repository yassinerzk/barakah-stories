import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { continuePosition, getChapterMeta, QURAN_INDEX, quranPercent, toLocaleDigits } from '@barakah/core';
import { useT } from '../../src/i18n';
import { ui } from '../../src/theme';
import { useQuranStore } from '../../src/store';

export default function QuranScreen() {
  const { t, locale, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const finished = useQuranStore((s) => s.finished);
  const lastRead = useQuranStore((s) => s.lastRead);
  const pos = continuePosition({ lastRead, finished });
  const meta = getChapterMeta(pos.surah)!;
  const percent = quranPercent(finished);

  return (
    <FlatList
      data={QURAN_INDEX}
      keyExtractor={(c) => String(c.id)}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32 }}
      initialNumToRender={20}
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 14 }}>
          <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 24, textAlign }}>
            {t('quranTitle')}
          </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/surah/[id]',
                params: { id: String(pos.surah), ayah: String(pos.ayah) },
              })
            }
            style={{
              backgroundColor: ui.bgElev2,
              borderRadius: ui.radius,
              borderWidth: 1,
              borderColor: ui.line,
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>
              {lastRead ? t('continueReading') : t('startReading')}
            </Text>
            <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 20 }}>
                {meta.transliteration} · {toLocaleDigits(pos.surah, locale)}:
                {toLocaleDigits(pos.ayah, locale)}
              </Text>
              <Text style={{ color: ui.accent, fontFamily: 'Amiri_700Bold', fontSize: 24 }}>{meta.name}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: ui.bg, overflow: 'hidden' }}>
              <View
                style={{ width: `${Math.max(1, percent)}%`, height: '100%', backgroundColor: ui.accent }}
              />
            </View>
            <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, textAlign }}>
              {toLocaleDigits(finished.length, locale)} {t('chaptersFinished')} · {percent}% {t('ofQuran')}
            </Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => {
        const done = finished.includes(item.id);
        return (
          <Pressable
            onPress={() => router.push({ pathname: '/surah/[id]', params: { id: String(item.id) } })}
            accessibilityRole="button"
            // One clear announcement, including the finished state the checkmark shows.
            accessibilityLabel={`${toLocaleDigits(item.id, locale)}. ${item.transliteration}, ${item.translation}, ${toLocaleDigits(item.total_verses, locale)} ${t('verses')}${done ? `, ${t('completedLabel')}` : ''}`}
            style={{
              flexDirection: row,
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: ui.line,
            }}
          >
            <View
              style={{
                minWidth: 38,
                minHeight: 38,
                borderRadius: 10,
                backgroundColor: done ? ui.accent : ui.bgElev,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {done ? (
                <Ionicons name="checkmark" size={20} color={ui.accentInk} />
              ) : (
                <Text style={{ color: ui.textMuted, fontFamily: font.medium, fontSize: 13 }} maxFontSizeMultiplier={1.4}>
                  {toLocaleDigits(item.id, locale)}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 16, textAlign }}>
                {item.transliteration}
              </Text>
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, textAlign }}>
                {item.translation} · {t(item.type)} · {toLocaleDigits(item.total_verses, locale)}{' '}
                {t('verses')}
              </Text>
            </View>
            <Text style={{ color: ui.accent, fontFamily: 'Amiri_700Bold', fontSize: 22 }}>{item.name}</Text>
          </Pressable>
        );
      }}
    />
  );
}
