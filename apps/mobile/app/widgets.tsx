import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../src/i18n';
import { ui } from '../src/theme';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { Button } from '../src/components/ui';
import { useLayoutWidth } from '../src/hooks/useLayoutWidth';
import { HomeBackdrop } from '../src/widgets/HomeBackdrop';
import { DhikrWidgetPreview, PrayerWidgetPreview } from '../src/widgets/WidgetPreviews';
import { requestWidget, WidgetHowToSheet, type WidgetKind } from '../src/widgets/WidgetHowToSheet';

/** The content keeps a readable width on tablets. */
const MAX_W = 560;
const DHIKR_SIZE = 156;

/**
 * Both home-screen widgets, live and with the person's own times and count,
 * each with a way to add it. Reached from Home and from Me.
 */
export default function WidgetsScreen() {
  const { t, font, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const width = useLayoutWidth();
  const [howTo, setHowTo] = useState(false);
  const inner = Math.min(width, MAX_W) - 32;
  const add = (kind: WidgetKind) => {
    if (requestWidget(kind) === 'manual') setHowTo(true);
  };
  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScreenHeader title={t('widgetsTitle')} />
      <ScrollView
        contentContainerStyle={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center', gap: 16, padding: 16, paddingBottom: insets.bottom + 32 }}
      >
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, textAlign }}>{t('widgetsIntro')}</Text>
        <Showcase title={t('widgetPrayerTitle')} body={t('widgetPrayerBody')} onAdd={() => add('prayer')}>
          <PrayerWidgetPreview width={Math.min(inner - 40, 380)} />
        </Showcase>
        <Showcase title={t('widgetDhikrTitle')} body={t('widgetDhikrBody')} onAdd={() => add('dhikr')}>
          <DhikrWidgetPreview size={DHIKR_SIZE} />
        </Showcase>
        <Button label={t('widgetHowTitle')} variant="ghost" onPress={() => setHowTo(true)} />
      </ScrollView>
      <WidgetHowToSheet visible={howTo} onClose={() => setHowTo(false)} />
    </View>
  );
}

/** One widget on a miniature home screen, with what it does and the add button. */
function Showcase({ title, body, onAdd, children }: { title: string; body: string; onAdd: () => void; children: ReactNode }) {
  const { t, font, textAlign } = useT();
  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: ui.bgElev, borderWidth: 1, borderColor: 'rgba(217,182,92,0.18)' }}>
      <HomeBackdrop style={{ paddingVertical: 28, paddingHorizontal: 20 }}>{children}</HomeBackdrop>
      <View style={{ gap: 6, padding: 16 }}>
        <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 17, textAlign }}>
          {title}
        </Text>
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 14, lineHeight: 20, textAlign }}>{body}</Text>
        <View style={{ marginTop: 8 }}>
          <Button label={t('addToHomeScreen')} variant="primary" onPress={onAdd} />
        </View>
      </View>
    </View>
  );
}
