import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { elevation, fonts, iconSizes, motion, radii, spacing } from './tokens';
import {
  mixHex,
  themeBrandColors,
  themeGradientAngles,
} from './themeGradients';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
}: ButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;
  const brand = themeBrandColors(colors);
  const brandAngle = themeGradientAngles.brand;

  const isGradient = variant === 'primary' || variant === 'accent';
  const textColor =
    variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.white;
  const glowColor = variant === 'accent' ? colors.accent : colors.primary;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => {
        if (!isDisabled) scale.value = withSpring(0.97, motion.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
      style={[
        styles.btn,
        {
          backgroundColor: isGradient
            ? 'transparent'
            : variant === 'secondary'
              ? colors.white
              : 'transparent',
          borderColor: variant === 'secondary' ? colors.primary : 'transparent',
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          overflow: 'hidden',
          ...(isGradient ? elevation.glow(glowColor) : {}),
        },
        isDisabled && { opacity: 0.5 },
        animStyle,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[...brand]}
          start={brandAngle.start}
          end={brandAngle.end}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {variant === 'accent' ? (
        <LinearGradient
          colors={[colors.accent, mixHex(colors.accent, colors.primaryDark, 0.45)]}
          start={brandAngle.start}
          end={brandAngle.end}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Ionicons name={icon} size={iconSizes.sm} color={textColor} /> : null}
          <Text style={[styles.btnLabel, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    letterSpacing: 0.15,
  },
});
