import { useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';
import { useT } from '../i18n';
import { ui } from '../theme';
import { safePause, safePlay } from '../media/catalog';

/**
 * The full adhan. A notification can only carry a short clip — Android cuts a
 * notification's sound the moment the shade is pulled down, and iOS refuses
 * anything over 30 seconds — so tapping an alert opens the app and plays the
 * whole recording here, in the foreground, with a clear way to stop it.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FULL_ADHAN = require('../../assets/sounds/adhan_full.mp3');

interface AdhanState {
  playing: boolean;
  play: () => void;
  stop: () => void;
}

export const useAdhanStore = create<AdhanState>()((set) => ({
  playing: false,
  play: () => set({ playing: true }),
  stop: () => set({ playing: false }),
}));

/** Opens the player when the user taps a prayer alert set to adhan, including a cold start. */
export function useAdhanFromNotifications(): void {
  const play = useAdhanStore((s) => s.play);
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const data = last?.notification.request.content.data as { kind?: string; mode?: string } | undefined;
    if (last?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER && data?.kind === 'prayer' && data.mode === 'adhan') {
      play();
      void Notifications.clearLastNotificationResponseAsync();
    }
  }, [last, play]);
}

export function AdhanPlayer() {
  const playing = useAdhanStore((s) => s.playing);
  if (Platform.OS === 'web' || !playing) return null;
  return <AdhanBar />;
}

function AdhanBar() {
  const { t, font, row } = useT();
  const insets = useSafeAreaInsets();
  const stop = useAdhanStore((s) => s.stop);
  const player = useAudioPlayer(FULL_ADHAN);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    let cancelled = false;
    // Plays even with the ringer switch on silent: the user just asked for it.
    void setAudioModeAsync({ playsInSilentMode: true }).finally(() => {
      if (!cancelled) safePlay(player);
    });
    return () => {
      cancelled = true;
    };
  }, [player]);

  useEffect(() => {
    if (status.didJustFinish) stop();
  }, [status.didJustFinish, stop]);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: insets.bottom + 72,
        backgroundColor: ui.bgElev2,
        borderRadius: ui.radius,
        borderWidth: 1,
        borderColor: ui.accent,
        padding: 14,
        flexDirection: row,
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Ionicons name="volume-high" size={22} color={ui.accent} importantForAccessibility="no" accessibilityElementsHidden />
      <Text style={{ flex: 1, color: ui.text, fontFamily: font.semibold, fontSize: 16 }}>{t('modeAdhan')}</Text>
      <Pressable
        onPress={() => {
          safePause(player);
          stop();
        }}
        accessibilityRole="button"
        accessibilityLabel={t('stopAdhan')}
        hitSlop={8}
        style={{ backgroundColor: ui.accent, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, minHeight: 48, justifyContent: 'center' }}
      >
        <Text style={{ color: ui.accentInk, fontFamily: font.semibold }}>{t('stopAdhan')}</Text>
      </Pressable>
    </View>
  );
}
