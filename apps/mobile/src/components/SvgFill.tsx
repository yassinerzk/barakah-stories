import { StyleSheet, View } from 'react-native';
import Svg, { type SvgProps } from 'react-native-svg';

/**
 * An SVG that covers its parent edge to edge, behind the parent's content.
 *
 * A bare `<Svg width="100%" style={{ position: 'absolute' }}>` is sized by
 * Yoga from the parent's content box, so on a parent with padding it stops
 * short of the right and bottom edges by that padding (on phones; browsers
 * size it from the padding box, so the web preview hides the problem). The
 * inset wrapper takes the parent's full size and the SVG fills the wrapper.
 */
export function SvgFill({ children, ...svgProps }: SvgProps) {
  return (
    <View
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Svg width="100%" height="100%" {...svgProps}>
        {children}
      </Svg>
    </View>
  );
}
