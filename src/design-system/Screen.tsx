import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Atmosphere } from '../components/Atmosphere';
import { useTheme } from '../context/ThemeContext';
import {
  themeAtmosphereColors,
  themeGradientAngles,
} from './themeGradients';

type ScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Fond Atmosphere texturé + Lottie */
  atmosphere?: boolean | 'soft' | 'bold';
  edges?: Edge[];
  /** Safe area (défaut true) */
  safe?: boolean;
};

export function Screen({
  children,
  style,
  atmosphere,
  edges = ['top'],
  safe = true,
}: ScreenProps) {
  const { colors } = useTheme();

  const body = safe ? (
    <SafeAreaView style={[styles.flex, style]} edges={edges}>
      {children}
    </SafeAreaView>
  ) : (
    <View style={[styles.flex, style]}>{children}</View>
  );

  if (atmosphere) {
    const variant = atmosphere === true ? 'soft' : atmosphere;
    return <Atmosphere variant={variant}>{body}</Atmosphere>;
  }

  const wash = themeAtmosphereColors(colors);
  const angle = themeGradientAngles.atmosphere;

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={[...wash]}
        start={angle.start}
        end={angle.end}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
