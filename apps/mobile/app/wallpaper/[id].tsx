import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatClock, getWallpaper, tagOf, type TranslationKey, type Wallpaper } from '@barakah/core';
import { useT } from '../../src/i18n';
import { ui } from '../../src/theme';
import { useToastStore } from '../../src/store';
import { GoldButton } from '../../src/features/onboarding/OnbChrome';
import { WallpaperArt } from '../../src/wallpapers/WallpaperArt';
import { captureWallpaper, saveWallpaper } from '../../src/wallpapers/saveWallpaper';
import { canSetWallpaper, setWallpaper, type WallpaperTarget } from '../../modules/widgets';

const TARGETS: ReadonlyArray<{ target: WallpaperTarget; label: TranslationKey; icon: keyof typeof Ionicons.glyphMap }> = [
  { target: 'home', label: 'wallpaperHome', icon: 'home-outline' },
  { target: 'lock', label: 'wallpaperLock', icon: 'lock-closed-outline' },
  { target: 'both', label: 'wallpaperBoth', icon: 'phone-portrait-outline' },
];
const SHADE = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 };

export default function WallpaperScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const wallpaper = typeof id === 'string' ? getWallpaper(id) : null;
  if (!wallpaper) return <Redirect href="/wallpapers" />;
  return <Preview wallpaper={wallpaper} />;
}

/**
 * The wallpaper at full screen, with a lock-screen clock over it so the person
 * sees how it will sit. Android sets it directly (home, lock or both); iOS has
 * no API for that, so there the picture goes to Photos through the share sheet.
 */
function Preview({ wallpaper }: { wallpaper: Wallpaper }) {
  const { t, font, rtl } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const toast = useToastStore((s) => s.show);
  const art = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const direct = canSetWallpaper();

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch {
      toast(t('wallpaperFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };
  const apply = (target: WallpaperTarget) => {
    setChoosing(false);
    void run(async () => {
      const ok = await setWallpaper(await captureWallpaper(art), target);
      toast(ok ? t('wallpaperSet') : t('wallpaperFailed'), ok ? 'success' : 'error');
    });
  };
  const save = () =>
    void run(async () => {
      const outcome = await saveWallpaper(art, `barakah-${wallpaper.id}`, t('wallpaperSave'));
      if (outcome === 'unavailable') toast(t('shareFailed'), 'error');
    });
  const close = () => (router.canGoBack() ? router.back() : router.replace('/wallpapers'));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View accessible accessibilityRole="image" accessibilityLabel={t('wallpaperPreview')}>
        <WallpaperArt ref={art} wallpaper={wallpaper} width={width} height={height} />
      </View>
      <LockClock top={insets.top + height * 0.05} width={width} />
      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        style={{
          position: 'absolute',
          top: insets.top + 8,
          ...(rtl ? { right: 12 } : { left: 12 }),
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.38)',
        }}
      >
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16, alignItems: 'center', paddingHorizontal: 16 }}>
        <View style={{ width: '100%', maxWidth: 520, gap: 10 }}>
          <GoldButton
            label={direct ? t('setAsWallpaper') : t('wallpaperSave')}
            icon={direct ? 'phone-portrait-outline' : 'download-outline'}
            busy={busy}
            onPress={() => (direct ? setChoosing(true) : save())}
          />
          {!direct && Platform.OS === 'ios' && (
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontFamily: font.regular, fontSize: 13, lineHeight: 18, textAlign: 'center', ...SHADE }}>
              {t('wallpaperIosHint')}
            </Text>
          )}
        </View>
      </View>
      <TargetSheet visible={choosing} onPick={apply} onClose={() => setChoosing(false)} />
    </View>
  );
}

/** The time and date as a lock screen shows them: over the preview only, never in the saved picture. */
function LockClock({ top, width }: { top: number; width: number }) {
  const { locale, font } = useT();
  const [now] = useState(() => new Date());
  const date = new Intl.DateTimeFormat(tagOf(locale), { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center', pointerEvents: 'none' }}
    >
      <Text style={{ color: 'rgba(255,255,255,0.92)', fontFamily: font.medium, fontSize: 17, ...SHADE }}>{date}</Text>
      <Text allowFontScaling={false} style={{ color: 'rgba(255,255,255,0.92)', fontFamily: font.semibold, fontSize: Math.min(96, width * 0.22), letterSpacing: -2, ...SHADE }}>
        {formatClock(now, locale)}
      </Text>
    </View>
  );
}

/** Android's choice of where the wallpaper goes. */
function TargetSheet({ visible, onPick, onClose }: { visible: boolean; onPick: (target: WallpaperTarget) => void; onClose: () => void }) {
  const { t, font, row, textAlign } = useT();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessible={false}
        style={{ flex: 1, backgroundColor: 'rgba(4,10,9,0.6)', justifyContent: 'flex-end', padding: 16 }}
      >
        {/* Taps inside the card must not dismiss it. */}
        <Pressable
          onPress={() => {}}
          style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: 2, padding: 8, backgroundColor: ui.bgElev2, borderRadius: ui.radius, borderWidth: 1, borderColor: ui.line }}
        >
          <Text accessibilityRole="header" style={{ color: ui.textMuted, fontFamily: font.semibold, fontSize: 13, textAlign, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}>
            {t('wallpaperWhere')}
          </Text>
          {TARGETS.map((o) => (
            <Pressable
              key={o.target}
              onPress={() => onPick(o.target)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: row,
                alignItems: 'center',
                gap: 12,
                minHeight: 52,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'transparent',
              })}
            >
              <Ionicons name={o.icon} size={20} color={ui.accent} />
              <Text style={{ flex: 1, color: ui.text, fontFamily: font.medium, fontSize: 16, textAlign }}>{t(o.label)}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: ui.textMuted, fontFamily: font.semibold, fontSize: 15 }}>{t('cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
