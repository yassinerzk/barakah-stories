import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { TIP_FALLBACK_PRICES, TIP_SIZES, type TipPrices, type TipSize } from '@barakah/core';
import { useT } from '../i18n';
import { ui } from '../theme';
import { useToastStore } from '../store';
import { Button } from '../components/ui';
import { adapter } from './adapter';

/**
 * "Support the app": one-off tips of about $1, $2 or $5, in the person's own
 * currency once the store answers. They unlock nothing and are offered to
 * everyone, Pro or not.
 */
export function SupportPanel() {
  const { t, font, row, textAlign } = useT();
  const toast = useToastStore((s) => s.show);
  const [prices, setPrices] = useState<TipPrices>({});
  const [busy, setBusy] = useState<TipSize | null>(null);
  const available = !!adapter.sendTip;

  useEffect(() => {
    let cancelled = false;
    adapter
      .loadTipPrices?.()
      .then((p) => !cancelled && setPrices(p))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const tip = async (size: TipSize) => {
    if (!adapter.sendTip || busy) return;
    setBusy(size);
    try {
      const outcome = await adapter.sendTip(size);
      if (outcome === 'purchased') toast(t('supportThanks'), 'success');
      else if (outcome !== 'cancelled') toast(t('notAvailableYet'), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, lineHeight: 19, textAlign }}>{t('supportDesc')}</Text>
      <View style={{ flexDirection: row, gap: 8 }}>
        {TIP_SIZES.map((size) => (
          <Button
            key={size}
            label={busy === size ? t('preparing') : (prices[size] ?? TIP_FALLBACK_PRICES[size])}
            variant={size === 'medium' ? 'primary' : 'secondary'}
            disabled={!available || busy !== null}
            onPress={() => void tip(size)}
            style={{ flex: 1 }}
          />
        ))}
      </View>
      {!available && <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 12, textAlign }}>{t('comingSoon')}</Text>}
    </View>
  );
}
