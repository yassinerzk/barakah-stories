import { reducedMotionNow } from '../a11y';
import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, useAnimatedValue, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ui } from '../theme';
import {
  BRAND_VIEWBOX,
  markFull,
  MARK_CONTENT_RATIO,
  MARK_END_SCALE,
  wordmarkFull,
  WORDMARK_MARK_CENTRE,
} from './artwork';

/**
 * The animated opening: the crescent spins, shrinks, and settles into the slot
 * it occupies inside the wordmark, which fades up around it.
 *
 * It is drawn in SVG rather than played as a video. A video would need a fixed
 * resolution, a background that never quite matches, and a decoder on the
 * critical path of a cold start; vectors stay sharp at every density, weigh
 * almost nothing, and need no new dependency.
 *
 * The handoff from the native splash is what makes it feel like one thing: the
 * native splash (`assets/splash-icon.png`) is the same mark on the same ground,
 * and `START_SCALE` below is computed so the first animated frame is exactly the
 * size the native splash left it at — no jump, no fade-in.
 */

/** Native splash art is the mark at half the width of a square, `contain`-fitted. */
const NATIVE_SPLASH_FRACTION = 0.5;

const SPIN_MS = 1400;
const HOLD_MS = 350;
const FADE_MS = 280;
/**
 * Hard ceiling on the overlay's life. `Animated` only reports `finished: true`
 * when a run completes cleanly, and a run interrupted by the app being
 * backgrounded mid-launch would leave the callback unfired — which would look
 * to the user like the app had hung on a blank green screen. Whatever happens
 * to the animation, the splash goes away.
 */
const FAILSAFE_MS = SPIN_MS + HOLD_MS + FADE_MS + 1500;
/** The mark reaches its resting place at this point through the spin. */
const SETTLE_AT = 0.55;

interface AnimatedSplashProps {
  /** Called once the overlay has finished fading out. */
  onDone: () => void;
}

export function AnimatedSplash({ onDone }: AnimatedSplashProps) {
  const { width, height } = useWindowDimensions();
  const travel = useAnimatedValue(0);
  const spin = useAnimatedValue(0);
  const fade = useAnimatedValue(0);

  // A square stage: both files share one viewBox, so drawing them at the same
  // size in the same place makes their coordinates line up exactly.
  const stage = Math.min(width * 0.86, 420);
  const unit = stage / BRAND_VIEWBOX;

  // Where the crescent has to end up, relative to the centre of the stage.
  const endX = (WORDMARK_MARK_CENTRE.x - BRAND_VIEWBOX / 2) * unit;
  const endY = (WORDMARK_MARK_CENTRE.y - BRAND_VIEWBOX / 2) * unit;

  // Match the size the native splash was already showing, so the swap is invisible.
  const nativeMarkWidth = Math.min(width, height) * NATIVE_SPLASH_FRACTION;
  const startScale = nativeMarkWidth / (MARK_CONTENT_RATIO * stage);
  // A hair larger than the measured crescent, so the gold fully covers the
  // wordmark's own crescent underneath rather than leaving a pale edge.
  const endScale = MARK_END_SCALE * 1.015;

  useEffect(() => {
    const fadeOut = Animated.timing(fade, {
      toValue: 1,
      duration: FADE_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    const full = Animated.sequence([
      Animated.parallel([
        Animated.timing(spin, {
          toValue: 1,
          duration: SPIN_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(travel, {
          toValue: 1,
          duration: SPIN_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(HOLD_MS),
      fadeOut,
    ]);
    // Set by finishing and by unmounting: either way, nothing below may run again.
    let done = false;
    let run: Animated.CompositeAnimation | null = null;
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };
    // Reduce motion (system or in-app): no spin, no travel — the mark settles in
    // place and the screen simply fades to the app.
    void reducedMotionNow().then((reduced) => {
      if (done) return;
      if (reduced) {
        spin.setValue(1);
        travel.setValue(1);
      }
      run = reduced ? fadeOut : full;
      run.start(({ finished }) => {
        if (finished) finish();
      });
    });
    const failsafe = setTimeout(finish, FAILSAFE_MS);
    return () => {
      done = true;
      clearTimeout(failsafe);
      run?.stop();
    };
  }, [spin, travel, fade, onDone]);

  const markStyle = {
    position: 'absolute' as const,
    width: stage,
    height: stage,
    transform: [
      {
        translateX: travel.interpolate({
          inputRange: [0, SETTLE_AT, 1],
          outputRange: [0, 0, endX],
        }),
      },
      {
        translateY: travel.interpolate({
          inputRange: [0, SETTLE_AT, 1],
          outputRange: [0, 0, endY],
        }),
      },
      { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
      {
        scale: travel.interpolate({
          inputRange: [0, SETTLE_AT, 1],
          outputRange: [startScale, startScale, endScale],
        }),
      },
    ],
  };

  return (
    <Animated.View
      // Ignore touches entirely; the app underneath is already mounted.
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: ui.bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        },
      ]}
    >
      <View style={{ width: stage, height: stage, alignItems: 'center', justifyContent: 'center' }}>
        {/* Behind: the full wordmark, including its own crescent. */}
        <Animated.View
          style={{
            position: 'absolute',
            width: stage,
            height: stage,
            opacity: travel.interpolate({
              inputRange: [0, SETTLE_AT, 0.85, 1],
              outputRange: [0, 0, 1, 1],
            }),
          }}
        >
          <SvgXml xml={wordmarkFull(ui.text)} width="100%" height="100%" />
        </Animated.View>

        {/* In front: the mark that travels into the wordmark's crescent. */}
        <Animated.View style={markStyle}>
          <SvgXml xml={markFull(ui.accent)} width="100%" height="100%" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
