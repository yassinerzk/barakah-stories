import { Circle, Defs, G, Path, Pattern as SvgPattern, Polygon, Rect } from 'react-native-svg';
import type { PatternId } from '@barakah/core';

interface PatternProps {
  id: PatternId;
  color: string;
  opacity: number;
  uid: string;
  /** Height of the drawing space; 1920 for cards, taller for a phone-shaped wallpaper. */
  height?: number;
}

function star8Points(cx: number, cy: number, outer: number): string {
  const inner = outer * 0.765;
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 8) * i;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** Tiled geometric pattern in the 1080-wide card space (inside an <Svg>). */
export function PatternLayer({ id, color, opacity, uid, height = 1920 }: PatternProps) {
  if (id === 'none' || opacity <= 0) return null;
  const pid = `pat-${id}-${uid}`;
  const T = 180;
  let tile: React.ReactNode = null;
  switch (id) {
    case 'star8': {
      const R = T * 0.33;
      tile = (
        <G fill="none" stroke={color} strokeWidth={2.5}>
          <Polygon points={star8Points(T / 2, T / 2, R)} />
          <Polygon points={star8Points(0, 0, R)} />
          <Polygon points={star8Points(T, 0, R)} />
          <Polygon points={star8Points(0, T, R)} />
          <Polygon points={star8Points(T, T, R)} />
          <Circle cx={T / 2} cy={T / 2} r={R * 0.28} />
        </G>
      );
      break;
    }
    case 'zellige': {
      const h = T / 2;
      const d = `M ${h} 0 C ${h + 40} 25, ${T} ${h - 40}, ${T} ${h} C ${T} ${h + 40}, ${h + 40} ${T - 25}, ${h} ${T} C ${h - 40} ${T - 25}, 0 ${h + 40}, 0 ${h} C 0 ${h - 40}, ${h - 40} 25, ${h} 0 Z`;
      tile = (
        <G fill="none" stroke={color} strokeWidth={2.5}>
          <Path d={d} />
          <Circle cx={h} cy={h} r={12} />
        </G>
      );
      break;
    }
    case 'lattice':
      tile = (
        <G fill="none" stroke={color} strokeWidth={2}>
          <Path d={`M 0 ${T / 2} L ${T / 2} 0 L ${T} ${T / 2} L ${T / 2} ${T} Z`} />
          <Path d={`M 0 0 L ${T} ${T} M ${T} 0 L 0 ${T}`} strokeOpacity={0.5} />
        </G>
      );
      break;
    case 'dots':
      tile = (
        <G fill={color}>
          <Circle cx={T / 4} cy={T / 4} r={3} />
          <Circle cx={(3 * T) / 4} cy={(3 * T) / 4} r={3} />
          <Circle cx={(3 * T) / 4} cy={T / 4} r={1.5} />
          <Circle cx={T / 4} cy={(3 * T) / 4} r={1.5} />
        </G>
      );
      break;
  }
  return (
    <>
      <Defs>
        <SvgPattern id={pid} width={T} height={T} patternUnits="userSpaceOnUse">
          {tile}
        </SvgPattern>
      </Defs>
      <Rect width={1080} height={height} fill={`url(#${pid})`} opacity={opacity} />
    </>
  );
}
