import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { hasAdReward, isPro, tagOf, type TranslationKey } from '@barakah/core';
import { useEntitlementStore } from './store';
import { useT } from '../i18n';
import { ui } from '../theme';
import { Button } from '../components/ui';

const PLAN_LABEL: Record<string, TranslationKey> = { monthly: 'planMonthly', yearly: 'planYearly', lifetime: 'planLifetime' };

/** The Pro section of the Me tab: the plan for Pro users, the way in for everyone else. */
export function ProPanel() {
  const { t, font, row, textAlign, locale } = useT();
  const router = useRouter();
  const entitlements = useEntitlementStore((s) => s.entitlements);
  const restore = useEntitlementStore((s) => s.restore);
  const busy = useEntitlementStore((s) => s.busy);

  if (isPro(entitlements)) {
    const plan = entitlements.plan ? PLAN_LABEL[entitlements.plan] : undefined;
    return (
      <Text style={{ color: ui.accent, fontFamily: font.medium, textAlign }}>
        ✓ {t('youArePro')}
        {plan ? ` · ${t(plan)}` : ''}
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>{t('proDesc')}</Text>
      {hasAdReward(entitlements) && (
        <Text style={{ color: ui.accent, fontFamily: font.regular, fontSize: 12, textAlign }}>
          {t('adRewardActive')} {new Date(entitlements.adRewardUntil).toLocaleString(tagOf(locale))}
        </Text>
      )}
      <View style={{ flexDirection: row, gap: 8, flexWrap: 'wrap' }}>
        <Button label={`★ ${t('goPro')}`} variant="primary" size="sm" onPress={() => router.push('/pro')} />
        <Button label={t('restorePurchases')} size="sm" variant="ghost" disabled={busy} onPress={() => void restore()} />
      </View>
    </View>
  );
}
