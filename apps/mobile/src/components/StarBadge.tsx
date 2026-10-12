import { Text, View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';
import { ui } from '../theme';

interface Props {
  label: string;
  size?: number;
  /** Filled gold with dark text, for the current or finished item. */
  filled?: boolean;
  fontFamily?: string;
}

/** A number inside an eight-point star: two overlapping squares, the app's ornament. */
export function StarBadge({ label, size = 40, filled = false, fontFamily }: Props) {
  const half = size / 2;
  const sq = size * 0.65;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G transform={`translate(${half} ${half})`} fill={filled ? ui.accent : 'none'} stroke={ui.accent} strokeWidth={1.1}>
          <Rect x={-sq / 2} y={-sq / 2} width={sq} height={sq} />
          <Rect x={-sq / 2} y={-sq / 2} width={sq} height={sq} transform="rotate(45)" />
        </G>
      </Svg>
      <Text style={{ color: filled ? ui.accentInk : ui.text, fontFamily, fontSize: size * 0.3 }} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}
