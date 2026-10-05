import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { useT } from '../../src/i18n';
import { ui } from '../../src/theme';
import { CreateButton } from '../../src/components/CreateButton';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  );

export default function TabsLayout() {
  const { t, font } = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ui.accent,
        tabBarInactiveTintColor: ui.textMuted,
        tabBarStyle: { backgroundColor: ui.bgElev, borderTopColor: ui.line },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: ui.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="quran" options={{ title: t('quran'), tabBarIcon: icon('book') }} />
      {/* Not a screen: the raised "+" opens the new-story chooser. */}
      <Tabs.Screen
        name="create"
        options={{ title: t('createNew'), tabBarButton: () => <CreateButton /> }}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tabs.Screen name="hadith" options={{ title: t('hadith'), tabBarIcon: icon('library') }} />
      <Tabs.Screen name="prayer" options={{ title: t('prayer'), tabBarIcon: icon('moon') }} />
      <Tabs.Screen name="me" options={{ title: t('me'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
