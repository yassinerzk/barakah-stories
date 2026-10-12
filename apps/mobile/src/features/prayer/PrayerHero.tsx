import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Easing, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { toLocaleDigits, type DayPhase, type Locale, type PrayerName, type SunArc } from '@barakah/core';
import { useT } from '../../i18n';
import { motion, ui } from '../../theme';
import { useReducedMotion } from '../../a11y';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ArcLabel {
  name: string;
  time: string;
}

export interface NextInfo {
  id: PrayerName;
  name: string;
  /** Formatted adhan time. */
  time: string;
  at: Date;
}

interface Props {
  arc: SunArc;
  labels: Partial<Record<PrayerName, ArcLabel>>;
  next: NextInfo | null;
  /** Greeting, location and settings, drawn over the sky. */
  header: ReactNode;
  /** What a screen reader says for the whole scene, with minute precision. */
  summary: string;
}

/*
 * Drawn in the design's own units — a 390-wide phone where the arc's baseline
 * sits at y = 300 — then scaled to the screen. The arc stops growing at
 * MAX_W so it stays a sky on tablets instead of a banner.
 */
const BASE_W = 390;
const MAX_W = 560;
/** Design y of the arc area's top edge; everything above it is header. */
const TOP = 90;
const AREA_H = 290;
const CX = 195;
const BASE_Y = 300;
const RX = 150;
const RY = 170;
const ARC_D = `M ${CX - RX} ${BASE_Y} A ${RX} ${RY} 0 0 1 ${CX + RX} ${BASE_Y}`;
const SAMPLES = 48;
const LABEL_W = 92;

const SKY: Record<DayPhase, [string, string, string, string]> = {
  day: ['#0F2E28', '#174339', '#1C4B40', ui.bg],
  dawn: ['#05110E', '#0C231E', '#26372A', ui.bg],
  evening: ['#05110E', '#0C231E', '#2A3A22', ui.bg],
  night: ['#030B09', '#071713', '#0E2723', ui.bg],
};

const arcPoint = (t: number) => ({
  x: CX - RX * Math.cos(Math.PI * t),
  y: BASE_Y - RY * Math.sin(Math.PI * t),
});

/** Points along the arc and the dash offset that reveals it up to each one. */
const SAMPLED = (() => {
  const ts: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  const lens: number[] = [];
  let len = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = arcPoint(t);
    if (i > 0) len += Math.hypot(p.x - xs[i - 1], p.y - ys[i - 1]);
    ts.push(t);
    xs.push(p.x);
    ys.push(p.y);
    lens.push(len);
  }
  return { ts, xs, ys, length: len, offsets: lens.map((l) => len - l) };
})();

/**
 * The top of the prayer screen: a dusk-courtyard sky that follows the time of
 * day, the day's arc over a mosque reflected in a pool, the sun (or moon) at
 * the present moment, and the countdown to the next prayer framed by the arc.
 * The gold line drawing in from Fajr is the screen's one moving moment.
 */
export function PrayerHero({ arc, labels, next, header, summary }: Props) {
  const { t, font, row, locale } = useT();
  const rtl = row === 'row-reverse';
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [heroH, setHeroH] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));
  const [revealed, setRevealed] = useState(false);

  const s = Math.min(width, MAX_W) / BASE_W;
  const ox = (width - BASE_W * s) / 2;
  const night = arc.phase !== 'day';

  useEffect(() => {
    if (!width) return;
    if (reduced) {
      progress.setValue(arc.t);
      return;
    }
    if (!revealed) progress.setValue(0);
    Animated.timing(progress, {
      toValue: arc.t,
      duration: revealed ? motion.moveMs : motion.revealMs,
      easing: Easing.out(Easing.cubic),
      // Drives an SVG prop as well as transforms, so it runs on JS: once on
      // open and for a moment each minute, nothing per frame at rest.
      useNativeDriver: false,
    }).start(() => setRevealed(true));
  }, [arc.t, width, reduced, progress, revealed]);

  // Design coords → screen coords (mirrored for right-to-left languages).
  const sx = (x: number) => ox + (rtl ? BASE_W - x : x) * s;
  const sy = (y: number) => (y - TOP) * s;

  const sunXs = useMemo(() => SAMPLED.xs.map((x) => ox + (rtl ? BASE_W - x : x) * s), [ox, rtl, s]);
  const sunYs = useMemo(() => SAMPLED.ys.map((y) => (y - TOP) * s), [s]);
  const glow = 68 * s;

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(Math.round(e.nativeEvent.layout.width));
    setHeroH(Math.round(e.nativeEvent.layout.height));
  };

  const sky = SKY[arc.phase];
  const sun = arcPoint(arc.t);

  return (
    <View onLayout={onLayout} style={{ overflow: 'hidden' }}>
      {width > 0 && heroH > 0 && (
        <Svg width={width} height={heroH} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Defs>
            <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={sky[0]} />
              <Stop offset="0.45" stopColor={sky[1]} />
              <Stop offset="0.8" stopColor={sky[2]} />
              <Stop offset="1" stopColor={sky[3]} />
            </LinearGradient>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#F6DE97" stopOpacity={night ? 0.14 : 0.28} />
              <Stop offset="0.45" stopColor={ui.accent} stopOpacity={0.08} />
              <Stop offset="1" stopColor={ui.accent} stopOpacity={0} />
            </RadialGradient>
            <Pattern id="girih" width={44} height={44} patternUnits="userSpaceOnUse">
              <Path d="M22 4 L27 17 L40 22 L27 27 L22 40 L17 27 L4 22 L17 17 Z" fill="none" stroke={ui.accent} strokeWidth={0.7} />
            </Pattern>
          </Defs>
          <Rect width={width} height={heroH} fill="url(#sky)" />
          <Rect width={width} height={heroH * 0.55} fill="url(#girih)" opacity={0.07} />
          {/* the sky's light sits where the sun is now */}
          <Circle cx={sx(sun.x)} cy={heroH - AREA_H * s + sy(sun.y)} r={170 * s} fill="url(#halo)" />
          {night && <Stars width={width} height={heroH * 0.5} />}
        </Svg>
      )}

      {header}

      <View accessible accessibilityLabel={summary} style={{ height: width ? AREA_H * s : 0 }}>
        {width > 0 && (
          <>
            <Svg width={width} height={AREA_H * s} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <Defs>
                <LinearGradient id="arcGold" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#9C7F38" />
                  <Stop offset="1" stopColor="#F0D488" />
                </LinearGradient>
                <LinearGradient id="pool" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={ui.accent} stopOpacity={0.1} />
                  <Stop offset="1" stopColor={ui.accent} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <G transform={rtl ? `translate(${ox + BASE_W * s} ${-TOP * s}) scale(${-s} ${s})` : `translate(${ox} ${-TOP * s}) scale(${s})`}>
                <Mosque lit={night ? 0.55 : 0.25} />
                <Rect x={-200} y={BASE_Y} width={BASE_W + 400} height={80} fill="url(#pool)" />
                <G transform={`translate(0 ${BASE_Y * 2}) scale(1 -1)`} opacity={0.33}>
                  <Mosque lit={0} />
                </G>
                <Line x1={-200} y1={BASE_Y} x2={BASE_W + 200} y2={BASE_Y} stroke={ui.accent} strokeOpacity={0.35} strokeWidth={1} />
                <Path d={ARC_D} fill="none" stroke={ui.textMuted} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="2 6" strokeLinecap="round" />
                <AnimatedPath
                  d={ARC_D}
                  fill="none"
                  stroke="url(#arcGold)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={`${SAMPLED.length} ${SAMPLED.length}`}
                  strokeDashoffset={progress.interpolate({ inputRange: SAMPLED.ts, outputRange: SAMPLED.offsets })}
                />
                {arc.markers.map((m) => {
                  const p = arcPoint(m.t);
                  const passed = m.t <= arc.t;
                  const isCurrent = m.id === arc.current;
                  const isNext = m.id === next?.id;
                  return (
                    <Circle
                      key={m.id}
                      cx={p.x}
                      cy={p.y}
                      r={isCurrent || isNext ? 5 : 4.5}
                      fill={passed ? ui.accent : ui.bg}
                      stroke={isCurrent ? ui.bg : passed ? ui.accent : isNext ? ui.text : ui.textMuted}
                      strokeWidth={isCurrent ? 2 : 1.5}
                    />
                  );
                })}
              </G>
            </Svg>

            {arc.markers.map((m) => {
              const label = labels[m.id];
              if (!label) return null;
              const p = arcPoint(m.t);
              const box = labelBox(sx(p.x), sy(p.y), width, s);
              const isCurrent = m.id === arc.current;
              const isNext = m.id === next?.id;
              const color = isCurrent ? ui.accent : isNext ? ui.text : ui.textMuted;
              return (
                <View
                  key={m.id}
                  pointerEvents="none"
                  style={{ position: 'absolute', left: box.left, top: box.top, width: LABEL_W, alignItems: box.align }}
                >
                  <Text numberOfLines={1} style={{ color, fontFamily: isCurrent || isNext ? font.semibold : font.regular, fontSize: 12 }}>
                    {label.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ color: isCurrent ? ui.accent : ui.text, fontFamily: isCurrent ? font.semibold : font.regular, fontSize: 12, fontVariant: ['tabular-nums'] }}
                  >
                    {label.time}
                  </Text>
                </View>
              );
            })}

            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: glow,
                height: glow,
                transform: [
                  { translateX: progress.interpolate({ inputRange: SAMPLED.ts, outputRange: sunXs.map((x) => x - glow / 2) }) },
                  { translateY: progress.interpolate({ inputRange: SAMPLED.ts, outputRange: sunYs.map((y) => y - glow / 2) }) },
                ],
              }}
            >
              <Body night={night} size={glow} />
            </Animated.View>

            {next && (
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: (162 - TOP) * s, alignItems: 'center' }}>
                <Text style={{ color: ui.textMuted, fontFamily: font.medium, fontSize: 13, letterSpacing: 1.5 }}>
                  {`${t('nextPrayer')} · ${next.name}`.toLocaleUpperCase(locale)}
                </Text>
                <Countdown at={next.at} locale={locale} fontFamily={font.semibold} size={Math.round(46 * Math.min(1.15, s))} />
                <View style={{ flexDirection: row, alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 16, height: 1, backgroundColor: 'rgba(217,182,92,0.5)' }} />
                  <Text style={{ color: ui.text, fontFamily: font.regular, fontSize: 13, fontVariant: ['tabular-nums'] }}>{next.time}</Text>
                  <View style={{ width: 16, height: 1, backgroundColor: 'rgba(217,182,92,0.5)' }} />
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

/**
 * Ends of the arc: label under the dot. Low on the sides: label towards the
 * middle, so it never leaves the screen. Higher up: label above the dot.
 */
function labelBox(x: number, y: number, width: number, s: number) {
  const baseline = (BASE_Y - TOP) * s;
  if (baseline - y < 6 * s) {
    return { left: clamp(x - LABEL_W / 2, 0, width - LABEL_W), top: y + 10 * s, align: 'center' as const };
  }
  const mid = width / 2;
  if (Math.abs(x - mid) > 110 * s) {
    const inward = x < mid;
    return {
      left: inward ? x + 12 * s : x - 12 * s - LABEL_W,
      top: y - 16,
      align: inward ? ('flex-start' as const) : ('flex-end' as const),
    };
  }
  return { left: clamp(x - LABEL_W / 2, 0, width - LABEL_W), top: y - 48, align: 'center' as const };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The sun with its halo, or a crescent at night. */
function Body({ night, size }: { night: boolean; size: number }) {
  const c = size / 2;
  const k = size / 68;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF1C4" stopOpacity={night ? 0.5 : 1} />
          <Stop offset="0.3" stopColor="#F6DE97" stopOpacity={night ? 0.2 : 0.55} />
          <Stop offset="1" stopColor={ui.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill="url(#sunGlow)" />
      {night ? (
        // The two arcs' end points sit closer than either diameter, or SVG
        // stretches both radii and the crescent collapses to nothing.
        <Path transform={`translate(${c - 9 * k} ${c - 12 * k}) scale(${0.75 * k})`} d="M16 0 A16 16 0 1 1 0 24 A13 13 0 1 0 16 0 Z" fill="#FFF1C4" />
      ) : (
        <Circle cx={c} cy={c} r={8.5 * k} fill="#FFF1C4" />
      )}
    </Svg>
  );
}

/** Dome, walls and two minarets, with a few warm windows. Design units. */
function Mosque({ lit }: { lit: number }) {
  return (
    <>
      <G fill={ui.accent} fillOpacity={0.18}>
        <Rect x={113} y={226} width={11} height={74} rx={2} />
        <Path d="M113 226 L118.5 206 L124 226 Z" />
        <Rect x={110} y={238} width={17} height={3} rx={1} />
        <Rect x={110} y={258} width={17} height={3} rx={1} />
        <Rect x={266} y={226} width={11} height={74} rx={2} />
        <Path d="M266 226 L271.5 206 L277 226 Z" />
        <Rect x={263} y={238} width={17} height={3} rx={1} />
        <Rect x={263} y={258} width={17} height={3} rx={1} />
        <Path d="M154 300 L154 286 Q154 266 195 262 Q236 266 236 286 L236 300 Z" />
        <Path d="M193 262 L195 250 L197 262 Z" />
        <Rect x={128} y={284} width={134} height={16} rx={2} />
      </G>
      {lit > 0 && (
        <G fill="#F6DE97" fillOpacity={lit}>
          <Path d="M183 300 L183 292 Q183 287 187 287 Q191 287 191 292 L191 300 Z" />
          <Path d="M199 300 L199 292 Q199 287 203 287 Q207 287 207 292 L207 300 Z" />
          <Path d="M144 300 L144 295 Q144 292 147 292 Q150 292 150 295 L150 300 Z" />
          <Path d="M240 300 L240 295 Q240 292 243 292 Q246 292 246 295 L246 300 Z" />
        </G>
      )}
    </>
  );
}

const STAR_POINTS: ReadonlyArray<[number, number, number]> = [
  [0.09, 0.3, 1],
  [0.23, 0.2, 1.3],
  [0.36, 0.42, 0.8],
  [0.62, 0.16, 0.8],
  [0.8, 0.24, 1.1],
  [0.92, 0.45, 0.9],
  [0.15, 0.62, 0.8],
  [0.7, 0.55, 0.7],
];

function Stars({ width, height }: { width: number; height: number }) {
  return (
    <G fill={ui.text}>
      {STAR_POINTS.map(([x, y, r]) => (
        <Circle key={`${x}-${y}`} cx={x * width} cy={y * height} r={r} opacity={0.75} />
      ))}
    </G>
  );
}

/** H:MM:SS to `at`. Owns its one-second timer so nothing else redraws each second. */
function Countdown({ at, locale, fontFamily, size }: { at: Date; locale: Locale; fontFamily?: string; size: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(0, Math.floor((at.getTime() - now) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  const text = `${Math.floor(total / 3600)}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`.replace(/\d/g, (d) =>
    toLocaleDigits(Number(d), locale),
  );
  return (
    <Text style={{ color: ui.accent, fontFamily, fontSize: size, letterSpacing: -1, fontVariant: ['tabular-nums'], marginVertical: 2 }}>
      {text}
    </Text>
  );
}
