import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { designToText, shouldShowWatermark } from '@barakah/core';
import { useEntitlementStore } from '../src/monetization/store';
import { WatermarkRow } from '../src/features/editor/WatermarkRow';
import { useT } from '../src/i18n';
import { ui } from '../src/theme';
import { useEditorStore, useLibraryStore, useToastStore } from '../src/store';
import { useHijriToday } from '../src/hooks/useHijriToday';
import { useLayoutWidth } from '../src/hooks/useLayoutWidth';
import { StoryCard } from '../src/components/StoryCard';
import { Button } from '../src/components/ui';
import { TextPanel } from '../src/features/editor/TextPanel';
import { StylePanel } from '../src/features/editor/StylePanel';
import { copyText, shareCard } from '../src/lib/share';

type Panel = 'text' | 'style';

export default function EditorScreen() {
  const { t, font, row } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const width = useLayoutWidth();
  const { label: hijriLabel } = useHijriToday();
  const design = useEditorStore((s) => s.design);
  const savedId = useEditorStore((s) => s.savedId);
  const setSavedId = useEditorStore((s) => s.setSavedId);
  const upsert = useLibraryStore((s) => s.upsert);
  const toast = useToastStore((s) => s.show);
  const entitlements = useEntitlementStore((s) => s.entitlements);
  const showWatermark = shouldShowWatermark(design.hideWatermark, entitlements);
  const cardRef = useRef<View>(null);
  const [panel, setPanel] = useState<Panel>('text');
  const [busy, setBusy] = useState(false);
  const cardWidth = Math.min(width - 32, 420);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await shareCard(cardRef, design.headline || 'Story');
      if (outcome === 'unavailable') toast(t('shareFailedMobile'), 'error');
    } catch {
      toast(t('shareFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    const saved = upsert(design, savedId);
    setSavedId(saved.id);
    toast(t('saved'), 'success');
  };
  const copy = async () => toast((await copyText(designToText(design))) ? t('copied') : t('shareFailed'));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: ui.bg }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 32,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center' }}>
          <Button label={`← ${t('back')}`} size="sm" variant="ghost" onPress={() => router.back()} />
          <View style={{ flexDirection: row, gap: 8 }}>
            <Button label={t('copyText')} size="sm" onPress={copy} />
            <Button label={t('save')} size="sm" onPress={save} />
          </View>
        </View>

        <View style={{ alignSelf: 'center', borderRadius: 18, overflow: 'hidden' }}>
          <StoryCard
            ref={cardRef}
            design={design}
            width={cardWidth}
            hijriLabel={hijriLabel}
            showWatermark={showWatermark}
          />
        </View>
        <View style={{ alignSelf: 'center', width: cardWidth, gap: 6 }}>
          <Button
            label={busy ? t('preparing') : t('useThisStory')}
            variant="primary"
            size="lg"
            onPress={share}
            disabled={busy}
          />
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, textAlign: 'center' }}>
            {t('tipShare')}
          </Text>
          <WatermarkRow />
        </View>

        <View
          style={{
            backgroundColor: ui.bgElev,
            borderRadius: ui.radius,
            borderWidth: 1,
            borderColor: ui.line,
            padding: 16,
          }}
        >
          <View
            accessibilityRole="tablist"
            style={{ flexDirection: row, borderBottomWidth: 1, borderBottomColor: ui.line, marginBottom: 14 }}
          >
            {(['text', 'style'] as const).map((p) => (
              <Pressable
                key={p}
                onPress={() => setPanel(p)}
                accessibilityRole="tab"
                accessibilityState={{ selected: panel === p }}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: 14,
                  borderBottomWidth: 2,
                  borderBottomColor: panel === p ? ui.accent : 'transparent',
                }}
              >
                <Text style={{ color: panel === p ? ui.text : ui.textMuted, fontFamily: font.semibold }}>{t(p)}</Text>
              </Pressable>
            ))}
          </View>
          {panel === 'text' ? <TextPanel /> : <StylePanel />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
