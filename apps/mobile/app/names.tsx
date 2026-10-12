import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_DESIGN, DIVINE_NAMES, nameOfTheDay, toLocaleDigits, type DivineName } from '@barakah/core';
import { useT } from '../src/i18n';
import { ui } from '../src/theme';
import { useEditorStore } from '../src/store';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Button } from '../src/components/ui';

const GOLD_SOFT = 'rgba(217,182,92,';

/** The 99 Names of Allah: today's Name on top, then all of them; each opens into a card. */
export default function NamesScreen() {
  const { t, l, locale, font } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const load = useEditorStore((s) => s.load);
  const [open, setOpen] = useState<DivineName | null>(null);
  const today = nameOfTheDay(new Date());

  const makeCard = (n: DivineName) => {
    setOpen(null);
    load({ ...DEFAULT_DESIGN, kind: 'dhikr', headline: n.transliteration, arabic: n.arabic, translation: l(n.meaning), source: '' });
    router.push('/editor');
  };

  const header = (
    <Pressable
      onPress={() => setOpen(today)}
      accessibilityRole="button"
      accessibilityLabel={`${t('nameOfDay')}: ${today.transliteration}, ${l(today.meaning)}`}
      style={{
        margin: 16,
        marginTop: 8,
        borderRadius: 20,
        padding: 18,
        alignItems: 'center',
        gap: 4,
        backgroundColor: ui.bgElev2,
        borderWidth: 1,
        borderColor: `${GOLD_SOFT}0.5)`,
      }}
    >
      <Text style={{ color: ui.textMuted, fontFamily: font.medium, fontSize: 12, letterSpacing: 1.5 }}>{t('nameOfDay').toLocaleUpperCase(locale)}</Text>
      <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 40, lineHeight: 72, marginTop: 8 }}>{today.arabic}</Text>
      <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 17 }}>{today.transliteration}</Text>
      <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 14 }}>{l(today.meaning)}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScreenHeader title={t('namesTitle')} />
      <FlatList
        data={DIVINE_NAMES}
        keyExtractor={(n) => String(n.n)}
        numColumns={3}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 24 }}
        columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
        initialNumToRender={18}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setOpen(item)}
            accessibilityRole="button"
            accessibilityLabel={`${toLocaleDigits(item.n, locale)}. ${item.transliteration}, ${l(item.meaning)}`}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 104,
              borderRadius: 16,
              paddingVertical: 10,
              paddingHorizontal: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? ui.bgElev2 : ui.bgElev,
              borderWidth: 1,
              borderColor: `${GOLD_SOFT}0.18)`,
            })}
          >
            <Text style={{ position: 'absolute', top: 6, start: 8, color: ui.textMuted, fontFamily: font.regular, fontSize: 10 }}>{toLocaleDigits(item.n, locale)}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 24, lineHeight: 42 }}>
              {item.arabic}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: ui.text, fontFamily: font.medium, fontSize: 12, textAlign: 'center' }}>
              {item.transliteration}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
        <Pressable onPress={() => setOpen(null)} accessibilityLabel={t('close')} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          {open && (
            <Pressable
              accessibilityViewIsModal
              style={{
                backgroundColor: ui.bgElev,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: insets.bottom + 24,
                gap: 6,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: `${GOLD_SOFT}0.3)`,
              }}
            >
              <Pressable
                onPress={() => setOpen(null)}
                accessibilityRole="button"
                accessibilityLabel={t('close')}
                style={{ position: 'absolute', top: 8, end: 8, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={22} color={ui.text} />
              </Pressable>
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13 }}>
                {toLocaleDigits(open.n, locale)} / {toLocaleDigits(99, locale)}
              </Text>
              <Text style={{ color: ui.accent, fontFamily: 'Amiri_400Regular', fontSize: 52, lineHeight: 86 }}>{open.arabic}</Text>
              <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 20 }}>{open.transliteration}</Text>
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 16, textAlign: 'center', marginBottom: 12 }}>{l(open.meaning)}</Text>
              <View style={{ alignSelf: 'stretch' }}>
                <Button label={t('makeCard')} onPress={() => makeCard(open)} />
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}
