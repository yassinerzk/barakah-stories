import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * A phone's home screen in miniature, for showing a widget where it will sit.
 * `icons` adds a row of app-icon placeholders above and below, as on a real
 * home screen; on a short phone they are simply cropped by the frame.
 */
export function HomeBackdrop({ children, icons = false, style }: { children: ReactNode; icons?: boolean; style?: ViewStyle }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={[{ overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`hb${uid}`} x1="0.4" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor="#1A2E3A" />
            <Stop offset="0.5" stopColor="#24402F" />
            <Stop offset="1" stopColor="#3A3A26" />
          </LinearGradient>
          <RadialGradient id={`hg${uid}`} cx="80%" cy="10%" r="50%">
            <Stop offset="0" stopColor="#FFF1C4" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#FFF1C4" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#hb${uid})`} />
        <Rect width="100%" height="100%" fill={`url(#hg${uid})`} />
      </Svg>
      {icons && <IconRow />}
      {children}
      {icons && <IconRow />}
    </View>
  );
}

function IconRow() {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ flexDirection: 'row', gap: 14, marginVertical: 18 }}
    >
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(243,239,228,0.08)' }} />
      ))}
    </View>
  );
}
