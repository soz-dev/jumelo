import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icon';
import { fonts, spacing, typography } from './tokens';

/** First word dark blue, rest normal blue. Single word: split at midpoint. */
function splitTitleParts(title: string): [string, string] {
  const words = title.split(' ');
  if (words.length > 1) return [words[0], ' ' + words.slice(1).join(' ')];
  const mid = Math.ceil(title.length / 2);
  return [title.slice(0, mid), title.slice(mid)];
}

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
        <Text style={styles.title}>
          {(() => { const [f, r] = splitTitleParts(title); return (<><Text style={{ color: colors.primaryDark }}>{f}</Text>{r ? <Text style={{ color: colors.primary }}>{r}</Text> : null}</>); })()}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.inkMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Text style={[styles.actionLabel, { color: colors.primary }]}>{actionLabel}</Text>
          <Icon name="chevronRight" size={14} color={colors.primary} weight="bold" />
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
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingBottom: 2,
  },
  actionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
});
