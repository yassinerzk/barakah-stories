import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TranslationKey } from '@barakah/core';
import { useT } from '../i18n';
import { ui } from '../theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { GoldButton } from '../features/onboarding/OnbChrome';
import { usePro } from './usePro';

/** A small gold lock in a corner of something only Pro can use. */
export function ProLock({ size = 18, corner = true }: { size?: number; corner?: boolean }) {
  const { t } = useT();
  return (
    <View
      accessibilityLabel={t('proOnly')}
      style={[
        { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.accent },
        corner && { position: 'absolute', top: 4, right: 4 },
      ]}
    >
      <Ionicons name="lock-closed" size={size * 0.62} color={ui.accentInk} />
    </View>
  );
}

/**
 * Wraps a practice screen: free users see what it is and how to unlock it,
 * instead of the tool itself. The wrapped screen never mounts for them.
 */
export function ProGate({ title, children }: { title: TranslationKey; children: ReactNode }) {
  const { locked, openPro } = usePro();
  if (!locked) return <>{children}</>;
  return <LockedScreen title={title} onUnlock={() => openPro('practice')} />;
}

function LockedScreen({ title, onUnlock }: { title: TranslationKey; onUnlock: () => void }) {
  const { t, font } = useT();
  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScreenHeader title={t(title)} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,182,92,0.14)' }}>
          <Ionicons name="lock-closed" size={30} color={ui.accent} />
        </View>
        <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 20, textAlign: 'center' }}>
          {t('proReasonPractice')}
        </Text>
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>{t('proFeatPractice')}</Text>
        <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
          <GoldButton label={t('unlockWithPro')} icon="star" onPress={onUnlock} />
        </View>
      </View>
    </View>
  );
}
