import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Type only (erased at build time): Expo Router ships its own copy of the tab navigator.
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useT } from '../i18n';
import { ui } from '../theme';

/** Height of the pill itself; the gap under it and the safe area come on top. */
export const TAB_PILL_HEIGHT = 72;
export const TAB_PILL_GAP = 12;

/**
 * The bottom navigation as a floating rounded pill with a gold chip behind the
 * current tab. It takes its own row in the layout (on the screen background)
 * rather than floating over content, so no screen needs extra padding and
 * nothing scrolls out of reach underneath it.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { font, row } = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: ui.bg, paddingHorizontal: TAB_PILL_GAP, paddingTop: 6, paddingBottom: insets.bottom + TAB_PILL_GAP }}>
      <View
        accessibilityRole="tablist"
        style={{
          height: TAB_PILL_HEIGHT,
          borderRadius: 22,
          backgroundColor: 'rgba(14,39,35,0.96)',
          borderWidth: 1,
          borderColor: 'rgba(217,182,92,0.22)',
          flexDirection: row,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const color = focused ? ui.accent : ui.textMuted;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
            >
              <View
                style={{
                  width: 52,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: focused ? 'rgba(217,182,92,0.18)' : 'transparent',
                }}
              >
                {options.tabBarIcon?.({ focused, color, size: 22 })}
              </View>
              <Text numberOfLines={1} style={{ color, fontFamily: focused ? font.semibold : font.medium, fontSize: 12 }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
