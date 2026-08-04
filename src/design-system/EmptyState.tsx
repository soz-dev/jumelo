import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { JumeloLottie } from '../components/JumeloLottie';
import { useTheme } from '../context/ThemeContext';
import { withHexAlpha } from '../constants/theme';
import { Button } from './Button';
import { iconSizes, motion, radii, spacing, typography } from './tokens';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  lottie?: 'spark' | 'bolt';
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  icon = 'planet-outline',
  lottie,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(motion.slow)} style={styles.wrap}>
      {lottie ? (
        <JumeloLottie name={lottie} size={96} />
      ) : (
        <View
          style={[
            styles.iconBubble,
            {
              backgroundColor: withHexAlpha(colors.primary, 0.12),
              borderColor: withHexAlpha(colors.primary, 0.22),
            },
          ]}
        >
          <Ionicons name={icon} size={iconSizes.lg} color={colors.primary} />
        </View>
      )}
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: colors.inkMuted }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          style={{ marginTop: spacing.md, minWidth: 200 }}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconBubble: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  title: {
    ...typography.titleSm,
    textAlign: 'center',
  },
  desc: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: 300,
  },
});
