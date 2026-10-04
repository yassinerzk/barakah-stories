import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { designFromHadith, getSection, HADITH_BOOKS, toLocaleDigits, type HadithEntry } from '@barakah/core';
import { useEditorStore } from '../store';
import { useT } from '../i18n';
import { ui } from '../theme';
import { LARGE_TEXT_SCALE, useA11yStore } from '../a11y';

interface HadithCardProps {
  entry: HadithEntry;
  showBook?: boolean;
  arabicSize?: number;
}

export const HadithCard = memo(function HadithCard({ entry, showBook, arabicSize: baseSize = 21 }: HadithCardProps) {
  const { t, locale, font, row, textAlign } = useT();
  const largeText = useA11yStore((s) => s.largeText);
  const boldArabic = useA11yStore((s) => s.boldArabic);
  const arabicSize = baseSize * (largeText ? LARGE_TEXT_SCALE : 1);
  const router = useRouter();
  const loadDesign = useEditorStore((s) => s.load);
  const section = getSection(entry.book, entry.section);
  const createStory = () => {
    loadDesign(designFromHadith(entry, locale));
    router.push('/editor');
  };
  return (
    <View
      style={{
        backgroundColor: ui.bgElev,
        borderRadius: ui.radius,
        borderWidth: 1,
        borderColor: ui.line,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text
          style={{ color: ui.accent, fontFamily: font.medium, fontSize: 12, flexShrink: 1 }}
          numberOfLines={1}
        >
          {showBook ? `${HADITH_BOOKS[entry.book].name} · ` : ''}
          {section?.en ?? ''}
        </Text>
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12 }}>
          {t('hadithNumber')} {toLocaleDigits(entry.number, locale)}
        </Text>
      </View>
      {entry.ar !== '' && (
        <Text
          style={{
            color: ui.text,
            fontFamily: boldArabic ? 'Amiri_700Bold' : 'Amiri_400Regular',
            fontSize: arabicSize,
            lineHeight: arabicSize * 1.85,
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
        >
          {entry.ar}
        </Text>
      )}
      <Text
        style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 15, lineHeight: 23, textAlign }}
      >
        {entry.en}
      </Text>
      <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
        {entry.grade ? (
          <Text style={{ color: ui.textMuted, fontFamily: font.medium, fontSize: 12 }}>
            {t('grade')}: {entry.grade}
          </Text>
        ) : (
          <View />
        )}
        <Pressable
          onPress={createStory}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: row,
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: ui.accent,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="share-social-outline" size={14} color={ui.accentInk} />
          <Text style={{ color: ui.accentInk, fontFamily: font.semibold, fontSize: 12 }}>
            {t('createStory')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});
