import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import { useTheme } from '../context/ThemeContext';
import { JumeloLottie } from './JumeloLottie';

type Props = {
  variant?: 'soft' | 'bold';
  /** Calques Lottie décoratifs (bolt / spark). Défaut : true. */
  lottie?: boolean;
  children?: React.ReactNode;
};

/**
 * Fond texturé : blobs colorés + griffures SVG + Lottie abstraites en filigrane.
 */
export function Atmosphere({ variant = 'soft', lottie = true, children }: Props) {
  const { colors } = useTheme();
  const opacity = variant === 'bold' ? 0.14 : 0.08;
  const patternId = useId().replace(/:/g, '');
  const lottieOpacity = variant === 'bold' ? 0.2 : 0.14;

  return (
    <View style={[styles.root, { backgroundColor: colors.cream }]}>
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobA,
          { backgroundColor: colors.primary, opacity: opacity + 0.04 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobB,
          { backgroundColor: colors.accent, opacity: opacity },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobC,
          { backgroundColor: colors.primaryDark, opacity: opacity * 0.7 },
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
            width="48"
            height="48"
          >
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
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#scratches-${patternId})`} />

        {/* Éclairs décoratifs */}
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
      </Svg>

      {lottie ? (
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
});
