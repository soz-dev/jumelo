import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { fonts, radii, spacing, withHexAlpha } from '../design-system';
import { getProfileStats, type ProfileStats } from '../lib/profileStats';

type Props = {
  userId: string;
};

function StatCell({
  value,
  label,
  color,
  muted,
}: {
  value: number;
  label: string;
  color: string;
  muted: string;
}) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={[styles.label, { color: muted }]}>{label}</Text>
    </View>
  );
}

export function ProfileStatsCard({ userId }: Props) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getProfileStats(userId).then((s) => {
        if (active) setStats(s);
      });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  if (!stats) return null;

  return (
    <View
      style={[
        styles.strip,
        {
          backgroundColor: withHexAlpha(colors.primarySoft, 0.88),
          borderColor: withHexAlpha(colors.primary, 0.12),
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${stats.jumelosCount} jumelos, ${stats.sessionsCompleted} sessions terminées, ${stats.sessionsCreated} sessions créées`}
    >
      <StatCell
        value={stats.jumelosCount}
        label="Jumelos"
        color={colors.primary}
        muted={colors.inkMuted}
      />
      <View style={[styles.divider, { backgroundColor: withHexAlpha(colors.primary, 0.18) }]} />
      <StatCell
        value={stats.sessionsCompleted}
        label="Sessions finies"
        color={colors.ink}
        muted={colors.inkMuted}
      />
      <View style={[styles.divider, { backgroundColor: withHexAlpha(colors.primary, 0.18) }]} />
      <StatCell
        value={stats.sessionsCreated}
        label="Sessions créées"
        color={colors.ink}
        muted={colors.inkMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontFamily: fonts.displaySemi,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textAlign: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
});
