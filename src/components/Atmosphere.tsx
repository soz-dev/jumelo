import React, { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import { useTheme } from '../context/ThemeContext';
import { JumeloLottie } from './JumeloLottie';

type Props = {
  variant?: 'soft' | 'bold' | 'intro';
  /** Calques Lottie décoratifs (bolt / spark). Défaut : true. */
  lottie?: boolean;
  children?: React.ReactNode;
};

/**
 * Fond texturé : blobs colorés + griffures SVG + Lottie abstraites en filigrane.
 * `intro` = disposition plus douce / anneaux, sans éclairs Home.
 */
export function Atmosphere({ variant = 'soft', lottie = true, children }: Props) {
  const { colors } = useTheme();
  const isIntro = variant === 'intro';
  const opacity = variant === 'bold' ? 0.16 : isIntro ? 0.12 : 0.09;
  const patternId = useId().replace(/:/g, '');
  const lottieOpacity = variant === 'bold' ? 0.22 : isIntro ? 0.12 : 0.15;

  const drift = useSharedValue(0);
  useEffect(() => {
    if (!isIntro) return;
    drift.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [drift, isIntro]);

  const blobFloatA = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value * 14 }, { translateX: drift.value * -8 }],
  }));
  const blobFloatB = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value * -12 }, { translateX: drift.value * 10 }],
  }));
  const blobFloatC = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value * 8 }, { scale: 1 + drift.value * 0.04 }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.cream }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          isIntro ? styles.introBlobA : styles.blobA,
          { backgroundColor: colors.primary, opacity: opacity + 0.04 },
          isIntro ? blobFloatA : null,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          isIntro ? styles.introBlobB : styles.blobB,
          { backgroundColor: isIntro ? colors.primarySoft : colors.accent, opacity: isIntro ? 0.55 : opacity },
          isIntro ? blobFloatB : null,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          isIntro ? styles.introBlobC : styles.blobC,
          { backgroundColor: colors.primaryDark, opacity: opacity * 0.7 },
          isIntro ? blobFloatC : null,
        ]}
      />

      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
      >
        <Defs>
          <Pattern
            id={`scratches-${patternId}`}
            patternUnits="userSpaceOnUse"
            width={isIntro ? 56 : 48}
            height={isIntro ? 56 : 48}
          >
            {isIntro ? (
              <>
                <Circle cx="8" cy="12" r="1.2" fill={colors.primary} opacity="0.1" />
                <Circle cx="28" cy="36" r="1" fill={colors.ink} opacity="0.06" />
                <Circle cx="44" cy="18" r="1.4" fill={colors.accent} opacity="0.08" />
              </>
            ) : (
              <>
                <Line
                  x1="0"
                  y1="8"
                  x2="18"
                  y2="0"
                  stroke={colors.ink}
                  strokeWidth="1"
                  opacity="0.06"
                />
                <Line
                  x1="24"
                  y1="40"
                  x2="48"
                  y2="28"
                  stroke={colors.ink}
                  strokeWidth="1"
                  opacity="0.05"
                />
                <Line
                  x1="10"
                  y1="48"
                  x2="30"
                  y2="30"
                  stroke={colors.primary}
                  strokeWidth="1"
                  opacity="0.07"
                />
              </>
            )}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#scratches-${patternId})`} />

        {isIntro ? (
          <>
            <Circle cx="64" cy="120" r="52" stroke={colors.primary} strokeWidth="1.5" fill="none" opacity={0.12} />
            <Circle cx="64" cy="120" r="78" stroke={colors.primary} strokeWidth="1" fill="none" opacity={0.07} />
            <Circle cx="300" cy="520" r="90" stroke={colors.accent} strokeWidth="1.5" fill="none" opacity={0.1} />
            <Circle cx="300" cy="520" r="120" stroke={colors.accent} strokeWidth="1" fill="none" opacity={0.06} />
          </>
        ) : (
          <>
            <Path
              d="M72 40 L58 95 L78 95 L62 170 L110 88 L88 88 L108 40 Z"
              fill={colors.primary}
              opacity={opacity + 0.03}
            />
            <Path
              d="M310 120 L298 155 L312 155 L300 210 L340 148 L322 148 L338 120 Z"
              fill={colors.accent}
              opacity={opacity}
            />
            <Path
              d="M20 420 L8 470 L24 470 L10 540 L55 465 L36 465 L52 420 Z"
              fill={colors.primaryDark}
              opacity={opacity}
            />
          </>
        )}
      </Svg>

      {lottie ? (
        isIntro ? (
          <>
            <View style={[styles.lottieLayer, styles.introLottieA]} pointerEvents="none">
              <JumeloLottie name="spark" size={200} style={{ opacity: lottieOpacity }} />
            </View>
            <View style={[styles.lottieLayer, styles.introLottieB]} pointerEvents="none">
              <JumeloLottie name="confetti" size={140} style={{ opacity: lottieOpacity * 0.7 }} />
            </View>
          </>
        ) : (
          <>
            <View style={[styles.lottieLayer, styles.lottieBolt]} pointerEvents="none">
              <JumeloLottie name="bolt" size={240} style={{ opacity: lottieOpacity }} />
            </View>
            <View style={[styles.lottieLayer, styles.lottieSpark]} pointerEvents="none">
              <JumeloLottie name="spark" size={160} style={{ opacity: lottieOpacity * 0.85 }} />
            </View>
            <View style={[styles.lottieLayer, styles.lottieSparkB]} pointerEvents="none">
              <JumeloLottie name="spark" size={100} style={{ opacity: lottieOpacity * 0.6 }} />
            </View>
          </>
        )
      ) : null}

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobA: {
    width: 280,
    height: 280,
    top: -80,
    right: -60,
  },
  blobB: {
    width: 220,
    height: 220,
    top: 220,
    left: -90,
  },
  blobC: {
    width: 300,
    height: 300,
    bottom: -100,
    right: -80,
  },
  introBlobA: {
    width: 320,
    height: 320,
    top: -120,
    left: -100,
  },
  introBlobB: {
    width: 260,
    height: 260,
    top: '38%',
    right: -110,
  },
  introBlobC: {
    width: 280,
    height: 280,
    bottom: -90,
    left: '20%',
  },
  lottieLayer: {
    position: 'absolute',
    zIndex: 0,
  },
  lottieBolt: {
    top: -20,
    right: -50,
  },
  lottieSpark: {
    bottom: 120,
    left: -40,
  },
  lottieSparkB: {
    top: '42%',
    right: 12,
  },
  introLottieA: {
    top: 40,
    right: -60,
  },
  introLottieB: {
    bottom: 80,
    left: -50,
  },
});
