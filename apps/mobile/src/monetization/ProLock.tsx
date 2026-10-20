import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TranslationKey } from '@barakah/core';
import { useT } from '../i18n';
import { ui } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { GoldButton } from '../features/onboarding/OnbChrome';
import { usePro, type ProReason } from './usePro';

/**
 * The "PRO" label on everything only Pro can use, so free users see what is
 * included before they tap. Pro members never see it (callers check `locked`).
 */
export function ProLock({ size = 18, corner = true }: { size?: number; corner?: boolean }) {
  const { t } = useT();
  const text = Math.max(8, Math.round(size * 0.55));
  return (
    <View
      accessibilityLabel={t('proOnly')}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          height: size + 2,
          paddingHorizontal: Math.round(size * 0.35),
          borderRadius: (size + 2) / 2,
          backgroundColor: ui.accent,
        },
        corner ? { position: 'absolute', top: 4, right: 4 } : { alignSelf: 'flex-start' },
      ]}
    >
      <Ionicons name="lock-closed" size={text} color={ui.accentInk} />
      <Text allowFontScaling={false} style={{ color: ui.accentInk, fontSize: text, fontWeight: '800', letterSpacing: 0.5 }}>
        PRO
      </Text>
    </View>
  );
}

/**
 * Wraps a practice screen: free users see what it is and how to unlock it,
 * instead of the tool itself. The wrapped screen never mounts for them.
 */
export function ProGate({
  title,
  children,
  reason = 'practice',
  reasonKey = 'proReasonPractice',
  bodyKey = 'proFeatPractice',
}: {
  title: TranslationKey;
  children: ReactNode;
  reason?: ProReason;
  reasonKey?: TranslationKey;
  bodyKey?: TranslationKey;
}) {
  const { locked, openPro } = usePro();
  if (!locked) return <>{children}</>;
  return <LockedScreen title={title} reasonKey={reasonKey} bodyKey={bodyKey} onUnlock={() => openPro(reason)} />;
}

function LockedScreen({ title, reasonKey, bodyKey, onUnlock }: { title: TranslationKey; reasonKey: TranslationKey; bodyKey: TranslationKey; onUnlock: () => void }) {
  const { t, font } = useT();
  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScreenHeader title={t(title)} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,182,92,0.14)' }}>
          <Ionicons name="lock-closed" size={30} color={ui.accent} />
        </View>
        <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 20, textAlign: 'center' }}>
          {t(reasonKey)}
        </Text>
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>{t(bodyKey)}</Text>
        <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
          <GoldButton label={t('unlockWithPro')} icon="star" onPress={onUnlock} />
        </View>
      </View>
    </View>
  );
}
