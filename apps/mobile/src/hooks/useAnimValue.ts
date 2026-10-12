import { useState } from 'react';
import { Animated } from 'react-native';

/**
 * One Animated.Value for the component's lifetime. React Native's own
 * useAnimatedValue is missing from react-native-web, which the web preview uses.
 */
export function useAnimValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}
