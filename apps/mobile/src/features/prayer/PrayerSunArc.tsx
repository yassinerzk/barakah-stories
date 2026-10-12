import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { PrayerName, SunArc } from '@barakah/core';
import { useT } from '../../i18n';
import { motion, ui } from '../../theme';
import { useReducedMotion } from '../../a11y';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ArcLabel {
  name: string;
  time: string;
}

interface Props {
  arc: SunArc;
  labels: Partial<Record<PrayerName, ArcLabel>>;
}

/** Room left and right of the arc's ends, and above its top, for the labels. */
const PAD_X = 34;
const PAD_TOP = 52;
/** Space under the horizon for the skyline's base. */
const PAD_BOTTOM = 18;
const LABEL_W = 76;
const LABEL_H = 34;
/** How far a label sits from its dot, outwards from the arc. */
const LABEL_GAP = 24;
const SUN = 30;
const SAMPLES = 48;
const ASPECT = 0.52;

/**
 * The day as an arc over a mosque skyline: the six times sit on it in order,
 * the part already travelled is gold, and the sun (the moon at night) sits at
 * the present moment. Purely decorative for screen readers — the countdown and
 * the list below carry the same information as text.
 */
export function PrayerSunArc({ arc, labels }: Props) {
  const { font, row } = useT();
  const rtl = row === 'row-reverse';
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  // State, not a ref: the value object is created once and read during render.
  const [progress] = useState(() => new Animated.Value(0));
  const revealed = useRef(false);

  const geo = useMemo(() => geometry(width, rtl), [width, rtl]);

  useEffect(() => {
    if (!geo) return;
    if (reduced) {
      progress.setValue(arc.t);
      revealed.current = true;
      return;
    }
    const first = !revealed.current;
    revealed.current = true;
    if (first) progress.setValue(0);
    Animated.timing(progress, {
      toValue: arc.t,
      duration: first ? motion.revealMs : motion.moveMs,
      easing: Easing.out(Easing.cubic),
      // Drives an SVG prop as well as a transform, so it has to run on JS. It
      // runs once on open and for a moment each minute: nothing per frame at rest.
      useNativeDriver: false,
    }).start();
  }, [arc.t, geo, reduced, progress]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  return (
    <View
      onLayout={onLayout}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: '100%', height: geo?.height ?? Math.round(width * ASPECT) }}
    >
      {geo && (
        <>
          <Svg width={geo.width} height={geo.height}>
            <Line x1={0} y1={geo.baseY} x2={geo.width} y2={geo.baseY} stroke={ui.line} strokeWidth={1} />
            <Skyline cx={geo.width / 2} baseY={geo.baseY} width={geo.rx * 1.25} />
            {/* the whole day, faint */}
            <Path d={geo.d} stroke={ui.lineStrong} strokeWidth={1.5} strokeDasharray="3 5" fill="none" />
            {/* the part already lived, gold */}
            <AnimatedPath
              d={geo.d}
              stroke={ui.accent}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${geo.length} ${geo.length}`}
              strokeDashoffset={progress.interpolate({ inputRange: geo.ts, outputRange: geo.dashOffsets })}
            />
            {arc.markers.map((m) => {
              const p = geo.point(m.t);
              const passed = m.t <= arc.t;
              const isCurrent = m.id === arc.current;
              return (
                <Circle
                  key={m.id}
                  cx={p.x}
                  cy={p.y}
                  r={isCurrent ? 5.5 : 4}
                  fill={passed ? ui.accent : ui.bgElev2}
                  stroke={passed ? ui.accent : ui.lineStrong}
                  strokeWidth={1.5}
                />
              );
            })}
          </Svg>

          {arc.markers.map((m) => {
            const label = labels[m.id];
            if (!label) return null;
            const box = geo.labelBox(m.t);
            const isCurrent = m.id === arc.current;
            return (
              <View key={m.id} style={{ position: 'absolute', left: box.left, top: box.top, width: LABEL_W, alignItems: 'center' }}>
                <Text
                  numberOfLines={1}
                  style={{ color: isCurrent ? ui.accent : ui.textMuted, fontFamily: isCurrent ? font.semibold : font.medium, fontSize: 12 }}
                >
                  {label.name}
                </Text>
                <Text numberOfLines={1} style={{ color: isCurrent ? ui.accent : ui.text, fontFamily: font.regular, fontSize: 11, fontVariant: ['tabular-nums'] }}>
                  {label.time}
                </Text>
              </View>
            );
          })}

          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: SUN,
              height: SUN,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [
                { translateX: progress.interpolate({ inputRange: geo.ts, outputRange: geo.xs.map((x) => x - SUN / 2) }) },
                { translateY: progress.interpolate({ inputRange: geo.ts, outputRange: geo.ys.map((y) => y - SUN / 2) }) },
              ],
            }}
          >
            {arc.isNight ? <Ionicons name="moon" size={18} color={ui.text} /> : <SunDot />}
          </Animated.View>
        </>
      )}
    </View>
  );
}

function SunDot() {
  return (
    <Svg width={SUN} height={SUN}>
      <Defs>
        <RadialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={ui.accent} stopOpacity={0.6} />
          <Stop offset="1" stopColor={ui.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={SUN / 2} cy={SUN / 2} r={SUN / 2} fill="url(#sunGlow)" />
      <Circle cx={SUN / 2} cy={SUN / 2} r={7} fill="#fff6d8" />
    </Svg>
  );
}

/** A small mosque silhouette sitting on the horizon: dome, walls, two minarets. */
function Skyline({ cx, baseY, width }: { cx: number; baseY: number; width: number }) {
  const s = width / 200;
  const x0 = cx - width / 2;
  const y0 = baseY - 40 * s;
  const d = SKYLINE.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) =>
    `${(x0 + Number(x) * s).toFixed(1)} ${(y0 + Number(y) * s).toFixed(1)}`,
  );
  return <Path d={d} fill={ui.accent} opacity={0.18} />;
}

/** 200 × 40 units, baseline at y = 40. Points only, so it scales by substitution. */
const SKYLINE =
  'M0 40 L0 32 L22 32 L22 26 L34 26 L34 32 L62 32 L62 22 Q100 -8 138 22 L138 32 L166 32 L166 26 L178 26 L178 32 L200 32 L200 40 Z ' +
  'M44 32 L44 8 L48 0 L52 8 L52 32 Z M148 32 L148 8 L152 0 L156 8 L156 32 Z';

interface Geometry {
  width: number;
  height: number;
  baseY: number;
  rx: number;
  d: string;
  length: number;
  ts: number[];
  xs: number[];
  ys: number[];
  dashOffsets: number[];
  point: (t: number) => { x: number; y: number };
  labelBox: (t: number) => { left: number; top: number };
}

/**
 * The arc is the top half of an ellipse. Positions along it are sampled once so
 * the animation can interpolate between plain numbers (translate and dash
 * offset), which keeps the per-frame work trivial.
 */
function geometry(width: number, rtl: boolean): Geometry | null {
  if (width < 120) return null;
  const height = Math.round(width * ASPECT);
  const baseY = height - PAD_BOTTOM;
  const rx = width / 2 - PAD_X;
  const ry = baseY - PAD_TOP;
  const cx = width / 2;
  const dir = rtl ? -1 : 1;

  const point = (t: number) => ({
    x: cx - dir * rx * Math.cos(Math.PI * t),
    y: baseY - ry * Math.sin(Math.PI * t),
  });

  const ts: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const lengths: number[] = [];
  let length = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = point(t);
    if (i > 0) length += Math.hypot(p.x - xs[i - 1], p.y - ys[i - 1]);
    ts.push(t);
    xs.push(p.x);
    ys.push(p.y);
    lengths.push(length);
  }

  const start = point(0);
  const end = point(1);
  const sweep = rtl ? 0 : 1;
  const d = `M ${start.x} ${start.y} A ${rx} ${ry} 0 0 ${sweep} ${end.x} ${end.y}`;

  const labelBox = (t: number) => {
    const p = point(t);
    // Outward normal of the ellipse at this point, so labels fan out around it.
    const a = Math.PI * t;
    const nx = (-dir * Math.cos(a)) / rx;
    const ny = -Math.sin(a) / ry;
    const n = Math.hypot(nx, ny) || 1;
    const lx = p.x + (nx / n) * LABEL_GAP;
    const ly = p.y + (ny / n) * LABEL_GAP;
    return {
      left: Math.min(width - LABEL_W, Math.max(0, lx - LABEL_W / 2)),
      top: Math.min(baseY - LABEL_H, Math.max(0, ly - LABEL_H / 2)),
    };
  };

  return {
    width,
    height,
    baseY,
    rx,
    d,
    length,
    ts,
    xs,
    ys,
    dashOffsets: lengths.map((l) => length - l),
    point,
    labelBox,
  };
}
