import { useEffect } from 'react';
import { Animated, Pressable } from 'react-native';
import { useAnimValue } from '../hooks/useAnimValue';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../i18n';
import { ui } from '../theme';

interface ScrollTopButtonProps {
  visible: boolean;
  onPress: () => void;
  /** Lift it clear of anything pinned to the bottom of the screen. */
  bottom?: number;
}

/**
 * Floating "back to top" control for long lists.
 *
 * Sits on the leading side of the screen — right in English, left in Arabic —
 * so it falls under the thumb rather than over the content being read. It fades
 * out rather than disappearing, and stops taking touches while hidden.
 */
export function ScrollTopButton({ visible, onPress, bottom = 16 }: ScrollTopButtonProps) {
  const { t, rtl } = useT();
  const anim = useAnimValue(0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        bottom,
        left: rtl ? 16 : undefined,
        right: rtl ? undefined : 16,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('backToTop')}
        // A comfortable target without making the circle itself large.
        hitSlop={8}
        style={({ pressed }) => ({
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? ui.bgElev : ui.bgElev2,
          borderWidth: 1,
          borderColor: ui.line,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        })}
      >
        <Ionicons name="arrow-up" size={22} color={ui.text} />
      </Pressable>
    </Animated.View>
  );
}
