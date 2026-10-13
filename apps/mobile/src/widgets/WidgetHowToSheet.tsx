import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { toLocaleDigits, type TranslationKey } from '@barakah/core';
import { useT } from '../i18n';
import { ui } from '../theme';
import { Button } from '../components/ui';
import { canPinWidget, pinWidget, widgetsSupported } from '../../modules/widgets';

export type WidgetKind = 'prayer' | 'dhikr';

/**
 * Android asks the launcher to place the widget, and the launcher shows its
 * own "Add to home screen" dialog. iOS has no such API and a few launchers
 * refuse; there the caller shows the steps instead.
 */
export function requestWidget(kind: WidgetKind): 'requested' | 'manual' {
  return canPinWidget() && pinWidget(kind) ? 'requested' : 'manual';
}

const STEPS: Record<'ios' | 'android', readonly TranslationKey[]> = {
  android: ['widgetHowAndroid1', 'widgetHowAndroid2', 'widgetHowAndroid3'],
  ios: ['widgetHowIos1', 'widgetHowIos2', 'widgetHowIos3'],
};

/** The three steps to add a widget by hand, for this phone's system. */
export function WidgetHowToSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, locale, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const steps = STEPS[Platform.OS === 'ios' ? 'ios' : 'android'];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessible={false}
        // The modal draws under Android's navigation bar; the card stays above it.
        style={{ flex: 1, backgroundColor: 'rgba(4,10,9,0.72)', justifyContent: 'flex-end', padding: 16, paddingBottom: 16 + insets.bottom }}
      >
        {/* Taps inside the card must not dismiss it. */}
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
            gap: 14,
            padding: 18,
            backgroundColor: ui.bgElev2,
            borderRadius: ui.radius,
            borderWidth: 1,
            borderColor: ui.line,
          }}
        >
          <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 18, textAlign }}>
            {t('widgetHowTitle')}
          </Text>
          {!widgetsSupported && (
            <View style={{ flexDirection: row, alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(217,182,92,0.10)' }}>
              <Ionicons name="information-circle-outline" size={18} color={ui.accent} />
              <Text style={{ flex: 1, color: ui.text, fontFamily: font.regular, fontSize: 14, lineHeight: 20, textAlign }}>{t('widgetsNeedApp')}</Text>
            </View>
          )}
          {steps.map((key, i) => (
            <View key={key} style={{ flexDirection: row, alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,182,92,0.16)' }}>
                <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 14 }}>{toLocaleDigits(i + 1, locale)}</Text>
              </View>
              <Text style={{ flex: 1, paddingTop: 3, color: ui.text, fontFamily: font.regular, fontSize: 15, lineHeight: 22, textAlign }}>{t(key)}</Text>
            </View>
          ))}
          <Button label={t('close')} variant="primary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
