import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { isPro, lifetimeOffer, toLocaleDigits, type ProPlan, type TranslationKey } from '@barakah/core';
import { useT } from '../src/i18n';
import { ui } from '../src/theme';
import { useToastStore } from '../src/store';
import { useEntitlementStore } from '../src/monetization/store';
import { monetizationReady } from '../src/monetization/adapter';
import type { ProReason } from '../src/monetization/usePro';
import { GoldButton, QuietButton } from '../src/features/onboarding/OnbChrome';

const REASON: Record<ProReason, TranslationKey> = {
  stories: 'proReasonStories',
  video: 'proReasonVideo',
  style: 'proReasonStyle',
  wallpaper: 'proReasonWallpaper',
  practice: 'proReasonPractice',
  watermark: 'removeAppNameHint',
  adhan: 'proReasonAdhan',
};
const FEATURES: ReadonlyArray<{ icon: keyof typeof Ionicons.glyphMap; text: TranslationKey }> = [
  { icon: 'infinite', text: 'proFeatStories' },
  { icon: 'color-palette', text: 'proFeatStyle' },
  { icon: 'image', text: 'proFeatWallpapers' },
  { icon: 'radio-button-on', text: 'proFeatPractice' },
  { icon: 'musical-notes', text: 'proFeatAdhan' },
  { icon: 'eye-off', text: 'proFeatNoName' },
];
const PLAN_LABEL: Record<ProPlan, TranslationKey> = { monthly: 'planMonthly', yearly: 'planYearly', lifetime: 'planLifetime' };
const PLAN_PERIOD: Record<ProPlan, TranslationKey> = { monthly: 'perMonth', yearly: 'perYear', lifetime: 'oneTimePayment' };
/** Yearly first and pre-selected; lifetime last, while its offer lasts. */
const ORDER: readonly ProPlan[] = ['yearly', 'monthly', 'lifetime'];
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

/** Ticks once a second so the lifetime countdown is live. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Barakah Pro: what it adds, then monthly, yearly and a lifetime offer that is
 * only open for the first three days after someone first opens the app.
 */
export default function ProScreen() {
  const { t, font, row, textAlign } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const toast = useToastStore((s) => s.show);
  const entitlements = useEntitlementStore((s) => s.entitlements);
  const firstOpenAt = useEntitlementStore((s) => s.firstOpenAt);
  const prices = useEntitlementStore((s) => s.prices);
  const loadPrices = useEntitlementStore((s) => s.loadPrices);
  const purchasePro = useEntitlementStore((s) => s.purchasePro);
  const restore = useEntitlementStore((s) => s.restore);
  const busy = useEntitlementStore((s) => s.busy);
  const now = useNow();
  const offer = lifetimeOffer(firstOpenAt || now, now);
  const [plan, setPlan] = useState<ProPlan>('yearly');
  const why = reason && reason in REASON ? REASON[reason as ProReason] : null;

  useEffect(() => {
    void loadPrices();
  }, [loadPrices]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const buy = async () => {
    if (plan === 'lifetime' && !offer.available) return;
    const outcome = await purchasePro(plan);
    if (outcome === 'purchased') {
      toast(t('purchased'), 'success');
      close();
    } else if (outcome !== 'cancelled') toast(t('notAvailableYet'), 'error');
  };

  if (isPro(entitlements)) {
    return (
      <View style={{ flex: 1, backgroundColor: ui.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
        <Ionicons name="star" size={40} color={ui.accent} />
        <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 20, textAlign: 'center' }}>{t('youArePro')}</Text>
        {entitlements.plan && <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 15 }}>{t(PLAN_LABEL[entitlements.plan])}</Text>}
        <QuietButton label={t('close')} onPress={close} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 560, alignSelf: 'center', padding: 20, paddingTop: insets.top + 12, paddingBottom: 24, gap: 18 }}>
        <View style={{ flexDirection: row, justifyContent: 'flex-end' }}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('close')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color={ui.text} />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,182,92,0.16)' }}>
            <Ionicons name="star" size={30} color={ui.accent} />
          </View>
          <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 26 }}>
            {t('proTitle')}
          </Text>
          {why && <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 15, lineHeight: 21, textAlign: 'center' }}>{t(why)}</Text>}
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 14, lineHeight: 20, textAlign: 'center' }}>{t('proSubtitle')}</Text>
        </View>

        <View style={{ gap: 10 }}>
          {FEATURES.map((f) => (
            <View key={f.text} style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,182,92,0.12)' }}>
                <Ionicons name={f.icon} size={16} color={ui.accent} />
              </View>
              <Text style={{ flex: 1, color: ui.text, fontFamily: font.regular, fontSize: 15, textAlign }}>{t(f.text)}</Text>
            </View>
          ))}
        </View>

        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {ORDER.map((p) => {
            const expired = p === 'lifetime' && !offer.available;
            const on = plan === p && !expired;
            return (
              <Pressable
                key={p}
                onPress={() => !expired && setPlan(p)}
                disabled={expired}
                accessibilityRole="radio"
                accessibilityState={{ checked: on, disabled: expired }}
                style={{
                  flexDirection: row,
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 68,
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: on ? 2 : 1,
                  borderColor: on ? ui.accent : ui.lineStrong,
                  backgroundColor: on ? 'rgba(217,182,92,0.10)' : ui.bgElev,
                  opacity: expired ? 0.5 : 1,
                }}
              >
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? ui.accent : ui.textMuted} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: row, alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 16 }}>{t(PLAN_LABEL[p])}</Text>
                    {p === 'yearly' && <Badge text={t('bestValue')} />}
                    {p === 'lifetime' && <OfferBadge offer={offer} />}
                  </View>
                  <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>{t(PLAN_PERIOD[p])}</Text>
                </View>
                <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 17, textDecorationLine: expired ? 'line-through' : 'none' }}>{prices[p] ?? '—'}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: insets.bottom + 12, gap: 4 }}>
        <GoldButton label={monetizationReady ? t('proContinue') : t('comingSoon')} icon="star" busy={busy} onPress={monetizationReady ? buy : () => {}} />
        <QuietButton label={t('restorePurchases')} onPress={() => void restore()} />
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 11, lineHeight: 16, textAlign: 'center' }}>{t('renewNote')}</Text>
      </View>
    </View>
  );
}

function Badge({ text, tone = 'gold' }: { text: string; tone?: 'gold' | 'muted' }) {
  const { font } = useT();
  const gold = tone === 'gold';
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: gold ? ui.accent : 'rgba(255,255,255,0.12)' }}>
      <Text style={{ color: gold ? ui.accentInk : ui.textMuted, fontFamily: font.semibold, fontSize: 11 }}>{text}</Text>
    </View>
  );
}

/** "3 days left", then on the last day a live hh:mm:ss, then "Expired". */
function OfferBadge({ offer }: { offer: ReturnType<typeof lifetimeOffer> }) {
  const { t, locale } = useT();
  if (!offer.available) return <Badge text={t('offerExpired')} tone="muted" />;
  if (offer.daysLeft > 1) return <Badge text={fill(t('offerDaysLeft'), { n: toLocaleDigits(offer.daysLeft, locale) })} />;
  const s = Math.floor(offer.msLeft / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const clock = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`.replace(/\d/g, (d) => toLocaleDigits(Number(d), locale));
  return <Badge text={`${t('offerLastDay')} · ${clock}`} />;
}
