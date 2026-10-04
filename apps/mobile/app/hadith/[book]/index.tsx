import { FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HADITH_BOOKS, toLocaleDigits, type HadithBookId } from '@barakah/core';
import { useT } from '../../../src/i18n';
import { ui } from '../../../src/theme';
import { useHadithStore } from '../../../src/store';
import { Button } from '../../../src/components/ui';

export default function HadithBookScreen() {
  const { book } = useLocalSearchParams<{ book: HadithBookId }>();
  const { t, locale, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const meta = HADITH_BOOKS[book];
  const last = useHadithStore((s) => s.lastRead[book]);
  if (!meta) return null;
  return (
    <FlatList
      data={meta.sections}
      keyExtractor={(s) => String(s.id)}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: 32 }}
      ListHeaderComponent={
        <View style={{ gap: 10, marginBottom: 10 }}>
          <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
            <Button label={`← ${t('back')}`} size="sm" variant="ghost" onPress={() => router.back()} />
            <Text style={{ color: ui.accent, fontFamily: 'Amiri_700Bold', fontSize: 24 }}>{meta.nameAr}</Text>
          </View>
          <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 22, textAlign }}>
            {meta.name}
          </Text>
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>
            {toLocaleDigits(meta.sections.length, locale)} {t('topics')}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const isLast = last?.section === item.id;
        return (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/hadith/[book]/[section]',
                params: { book, section: String(item.id) },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`${toLocaleDigits(item.id, locale)}. ${item.en}${isLast ? `, ${t('lastReadLabel')}` : ''}`}
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
                minWidth: 36,
                minHeight: 36,
                borderRadius: 10,
                backgroundColor: isLast ? ui.accent : ui.bgElev,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{ color: isLast ? ui.accentInk : ui.textMuted, fontFamily: font.medium, fontSize: 12 }}
                maxFontSizeMultiplier={1.4}
              >
                {toLocaleDigits(item.id, locale)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: ui.text, fontFamily: font.medium, fontSize: 15, textAlign }}>
                {item.en}
              </Text>
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, textAlign }}>
                {toLocaleDigits(item.first, locale)}–{toLocaleDigits(item.last, locale)}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
