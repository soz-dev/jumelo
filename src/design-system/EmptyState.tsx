import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { JumeloLottie } from '../components/JumeloLottie';
import { useTheme } from '../context/ThemeContext';
import { Button } from './Button';
import { iconSizes, spacing, typography } from './tokens';

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
    <View style={styles.wrap}>
      {lottie ? (
        <JumeloLottie name={lottie} size={88} />
      ) : (
        <View style={[styles.iconBubble, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={iconSizes.lg} color={colors.primary} />
        </View>
      )}
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: colors.inkMuted }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
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
