import { forwardRef, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';
import { Image } from 'expo-image';
import { getBackground, getTheme, PHOTO_PALETTE, SCRIMS, themeBaseColor, wallpaperTextSize, type Wallpaper } from '@barakah/core';
import { useT } from '../i18n';
import { BACKGROUND_IMAGES, BACKGROUND_THUMBS } from '../backgrounds';
import { GradientFill } from '../components/Gradient';
import { PatternLayer } from '../components/Pattern';
import { wallpaperText } from './words';

/** Width of the drawing space: the story cards' own, so patterns tile at the same scale. */
const SPACE_W = 1080;
/**
 * Where the words go, as shares of the height: below the clock that lock
 * screens draw near the top, and above the shortcuts along the bottom.
 */
const WORDS_TOP = 0.44;
const WORDS_BOTTOM = 0.2;
const SIDE_MARGIN = 0.08;
/** Space under the star rule, as a share of the text size. */
const ORNAMENT_CLEARANCE = 0.45;

interface WallpaperArtProps {
  wallpaper: Wallpaper;
  width: number;
  height: number;
  /** Gallery tiles load the small photos. */
  thumb?: boolean;
}

/**
 * One wallpaper at any size. The same component draws the gallery tile and
 * the full-screen picture that gets saved, so the two cannot differ.
 */
export const WallpaperArt = forwardRef<View, WallpaperArtProps>(function WallpaperArt({ wallpaper, width, height, thumb = false }, ref) {
  const { locale, font } = useT();
  const uid = `${useId().replace(/[^a-zA-Z0-9]/g, '')}${wallpaper.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const spaceH = Math.round((SPACE_W * height) / Math.max(width, 1));
  const { base } = wallpaper;
  const background = base.kind === 'photo' ? getBackground(base.background) : null;
  const theme = base.kind === 'theme' ? getTheme(base.theme) : null;
  const palette = theme && !background ? { text: theme.text, accent: theme.accent } : { text: PHOTO_PALETTE.text, accent: PHOTO_PALETTE.accent };
  const words = wallpaperText(wallpaper.words, locale);
  const size = words ? wallpaperTextSize(words.arabic) * width : 0;
  const dark = !!background || theme?.mode === 'dark';
  const shadow = dark
    ? { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: size * 0.04 }, textShadowRadius: size * 0.18 }
    : {};

  return (
    <View ref={ref} collapsable={false} style={{ width, height, overflow: 'hidden', backgroundColor: theme ? themeBaseColor(theme) : '#0B1F1C' }}>
      {background ? (
        <>
          <Image
            source={(thumb ? BACKGROUND_THUMBS : BACKGROUND_IMAGES)[background.id]}
            accessible={false}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {/* The legibility shade is only needed under words; a bare photo stays bright. */}
          {words && (
            <Svg key={`scrim-${uid}`} style={StyleSheet.absoluteFill} viewBox={`0 0 ${SPACE_W} ${spaceH}`} preserveAspectRatio="none">
              <GradientFill id={`scrim-${uid}`} gradient={SCRIMS[background.scrim]} width={SPACE_W} height={spaceH} />
            </Svg>
          )}
        </>
      ) : theme ? (
        <Svg key={`bg-${uid}`} style={StyleSheet.absoluteFill} viewBox={`0 0 ${SPACE_W} ${spaceH}`} preserveAspectRatio="none">
          <GradientFill id={`bg-${uid}`} gradient={theme.gradient} width={SPACE_W} height={spaceH} />
          <PatternLayer id={theme.pattern} color={theme.patternColor} opacity={theme.patternOpacity} uid={uid} height={spaceH} />
        </Svg>
      ) : null}

      {words && (
        <View
          style={{
            position: 'absolute',
            left: width * SIDE_MARGIN,
            right: width * SIDE_MARGIN,
            top: height * WORDS_TOP,
            bottom: height * WORDS_BOTTOM,
            alignItems: 'center',
            justifyContent: 'center',
            gap: size * 0.4,
          }}
        >
          {/* Extra room under the rule: Quranic pause marks sit high above the first line. */}
          <View style={{ marginBottom: size * ORNAMENT_CLEARANCE }}>
            <Ornament color={palette.accent} width={size * 2.4} />
          </View>
          <Text
            allowFontScaling={false}
            style={{ color: palette.text, fontFamily: 'Amiri_700Bold', fontSize: size, lineHeight: size * 1.8, textAlign: 'center', writingDirection: 'rtl', ...shadow }}
          >
            {words.arabic}
          </Text>
          {words.caption && (
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={{ color: palette.accent, fontFamily: font.medium, fontSize: Math.max(7, width * 0.03), letterSpacing: width * 0.004, textAlign: 'center', ...shadow }}
            >
              {words.caption.toLocaleUpperCase(locale)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

/** Eight-pointed star outline points, the motif of the app's patterns. */
function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const radius = i % 2 === 0 ? r : r * 0.55;
    const a = (Math.PI / 8) * i;
    pts.push(`${(cx + radius * Math.cos(a)).toFixed(2)},${(cy + radius * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** A thin gold rule with a small star at its centre, set above the words. */
function Ornament({ color, width }: { color: string; width: number }) {
  const h = Math.max(4, width * 0.16);
  const mid = width / 2;
  const r = h / 2;
  const stroke = Math.max(0.5, width * 0.006);
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Line x1={0} y1={h / 2} x2={mid - r * 1.8} y2={h / 2} stroke={color} strokeWidth={stroke} strokeOpacity={0.75} />
      <Line x1={mid + r * 1.8} y1={h / 2} x2={width} y2={h / 2} stroke={color} strokeWidth={stroke} strokeOpacity={0.75} />
      <Polygon points={starPoints(mid, h / 2, r)} fill={color} />
    </Svg>
  );
}
