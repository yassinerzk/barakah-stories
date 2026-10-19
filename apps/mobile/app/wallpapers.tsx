import { FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FREE_WALLPAPERS, getBackground, getTheme, isFreeItem, pick, WALLPAPERS, type Wallpaper } from '@barakah/core';
import { usePro } from '../src/monetization/usePro';
import { ProLock } from '../src/monetization/ProLock';
import { useT } from '../src/i18n';
import { ui } from '../src/theme';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { WallpaperArt } from '../src/wallpapers/WallpaperArt';
import { wallpaperText } from '../src/wallpapers/words';

const GAP = 10;
/** Tiles take this phone's own shape, kept within phone-like bounds on tablets. */
const MIN_ASPECT = 1.5;
const MAX_ASPECT = 2.3;
const MAX_W = 900;

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

/** The wallpaper gallery: tap one to see it full screen and set or save it. */
export default function WallpapersScreen() {
  const { t, locale, font, row, textAlign } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locked } = usePro();
  const { width, height } = useWindowDimensions();
  const layoutW = Math.min(width > 0 ? width : 390, MAX_W);
  const cols = layoutW >= 700 ? 4 : 3;
  const tileW = Math.floor((layoutW - 32 - GAP * (cols - 1)) / cols);
  const aspect = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, height > 0 && width > 0 ? height / width : 2));
  const tileH = Math.round(tileW * aspect);

  /** What a screen reader says for a tile: its words, or the picture's name. */
  const describe = (w: Wallpaper) => {
    const words = wallpaperText(w.words, locale);
    const name = w.base.kind === 'photo' ? pick(locale, getBackground(w.base.background)?.name ?? { en: w.id }) : pick(locale, getTheme(w.base.theme).name);
    return fill(t('wallpaperA11y'), { words: words ? [words.arabic, words.caption].filter(Boolean).join(', ') : name });
  };

  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScreenHeader title={t('wallpapersTitle')} />
      <FlatList
        data={WALLPAPERS}
        key={cols}
        numColumns={cols}
        keyExtractor={(w) => w.id}
        columnWrapperStyle={{ gap: GAP, flexDirection: row }}
        contentContainerStyle={{ width: layoutW, alignSelf: 'center', gap: GAP, padding: 16, paddingBottom: insets.bottom + 32 }}
        initialNumToRender={9}
        ListHeaderComponent={
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, textAlign, marginBottom: 6 }}>
            {t('wallpapersIntro')}
          </Text>
        }
        renderItem={({ item, index }) => {
          // Locked ones still open full screen: people can look before they buy.
          const proOnly = locked && !isFreeItem(index, FREE_WALLPAPERS);
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/wallpaper/[id]', params: { id: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={proOnly ? `${describe(item)}, ${t('proOnly')}` : describe(item)}
              style={({ pressed }) => ({ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: ui.line, opacity: pressed ? 0.85 : 1 })}
            >
              <WallpaperArt wallpaper={item} width={tileW} height={tileH} thumb />
              {proOnly && <ProLock size={14} />}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
