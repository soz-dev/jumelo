import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { MATCH_THRESHOLD } from '../lib/matching';
import { fonts, radii, spacing } from './tokens';

type BadgeProps = {
  label: string | number;
  tone?: 'primary' | 'accent' | 'muted' | 'success' | 'warning';
  style?: ViewStyle;
};

export function Badge({ label, tone = 'primary', style }: BadgeProps) {
  const { colors } = useTheme();
  const bg =
    tone === 'primary'
      ? colors.primary
      : tone === 'accent'
        ? colors.accent
        : tone === 'success'
          ? colors.success
          : tone === 'warning'
            ? colors.warning
            : colors.inkMuted;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: colors.white }]}>{label}</Text>
    </View>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const { colors } = useTheme();
  const bg =
    score >= MATCH_THRESHOLD ? colors.primary : score >= 60 ? colors.accent : colors.inkMuted;
  return (
    <View style={[styles.score, { backgroundColor: bg }]} accessibilityLabel={`Score ${score} pour cent`}>
      <Text style={[styles.scoreText, { color: colors.white }]}>{score}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  score: {
    minWidth: 48,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  scoreText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
});
