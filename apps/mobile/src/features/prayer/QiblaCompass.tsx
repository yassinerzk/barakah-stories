import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { ui } from '../../theme';

interface QiblaCompassProps {
  /** Bearing to the Kaaba, degrees clockwise from North. */
  qibla: number;
  /** Device heading, or null to draw relative to North. */
  heading: number | null;
  size?: number;
}

/**
 * Compass rose that rotates with the device so the Kaaba arrow points at the
 * real Qibla; without a heading it shows the bearing relative to North.
 */
const c = 100;

/**
 * Ticks and cardinal letters are the same on every frame. Built once at module
 * load, so a heading update (several a second) only changes one rotation.
 */
const ROSE = (
  <>
    {Array.from({ length: 72 }, (_, i) => i * 5).map((a) => {
      const major = a % 90 === 0;
      const len = major ? 10 : a % 30 === 0 ? 7 : 4;
      const r1 = 90;
      const rad = ((a - 90) * Math.PI) / 180;
      return (
        <Line
          key={a}
          x1={c + r1 * Math.cos(rad)}
          y1={c + r1 * Math.sin(rad)}
          x2={c + (r1 - len) * Math.cos(rad)}
          y2={c + (r1 - len) * Math.sin(rad)}
          stroke={major ? ui.text : ui.textMuted}
          strokeWidth={major ? 2 : 1}
        />
      );
    })}
    {(['N', 'E', 'S', 'W'] as const).map((label, i) => {
      const rad = ((i * 90 - 90) * Math.PI) / 180;
      return (
        <SvgText
          key={label}
          x={c + 70 * Math.cos(rad)}
          y={c + 70 * Math.sin(rad) + 5}
          fill={label === 'N' ? ui.accent : ui.textMuted}
          fontSize={14}
          fontWeight="700"
          textAnchor="middle"
        >
          {label}
        </SvgText>
      );
    })}
  </>
);

export function QiblaCompass({ qibla, heading, size = 240 }: QiblaCompassProps) {
  const rotation = heading === null ? 0 : -heading;
  const aligned = heading !== null && Math.abs(((qibla - heading + 540) % 360) - 180) < 4;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Circle
          cx={c}
          cy={c}
          r={96}
          fill={ui.bgElev}
          stroke={aligned ? ui.accent : ui.line}
          strokeWidth={aligned ? 3 : 1.5}
        />
        <G rotation={rotation} origin={`${c}, ${c}`}>
          {ROSE}
          {/* Kaaba arrow */}
          <G rotation={qibla} origin={`${c}, ${c}`}>
            <Path d={`M${c} ${c - 84} l10 26 -10 -8 -10 8z`} fill={ui.accent} />
            <Line
              x1={c}
              y1={c - 60}
              x2={c}
              y2={c + 30}
              stroke={ui.accent}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <Path d={`M${c - 9} ${c - 74} h18 v18 h-18z`} fill="#111" stroke={ui.accent} strokeWidth={1.5} />
            <Line x1={c - 9} y1={c - 68} x2={c + 9} y2={c - 68} stroke={ui.accent} strokeWidth={2} />
          </G>
        </G>
        {/* fixed pointer showing device forward direction */}
        <Path d={`M${c} 2 l6 12 h-12z`} fill={ui.text} />
        <Circle cx={c} cy={c} r={5} fill={ui.text} />
      </Svg>
    </View>
  );
}
