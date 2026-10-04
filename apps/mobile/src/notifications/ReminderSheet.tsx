import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { formatReminderTime, type TranslationKey } from '@barakah/core';
import { useT } from '../i18n';
import { ui } from '../theme';
import { useToastStore } from '../store';
import { Button, Chip } from '../components/ui';
import { useReminderStore, type ReminderSheetMode } from './store';

/**
 * Times offered as one tap each. Presets beat a clock wheel here: they are
 * faster, they read as considered rather than generic, and they need no extra
 * date-picker dependency on either platform.
 */
const PRESETS: { minutes: number; key: TranslationKey }[] = [
  { minutes: 7 * 60, key: 'reminderMorning' },
  { minutes: 12 * 60, key: 'reminderMidday' },
  { minutes: 16 * 60, key: 'reminderAfternoon' },
  { minutes: 20 * 60, key: 'reminderEvening' },
];

/**
 * The reminder sheet, used both for the first offer and for changing the time
 * later. Mounted once at the root so it works from any screen.
 *
 * Nothing is asked of the OS until the reader picks "Turn on", so the one-shot
 * system prompt is only ever spent on someone who has already said yes.
 */
export function ReminderSheet() {
  const mode = useReminderStore((s) => s.offering);
  const timeOfDay = useReminderStore((s) => s.prefs.timeOfDay);
  const dismiss = useReminderStore((s) => s.dismiss);

  return (
    <Modal
      visible={mode !== null}
      transparent
      animationType="fade"
      // The Android back button and the backdrop both count as closing, which
      // is not the same as declining.
      onRequestClose={dismiss}
    >
      <Pressable
        onPress={dismiss}
        accessible={false}
        style={{ flex: 1, backgroundColor: 'rgba(4,10,9,0.72)', justifyContent: 'flex-end', padding: 16 }}
      >
        {/* Keyed, so each opening starts from the saved value rather than
            whatever was selected the first time this rendered. */}
        {mode !== null && <ReminderCard key={`${mode}:${timeOfDay}`} mode={mode} savedTime={timeOfDay} />}
      </Pressable>
    </Modal>
  );
}

function ReminderCard({ mode, savedTime }: { mode: ReminderSheetMode; savedTime: number }) {
  const { t, font, row, textAlign } = useT();
  const toast = useToastStore((s) => s.show);
  const accept = useReminderStore((s) => s.accept);
  const decline = useReminderStore((s) => s.decline);
  const changeTime = useReminderStore((s) => s.changeTime);
  const [choice, setChoice] = useState(savedTime);
  const [busy, setBusy] = useState(false);

  // The remembered time — the install time, until the reader changes it — is
  // always offered, so their own default is never buried under the presets.
  const times = [...new Set([...PRESETS.map((p) => p.minutes), savedTime])].sort((a, b) => a - b);
  const labelFor = (minutes: number) => {
    const preset = PRESETS.find((p) => p.minutes === minutes);
    const clock = formatReminderTime(minutes);
    return preset ? `${clock} · ${t(preset.key)}` : clock;
  };

  const confirm = async () => {
    setBusy(true);
    try {
      if (mode === 'edit') {
        await changeTime(choice);
        toast(t('reminderOnToast'), 'success');
        return;
      }
      const outcome = await accept(choice);
      if (outcome === 'granted') toast(t('reminderOnToast'), 'success');
      else toast(t('reminderBlocked'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    /* Swallows taps inside the card so it does not close under the reader. */
    <Pressable
      onPress={() => {}}
      style={{
        backgroundColor: ui.bgElev2,
        borderRadius: ui.radius,
        borderWidth: 1,
        borderColor: ui.line,
        padding: 18,
        gap: 14,
      }}
    >
      <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 18, textAlign }}>
        {t('reminderTitle')}
      </Text>
      <Text
        style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 14, lineHeight: 21, textAlign }}
      >
        {t('reminderBody')}
      </Text>

      <Text style={{ color: ui.text, fontFamily: font.medium, fontSize: 14, textAlign }}>
        {t('reminderWhen')}
      </Text>
      <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
        {times.map((minutes) => (
          <Chip
            key={minutes}
            label={labelFor(minutes)}
            active={choice === minutes}
            onPress={() => setChoice(minutes)}
          />
        ))}
      </View>

      <View style={{ flexDirection: row, gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        {mode === 'offer' && (
          <Button label={t('reminderNotNow')} variant="ghost" size="sm" onPress={decline} />
        )}
        <Button
          label={busy ? t('preparing') : t('reminderTurnOn')}
          variant="primary"
          size="sm"
          disabled={busy}
          onPress={() => void confirm()}
        />
      </View>
    </Pressable>
  );
}
