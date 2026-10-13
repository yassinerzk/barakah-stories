import { useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import type { TranslationKey } from '@barakah/core';
import { useT } from '../../i18n';
import { ui } from '../../theme';
import { HomeBackdrop } from '../../widgets/HomeBackdrop';
import { DhikrWidgetPreview, PrayerWidgetPreview } from '../../widgets/WidgetPreviews';
import type { WidgetKind } from '../../widgets/WidgetHowToSheet';
import { Actions, GoldButton, QuietButton, StepTitle } from './OnbChrome';

const PAGES: ReadonlyArray<{ kind: WidgetKind; title: TranslationKey; caption: TranslationKey }> = [
  { kind: 'prayer', title: 'widgetPrayerTitle', caption: 'onbWidgetsSwipe' },
  { kind: 'dhikr', title: 'widgetDhikrTitle', caption: 'widgetDhikrBody' },
];
const PREVIEW_MAX_W = 360;
const DHIKR_SIZE = 150;
/** The miniature home screen grows with the phone, within these bounds. */
const MOCK_MIN_H = 220;
const MOCK_MAX_H = 380;

/**
 * The widgets on a miniature home screen, one swipe apart, with "Add to home
 * screen" for the one in view. Only shown where the app has widgets to add.
 */
export function WidgetsStep({ onAdd, onLater }: { onAdd: (kind: WidgetKind) => void; onLater: () => void }) {
  const { t, font, row } = useT();
  const { width } = useWindowDimensions();
  const mockW = Math.min(width, 560) - 32;
  const [page, setPage] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / mockW));
  const current = PAGES[page] ?? PAGES[0];
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <StepTitle title={t('onbWidgetsTitle')} />
      </View>
      <View
        style={{
          flex: 1,
          minHeight: MOCK_MIN_H,
          maxHeight: MOCK_MAX_H,
          marginTop: 16,
          marginHorizontal: 16,
          borderRadius: 28,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        }}
      >
        <HomeBackdrop icons style={{ flex: 1 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            style={{ width: mockW, flexGrow: 0 }}
          >
            {PAGES.map((p, i) => (
              <View
                key={p.kind}
                style={{ width: mockW, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }}
                accessibilityElementsHidden={i !== page}
                importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}
              >
                {p.kind === 'prayer' ? (
                  <PrayerWidgetPreview width={Math.min(mockW - 28, PREVIEW_MAX_W)} />
                ) : (
                  <DhikrWidgetPreview size={DHIKR_SIZE} />
                )}
              </View>
            ))}
          </ScrollView>
        </HomeBackdrop>
      </View>
      <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 14 }}>
        <View style={{ flexDirection: row, gap: 6 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {PAGES.map((p, i) => (
            <View key={p.kind} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? ui.text : 'rgba(255,255,255,0.25)' }} />
          ))}
        </View>
        <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 17 }}>{t(current.title)}</Text>
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>{t(current.caption)}</Text>
      </View>
      <Actions>
        <GoldButton label={t('addToHomeScreen')} icon="add-circle-outline" onPress={() => onAdd(current.kind)} />
        <QuietButton label={t('maybeLater')} onPress={onLater} />
      </Actions>
    </View>
  );
}
