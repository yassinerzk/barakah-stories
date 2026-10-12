import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { useT } from '../../src/i18n';
import { ui } from '../../src/theme';
import { CreateButton } from '../../src/components/CreateButton';
import { FloatingTabBar, TAB_PILL_GAP, TAB_PILL_HEIGHT } from '../../src/components/FloatingTabBar';
import { ONBOARDING_VERSION, useOnboardingStore, usePrayerStore } from '../../src/store';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  );

export default function TabsLayout() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const gate = useOnboardingGate();
  if (gate === 'wait') return <View style={{ flex: 1, backgroundColor: ui.bg }} />;
  if (gate === 'onboard') return <Redirect href="/onboarding" />;
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: ui.bg },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: icon('home') }} />
        <Tabs.Screen name="quran" options={{ title: t('quran'), tabBarIcon: icon('book') }} />
        <Tabs.Screen name="hadith" options={{ title: t('hadith'), tabBarIcon: icon('library') }} />
        <Tabs.Screen name="prayer" options={{ title: t('prayer'), tabBarIcon: icon('moon') }} />
        <Tabs.Screen name="me" options={{ title: t('me'), tabBarIcon: icon('person') }} />
      </Tabs>
      {/* New story from scratch: a floating button, bottom-left, above the tab bar. */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 16, bottom: insets.bottom + TAB_PILL_GAP + TAB_PILL_HEIGHT + 16 }}
      >
        <CreateButton />
      </View>
    </View>
  );
}

/**
 * First launch goes to onboarding. Waits for the saved stores to load, so a
 * returning user never sees it flash. Someone updating who already set a
 * location has been using the app: their onboarding is marked done silently.
 */
function useOnboardingGate(): 'wait' | 'onboard' | 'tabs' {
  const done = useOnboardingStore((s) => s.completedVersion) >= ONBOARDING_VERSION;
  const complete = useOnboardingStore((s) => s.complete);
  const hasLocation = usePrayerStore((s) => s.location !== null);
  const [hydrated, setHydrated] = useState(
    () => useOnboardingStore.persist.hasHydrated() && usePrayerStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (hydrated) return;
    const check = () => setHydrated(useOnboardingStore.persist.hasHydrated() && usePrayerStore.persist.hasHydrated());
    const subs = [useOnboardingStore.persist.onFinishHydration(check), usePrayerStore.persist.onFinishHydration(check)];
    check();
    return () => subs.forEach((unsub) => unsub());
  }, [hydrated]);
  const existingUser = hydrated && !done && hasLocation;
  useEffect(() => {
    if (existingUser) complete();
  }, [existingUser, complete]);
  if (!hydrated) return 'wait';
  if (done || hasLocation) return 'tabs';
  return 'onboard';
}
