import { Alert, Switch, Text, View } from 'react-native';
import { canRemoveWatermark } from '@barakah/core';
import { useEditorStore, useToastStore } from '../../store';
import { useEntitlementStore } from '../../monetization/store';
import { monetizationReady } from '../../monetization/adapter';
import { useT } from '../../i18n';
import { ui } from '../../theme';

/**
 * "App name on story" switch. Free users who turn it off are offered the two
 * ways to earn the removal; entitled users simply toggle it.
 *
 * Until billing and ads are wired up the row still appears — it is worth
 * knowing the option is coming — but the switch is disabled and marked so.
 * Leaving it live would offer a choice whose only outcome is an apology.
 */
export function WatermarkRow() {
  const { t, font, row } = useT();
  const toast = useToastStore((s) => s.show);
  const hide = useEditorStore((s) => s.design.hideWatermark);
  const patch = useEditorStore((s) => s.patch);
  const entitlements = useEntitlementStore((s) => s.entitlements);
  const watchAd = useEntitlementStore((s) => s.watchAd);
  const purchasePro = useEntitlementStore((s) => s.purchasePro);
  const busy = useEntitlementStore((s) => s.busy);
  const entitled = canRemoveWatermark(entitlements);

  const offer = () => {
    Alert.alert(t('removeAppName'), t('removeAppNameHint'), [
      {
        text: t('watchAd'),
        onPress: async () => {
          const outcome = await watchAd();
          if (outcome === 'rewarded') {
            patch({ hideWatermark: true });
            toast(t('adRewarded'), 'success');
          } else toast(t('notAvailableYet'), 'error');
        },
      },
      {
        text: t('goPro'),
        onPress: async () => {
          const outcome = await purchasePro();
          if (outcome === 'purchased') {
            patch({ hideWatermark: true });
            toast(t('purchased'), 'success');
          } else toast(t('notAvailableYet'), 'error');
        },
      },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View
      style={{
        flexDirection: row,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
      }}
    >
      <View style={{ flexDirection: row, alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <Text style={{ color: ui.text, fontFamily: font.regular, fontSize: 14 }}>{t('appNameOnStory')}</Text>
        {!monetizationReady && (
          <View
            style={{
              borderWidth: 1,
              borderColor: ui.accent,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 11 }}>{t('comingSoon')}</Text>
          </View>
        )}
      </View>
      <Switch
        value={!(hide && entitled)}
        disabled={busy || !monetizationReady}
        accessibilityLabel={t('appNameOnStory')}
        onValueChange={(on) => {
          if (on) patch({ hideWatermark: false });
          else if (entitled) patch({ hideWatermark: true });
          else offer();
        }}
        trackColor={{ true: ui.accent, false: ui.bg }}
        thumbColor={!(hide && entitled) ? ui.accentInk : ui.textMuted}
      />
    </View>
  );
}
