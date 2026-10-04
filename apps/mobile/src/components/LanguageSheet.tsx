import { Modal, Pressable, ScrollView, Text } from 'react-native';
import { LOCALES, type Locale } from '@barakah/core';
import { useT } from '../i18n';
import { ui } from '../theme';
import { useSettingsStore } from '../store';
import { uiFontFor } from '../fonts';

interface LanguageSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Language picker.
 *
 * Each row is labelled in its own language and drawn in its own script's type
 * set, so someone looking for their language recognises it without being able
 * to read the one currently selected. That is also why there is no translated
 * list of language names anywhere: "Bahasa Indonesia" is the same row whether
 * the app is currently in Thai or French.
 */
export function LanguageSheet({ visible, onClose }: LanguageSheetProps) {
  const { t, row, textAlign } = useT();
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);

  const choose = (next: Locale) => {
    setLocale(next);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessible={false}
        style={{
          flex: 1,
          backgroundColor: 'rgba(4,10,9,0.72)',
          justifyContent: 'flex-end',
          padding: 16,
        }}
      >
        {/* Taps inside the card must not dismiss it. */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: ui.bgElev2,
            borderRadius: ui.radius,
            borderWidth: 1,
            borderColor: ui.line,
            paddingVertical: 14,
            maxHeight: '80%',
          }}
        >
          <Text
            style={{
              color: ui.text,
              fontFamily: uiFontFor(locale).semibold,
              fontSize: 17,
              textAlign,
              paddingHorizontal: 18,
              paddingBottom: 10,
            }}
          >
            {t('language')}
          </Text>
          <ScrollView>
            {LOCALES.map((l) => {
              const active = l.id === locale;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => choose(l.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={l.label}
                  style={({ pressed }) => ({
                    flexDirection: row,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    backgroundColor: pressed ? ui.bgElev : 'transparent',
                  })}
                >
                  <Text
                    // Each name in its own script's face, and laid out in that
                    // script's direction, so Arabic and Urdu read correctly
                    // even while the app is in English.
                    style={{
                      color: active ? ui.accent : ui.text,
                      fontFamily: uiFontFor(l.id).medium,
                      fontSize: 16,
                      writingDirection: l.dir,
                      flexShrink: 1,
                    }}
                  >
                    {l.label}
                  </Text>
                  {active && <Text style={{ color: ui.accent, fontSize: 16 }}>✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
