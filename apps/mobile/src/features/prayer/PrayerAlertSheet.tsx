import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ALERT_MODES, PRAYER_NAMES, type AlertMode, type AlertPrayer } from '@barakah/core';
import { useT } from '../../i18n';
import { ui } from '../../theme';
import { usePrayerStore, useToastStore } from '../../store';
import { usePrayerAlertStore } from '../../notifications/prayerAlertStore';
import { hasBundledSounds, sendTestAlert } from '../../notifications/prayerScheduler';
import { useAdhanStore } from '../../notifications/AdhanPlayer';
import { Button } from '../../components/ui';
import { usePro } from '../../monetization/usePro';
import { ProLock } from '../../monetization/ProLock';
import { useCustomAdhanStore, type AdhanPickOutcome } from '../../notifications/customAdhan';

/** Time for the sheet's slide-out before the Pro screen opens. */
const SHEET_CLOSE_MS = 350;
const PICK_MESSAGE: Record<Exclude<AdhanPickOutcome, 'cancelled'>, { key: 'adhanChosen' | 'adhanTooLarge' | 'adhanNotAudio' | 'adhanPickFailed'; ok: boolean }> = {
  picked: { key: 'adhanChosen', ok: true },
  tooLarge: { key: 'adhanTooLarge', ok: false },
  notAudio: { key: 'adhanNotAudio', ok: false },
  error: { key: 'adhanPickFailed', ok: false },
};

/** Which recording the adhan plays, and (Pro) a way to use your own. */
function AdhanSoundCard({ onLocked }: { onLocked: () => void }) {
  const { t, font, row, textAlign } = useT();
  const toast = useToastStore((s) => s.show);
  const { locked } = usePro();
  const customName = useCustomAdhanStore((s) => s.name);
  const pick = useCustomAdhanStore((s) => s.pick);
  const clear = useCustomAdhanStore((s) => s.clear);
  const stop = useAdhanStore((s) => s.stop);
  const name = !locked && customName ? customName : t('adhanDefault');

  const choose = async () => {
    if (locked) return onLocked();
    stop();
    const outcome = await pick();
    if (outcome === 'cancelled') return;
    const { key, ok } = PICK_MESSAGE[outcome];
    toast(t(key), ok ? 'success' : 'error');
  };

  return (
    <View style={{ marginTop: 10, gap: 6, padding: 12, borderRadius: ui.radius, borderWidth: 1, borderColor: ui.line }}>
      <View style={{ flexDirection: row, alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, color: ui.textMuted, fontFamily: font.medium, fontSize: 13, textAlign }}>{t('adhanSound')}</Text>
        {locked && <ProLock size={12} corner={false} />}
      </View>
      <Text numberOfLines={1} style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15, textAlign }}>
        {name}
      </Text>
      <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, lineHeight: 17, textAlign }}>{t('adhanCustomNote')}</Text>
      <View style={{ flexDirection: row, gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <Button label={t('chooseAdhan')} size="sm" variant="secondary" onPress={() => void choose()} />
        {!locked && customName && (
          <Button
            label={t('useDefaultAdhan')}
            size="sm"
            variant="ghost"
            onPress={() => {
              stop();
              clear();
            }}
          />
        )}
      </View>
    </View>
  );
}

const MODE_KEY = { adhan: 'modeAdhan', sound: 'modeSound', vibrate: 'modeVibrate', off: 'modeOff' } as const;
const MODE_ICON = { adhan: 'musical-notes', sound: 'notifications', vibrate: 'phone-portrait', off: 'notifications-off' } as const;

interface Props {
  prayer: AlertPrayer | null;
  onClose: () => void;
}

/** One prayer's alert: adhan, the system sound, vibration only, or nothing. */
export function PrayerAlertSheet({ prayer: requested, onClose }: Props) {
  const { t, l, locale, font, row, textAlign } = useT();
  // Keeps showing the last prayer while the sheet slides away after closing.
  const [prayer, setShown] = useState<AlertPrayer | null>(requested);
  if (requested && requested !== prayer) setShown(requested);
  const insets = useSafeAreaInsets();
  const mode = usePrayerAlertStore((s) => (prayer ? s.prefs.modes[prayer] : 'off'));
  const setMode = usePrayerAlertStore((s) => s.setMode);
  const location = usePrayerStore((s) => s.location);
  const toast = useToastStore((s) => s.show);
  const playing = useAdhanStore((s) => s.playing);
  const play = useAdhanStore((s) => s.play);
  const stop = useAdhanStore((s) => s.stop);
  const { openPro } = usePro();

  if (!prayer) return null;
  const visible = requested !== null;
  const name = l(PRAYER_NAMES.find((p) => p.id === prayer)!.label);

  const test = async () => {
    if (!location) return;
    const ok = await sendTestAlert(location, mode === 'off' ? 'adhan' : mode, locale);
    toast(ok ? t('testAlertSent') : t('alertsBlocked'), ok ? 'success' : 'error');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={onClose}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
      />
      <View
        accessibilityViewIsModal
        style={{
          backgroundColor: ui.bgElev,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          paddingBottom: insets.bottom + 20,
          gap: 8,
        }}
      >
        <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 20, textAlign }}>
          {name} · {t('alertFor')}
        </Text>

        <View accessibilityRole="radiogroup" style={{ gap: 6, marginTop: 6 }}>
          {ALERT_MODES.map((m: AlertMode) => {
            const active = m === mode;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(prayer, m)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={t(MODE_KEY[m])}
                style={{
                  flexDirection: row,
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 52,
                  paddingHorizontal: 14,
                  borderRadius: ui.radius,
                  borderWidth: 1,
                  borderColor: active ? ui.accent : ui.line,
                  backgroundColor: active ? 'rgba(217,182,92,0.12)' : 'transparent',
                }}
              >
                <Ionicons name={MODE_ICON[m]} size={20} color={active ? ui.accent : ui.textMuted} importantForAccessibility="no" />
                <Text style={{ flex: 1, color: ui.text, fontFamily: active ? font.semibold : font.regular, fontSize: 16, textAlign }}>
                  {t(MODE_KEY[m])}
                </Text>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? ui.accent : ui.textMuted}
                  importantForAccessibility="no"
                />
              </Pressable>
            );
          })}
        </View>

        {mode === 'adhan' && (
          <AdhanSoundCard
            onLocked={() => {
              // Close the sheet first: a screen pushed under an open modal stays hidden on iOS.
              onClose();
              setTimeout(() => openPro('adhan'), SHEET_CLOSE_MS);
            }}
          />
        )}
        {!hasBundledSounds && mode === 'adhan' && (
          <Text style={{ color: ui.accent, fontFamily: font.regular, fontSize: 13, marginTop: 8, textAlign }}>
            {t('adhanExpoGoNote')}
          </Text>
        )}
        <View style={{ flexDirection: row, gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Button
            label={playing ? t('stopAdhan') : t('playAdhan')}
            variant="secondary"
            onPress={() => (playing ? stop() : play())}
          />
          <Button label={t('testAlert')} variant="secondary" onPress={test} disabled={!location} />
        </View>
        <Button label={t('close')} variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}
