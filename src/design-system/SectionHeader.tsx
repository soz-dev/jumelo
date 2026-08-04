import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { fonts, spacing, typography } from './tokens';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: React.ReactNode;
};

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  right,
}: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.inkMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Alias HeaderRow historique */
export function HeaderRow({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return <SectionHeader title={title} subtitle={subtitle} right={right} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
  },
  sub: {
    ...typography.caption,
    marginTop: 4,
  },
});
