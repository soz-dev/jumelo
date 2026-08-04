import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Atmosphere } from '../components/Atmosphere';
import { useTheme } from '../context/ThemeContext';

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

  return (
    <View style={[styles.flex, { backgroundColor: colors.cream }]}>
      {safe ? (
        <SafeAreaView style={[styles.flex, style]} edges={edges}>
          {children}
        </SafeAreaView>
      ) : (
        <View style={[styles.flex, style]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
