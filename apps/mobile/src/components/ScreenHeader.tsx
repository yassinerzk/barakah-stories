import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../i18n';
import { ui } from '../theme';

/** Back, centred title and an optional action: the header of every pushed screen. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { t, font, row } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const rtl = row === 'row-reverse';
  return (
    <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 8, flexDirection: row, alignItems: 'center', justifyContent: 'space-between', minHeight: 56 }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={22} color={ui.text} />
      </Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: 'center', color: ui.text, fontFamily: font.semibold, fontSize: 18 }}>
        {title}
      </Text>
      <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>{right}</View>
    </View>
  );
}
