import { Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { ui } from '../theme';

/** The surah's name in an ornamental cartouche, as in printed mushafs. */
export function SurahCartouche({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <View style={{ height: 96, justifyContent: 'center', alignItems: 'center' }}>
      <Svg
        width="100%"
        height={96}
        viewBox="0 0 358 96"
        preserveAspectRatio="none"
        style={{ position: 'absolute' }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Defs>
          <LinearGradient id="cg" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#9C7F38" />
            <Stop offset="0.5" stopColor="#F0D488" />
            <Stop offset="1" stopColor="#9C7F38" />
          </LinearGradient>
        </Defs>
        <Path d="M40 8 H318 L350 48 L318 88 H40 L8 48 Z" fill={ui.bgElev} stroke="url(#cg)" strokeWidth={1.5} />
        <Path d="M48 16 H310 L336 48 L310 80 H48 L22 48 Z" fill="none" stroke={ui.accent} strokeOpacity={0.35} />
        <G transform="translate(26 48)" fill={ui.accent}>
          <Path d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" />
        </G>
        <G transform="translate(332 48)" fill={ui.accent}>
          <Path d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" />
        </G>
      </Svg>
      <Text style={{ color: '#F6DE97', fontFamily: 'Amiri_700Bold', fontSize: 26, lineHeight: 40 }}>سُورَةُ {name}</Text>
      <Text style={{ color: ui.textMuted, fontSize: 12 }}>{subtitle}</Text>
    </View>
  );
}
